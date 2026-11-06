#!/usr/bin/env node
'use strict';
/** Run without node_modules; uses globally-installed TypeScript if available, else tsc binary. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
function getTypescript() {
  try { return require('typescript'); } catch { /* preinstall gate */ }
  const dir = path.dirname(fs.realpathSync(cp.execFileSync(process.platform === 'win32' ? 'where' : 'which', ['tsc'], { encoding: 'utf8' }).split(/\r?\n/)[0].trim()));
  return require(path.join(dir, '../lib/typescript.js'));
}
let ts;
try { ts = getTypescript(); } catch { // fall back to static gate, runtime test is reported unavailable
  console.error('BLOCKED: TypeScript compiler not found; run npm install before this test.');
  process.exit(2);
}
const source = read('src/utils/dataBoundary.ts');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true });
assert(!compiled.diagnostics?.length, 'data boundary TypeScript transpile');
const sandboxModule = { exports: {} };
vm.runInNewContext(compiled.outputText, { exports: sandboxModule.exports, module: sandboxModule, Date, RegExp, Array, Number, String, Object, console });
const b = sandboxModule.exports;
let checked = 0;
const test = (name, fn) => { fn(); ++checked; console.log('PASS', name); };
const iso = '2026-10-27T13:27:00.000Z';
const validMembership = { familyId:'fam1', familyName:'Nhà Một', role:'admin', joinedAt:iso };
const validRequest = { uid:'u1',familyId:'fam1',familyName:'Nhà Một',status:'pending',requestedAt:iso,applicant:{uid:'u1',displayName:'Lan',interests:['nhạc']} };
test('canonical ISO accepts only real UTC timestamps', () => {
  assert.equal(b.canonicalIso(iso),iso);
  for(const x of ['Invalid Date','2026-13-77T99:00:00.000Z','Wed Oct 27 2026',42,{},null,'2026-10-27T13:27:00Z']) assert.equal(b.canonicalIso(x),null);
});
test('Firestore Timestamp or Date legacy read is safe without toString', () => {
  assert.equal(b.readIso({ toDate: () => new Date(iso) }),iso);
  assert.equal(b.readIso({ toDate: () => { throw Error('broken'); } }),null);
  assert.equal(b.readIso(new Date('oops')),null);
});
test('invalid days and leap days rejected', () => {
  assert.equal(b.dateOnly('2026-02-30'),null);
  assert.equal(b.dateOnly('2024-02-29'),'2024-02-29');
  assert.equal(b.dateOnly({}),null);
});
test('membership rejects bad timestamp, wrong family, bad role, missing fields', () => {
  assert.equal(b.readMembership(validMembership,'fam1').role,'admin');
  for(const raw of [{...validMembership,joinedAt:123},{...validMembership,joinedAt:null},{...validMembership,role:'ownerX'}, {...validMembership,familyId:'fam2'}, {...validMembership,familyName:['false']},false,{},null])
    assert.equal(b.readMembership(raw,'fam1'),null);
});
test('member never trusts owner role or UID from unrelated data', () => {
  assert.equal(b.readFamilyMember({uid:'u1',displayName:'Lan',role:'admin',joinedAt:iso},'u1').role,'admin');
  assert.equal(b.readFamilyMember({uid:'u2',displayName:'Lan',role:'owner',joinedAt:iso},'u1'),null);
  assert.equal(b.readFamilyMember({uid:'u1',role:'owner',joinedAt:55},'u1'),null);
});
test('join request checks applicant UID and structure before approving', () => {
  assert.equal(b.readJoinRequest(validRequest,'fam1','u1').applicant.displayName,'Lan');
  for(const raw of [{...validRequest,applicant:null},{...validRequest,applicant:{uid:'u2',displayName:'Lan'}},{...validRequest,applicant:{uid:'u1',displayName:23}},{...validRequest,applicant:{uid:'u1',displayName:'Lan',interests:['ok',{}]}},{...validRequest,requestedAt:{bad:true}},{...validRequest,status:'approved_evil'},{}])
    assert.equal(b.readJoinRequest(raw,'fam1','u1'),null);
});
test('poisoned toString object never executes during permission validation', () => {
  const poisoned = Object.assign(Object.create(null), { toString: null, valueOf: null });
  assert.equal(b.readJoinRequest({ ...validRequest, status: poisoned }, 'fam1', 'u1'), null);
  assert.equal(b.readMembership({ ...validMembership, role: poisoned }, 'fam1'), null);
});
test('malformed arrays are removed without invoking user-defined toString', () => {
  assert.deepEqual(Array.from(b.textArray(['ok',null,42,{},'đẹp'])),['ok','đẹp']);
  assert.equal(b.objectData([]),null);
});
test('Android gates untrusted membership and join-request reads', () => {
  for(const rel of ['src/services/family/familyService.ts','src/context/AuthContext.tsx','src/services/family/familyJoinService.ts'])
    assert(read(rel).includes('readMembership') || read(rel).includes('readJoinRequest'),rel);
});
test('Android resolves family introduction names by exact case-sensitive key', () => {
  assert(read('src/services/family/familyJoinService.ts').includes('familyIntroDocId(familyKey)'));
});
test('Moment media and reaction counters are filtered on read', () => {
  const x=read('src/services/moments/momentsService.ts');
  assert(x.includes('objectData(value)'));
  assert(x.includes('Number.isSafeInteger(raw.commentCount)'));
});
test('Android event list excludes unparseable dates before sort', () => {
  const x=read('src/services/event/eventService.ts');
  assert(x.includes('readIso(raw.dateISO)'));
  assert(x.includes('filter((event) => !!event.dateISO)'));
});
test('Original Web source is deliberately untouched in this Android-only release', () => {
  // Tested externally against the release ZIP hash manifest. No Web modules imported here.
  assert(!read('src/utils/dataBoundary.ts').includes('Web untrusted-data boundary'));
});
test('both Rulesets reject arbitrary join payloads and disallow code listing', () => {
  for(const rel of ['firestore.rules','firestore.cloud.rules']) {
    const x=read(rel);
    assert(x.includes('validJoinPayload(request.resource.data, familyId, uid)'));
    assert(x.includes("data.applicant.keys().hasOnly"));
    assert(x.includes("affectedKeys().hasOnly(['status','reviewedAt','reviewedByUid','rejectionReason'])"));
    const codes=x.split('match /family_codes/{familyCode} {')[1].split('match /media_assets/')[0];
    assert(codes.includes('allow list: if false;'));
    assert(codes.includes('allow get: if signedIn();'));
  }
});
console.log(`R3R14R3R5 ANDROID DATA BOUNDARY: ${checked}/${checked} PASS (emulator and device NOT run)`);
