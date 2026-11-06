#!/usr/bin/env node
// Split A1: historical integration gate, not Android-only.
if (!require('node:fs').existsSync(require('node:path').join(__dirname, '../../../vercel-media/package.json'))) { console.log('[SKIP-CROSS-REPO] Vercel API tests run only in a combined integration workspace; Media is now a separate repository.'); process.exit(0); }
'use strict';
// No credentials, network calls or real writes: execute the real Vercel handler
// inside a VM with an in-memory fake Firestore/verified Auth service.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const endpoint = fs.readFileSync(path.join(root, 'vercel-media/api/dev/data-fault.js'), 'utf8');
const source = endpoint.slice(endpoint.indexOf('const DEV_EMAIL'))
  .replace('export default async function handler(req, res)', 'async function handler(req, res)');

const uid = 'devUid1234567', familyId = 'testFamily1';
function setup(config = {}) {
  const storeDocs = new Map();
  const pathFor = `users/${uid}/memberships/${familyId}`;
  storeDocs.set(pathFor, { familyId, role: 'owner' });
  storeDocs.set(`families/${familyId}`, { name: 'One-person family' });
  storeDocs.set(`families/${familyId}/members/${uid}`, { uid, role: 'owner' });
  if (config.extraMember) storeDocs.set(`families/${familyId}/members/other`, { uid: 'other' });
  const writes = [];
  const snap = (key) => ({ exists: storeDocs.has(key), data: () => storeDocs.get(key), id: key.split('/').at(-1) });
  const db = {
    doc(key) { return { key, get: async () => snap(key) }; },
    collection(key) {
      return { limit() { return { get: async () => {
        const keys = [...storeDocs.keys()].filter(s => s.startsWith(key+'/') && s.split('/').length===key.split('/').length+1).slice(0,3);
        return { empty: !keys.length, docs: keys.map(s => ({id:s.split('/').at(-1)})) };
      } }; } };
    },
    async runTransaction(callback) {
      const operations = [];
      await callback({ get: async (ref) => snap(ref.key),
        create: (ref, doc) => { if(storeDocs.has(ref.key)) throw new Error('Already exists'); operations.push(['create',ref.key,doc]); },
        set: (ref, doc) => operations.push(['set',ref.key,doc]) });
      for(const [method, key, doc] of operations){storeDocs.set(key, doc);writes.push({method,key,doc});}
    },
  };
  const env = {
    FAMILY_BLOOM_DEV_DATA_TEST_ENABLED: config.enabled === false ? 'false' : 'true',
    FAMILY_BLOOM_DEV_TEST_UID: config.uid || uid,
    FAMILY_BLOOM_DEV_TEST_FAMILY_ID: familyId,
    FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({ project_id: 'fb-test-project' }),
  };
  const context = {
    process: { env }, Date, Object, Error, Number, JSON, console,
    getAuth: () => ({ getUser: async () => ({
      disabled: false, emailVerified: config.verified !== false,
      email: config.email || 'huynh235@gmail.com',
    }) }),
    authorizedUser: async () => uid,
    store: () => db,
    method: (req, v) => { if(req.method!==v) throw Object.assign(new Error('Method not allowed'), { status:405 }); },
    response: (_res, status, data) => ({ status, data }),
    safeError: (_res, err) => ({ status:err.status || 500, data: {ok:false,error:err.status ? err.message : 'SERVER_FAILED' } }),
  };
  const handler = vm.runInNewContext(`${source}\nhandler`, context);
  return { db, storeDocs, writes, handler,
    call: (action, caseId='EVENT_BAD_TITLE', family=familyId) => handler({method:'POST',body:{action,caseId,familyId:family}}, {}) };
}
(async () => {
  const off = setup({enabled:false});
  assert.equal((await off.call('create')).status,403);
  assert.equal(off.writes.length,0);
  console.log('PASS: API disabled => no write');
  const unauthorized = setup({uid:'other'});
  assert.equal((await unauthorized.call('create')).status,403);
  assert.equal(unauthorized.writes.length,0);
  console.log('PASS: wrong UID => no write');
  const other = setup({extraMember:true});
  assert.equal((await other.call('status')).status,403);
  assert.equal((await other.call('create')).status,403);
  assert.equal(other.writes.length,0);
  console.log('PASS: multi-member family rejected in BOTH status and create');
  const test = setup();
  assert.equal((await test.call('create','EVENT_BAD_TITLE','wrong-family')).status,403);
  assert.equal(test.writes.length,0);
  const ready = await test.call('status');
  assert.equal(ready.status,200);
  assert.equal(ready.data.ready,true);
  assert.equal(ready.data.firebaseProjectId,'fb-test-project');
  assert.equal(ready.data.testFamilyId,familyId);
  assert.equal(ready.data.active,null);
  console.log('PASS: preflight is verified and points to correct Firebase project');
  const created = await test.call('create');
  assert.equal(created.status,201);
  assert.equal(created.data.verified,true);
  const fullPath = created.data.active.path;
  assert.ok(fullPath.startsWith(`families/${familyId}/events/FB_DIAG_EVENT_BAD_TITLE_`));
  assert.equal(test.storeDocs.get(fullPath).fbDiagnostic.tag,'FB_DIAG_DELETE_MANUALLY');
  assert.ok(Array.isArray(test.storeDocs.get(fullPath).title));
  assert.equal(test.writes.length,2);
  assert.equal((await test.call('status')).data.active.path,fullPath);
  assert.equal((await test.call('create','MOMENT_BAD_MEDIA')).status,409);
  assert.equal(test.writes.length,2);
  console.log('PASS: create -> transaction/verification readback -> one active lock');
  test.storeDocs.delete(fullPath); // user manually removed document in Firebase console
  const next = await test.call('create','MOMENT_BAD_MEDIA');
  assert.equal(next.status,201);
  assert.ok(next.data.active.path.includes('/moments/FB_DIAG_'));
  console.log('PASS: manually removing document allows the next test');
  const tscode = fs.readFileSync(path.join(root,'src/app/(internal)/firestore-data-fault-test.tsx'),'utf8');
  assert(tscode.includes('friendlyApiError'));
  assert(tscode.includes('firebaseProjectId'));
  assert(tscode.includes('Kiểm tra Vercel + quyền ghi Firebase'));
  assert(tscode.includes('result.verified'));
  console.log('PASS: Android displays detailed HTTP errors and requires verified write');
})().catch(e=>{console.error(e);process.exitCode=1});
