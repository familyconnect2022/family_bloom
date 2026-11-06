#!/usr/bin/env node
// Split A1: historical integration gate, not Android-only.
if (!require('node:fs').existsSync(require('node:path').join(__dirname, '../../../vercel-media/package.json'))) { console.log('[SKIP-CROSS-REPO] Vercel API tests run only in a combined integration workspace; Media is now a separate repository.'); process.exit(0); }
'use strict';
// Contract gate, intentionally no network and no Firebase credentials.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const endpoint = read('vercel-media/api/dev/data-fault.js');
const screen = read('src/app/(internal)/firestore-data-fault-test.tsx');
const tools = read('src/app/(internal)/developer-tools.tsx');
const layout = read('src/app/_layout.tsx');
const planner = read('src/app/(tabs)/planner.tsx');
const tests = [
  ['API off by default', () => assert(endpoint.includes("process.env.FAMILY_BLOOM_DEV_DATA_TEST_ENABLED !== 'true'"))],
  ['API verifies Firebase UID allowlist', () => assert(endpoint.includes("uid !== allowedUid"))],
  ['API verifies verified account email', () => { assert(endpoint.includes('account.emailVerified')); assert(endpoint.includes('DEV_EMAIL')); }],
  ['API fixed sandbox family restriction', () => { assert(endpoint.includes('FAMILY_BLOOM_DEV_TEST_FAMILY_ID')); assert(endpoint.includes('req.body.familyId !== sandboxFamilyId')); }],
  ['API requires sandbox membership', () => assert(endpoint.includes("['owner','admin'].includes"))],
  ['API rejects family containing other members', () => { assert(endpoint.includes('members.docs.some((item) => item.id !== uid)')); assert(endpoint.includes('Use a dedicated one-person test family only')); }],
  ['No arbitrary caller path or payload', () => { assert(endpoint.includes('createFixture(req.body.caseId, uid, sandboxFamilyId)')); assert(!endpoint.includes('req.body.document')); assert(!endpoint.includes('req.body.path')); }],
  ['Writes new unique diagnostic record only', () => { assert(endpoint.includes('tx.create(recordRef, fixture.document)')); assert(endpoint.includes('tx.set(lockRef,')); assert(!endpoint.includes('tx.update(recordRef,')); }],
  ['Writes marked diagnostic fixtures to actual family collections', () => { for(const name of ['members/', 'joinRequests/', 'events/', 'moments/']) assert(endpoint.includes(name)); assert(endpoint.includes('FB_DIAG_')); assert(endpoint.includes('FB_DIAG_DELETE_MANUALLY')); }],
  ['One active record enforced across requests', () => { assert(endpoint.includes('Delete active diagnostic')); assert(endpoint.includes('oldDoc.exists')); }],
  ['Only allowlisted paths may be tracked', () => { assert(endpoint.includes('isTestPath(oldPath)')); assert(endpoint.includes('Diagnostic lock contains unexpected path')); }],
  ['Developer screen uses verified Firebase identity', () => { assert(screen.includes('isVerifiedDeveloperAccount(user)')); assert(screen.includes('getIdToken()')); }],
  ['Copy cleanup path before write request', () => { assert(screen.includes('Clipboard.setStringAsync(predicted)')); assert(screen.includes('const confirmCreate')); assert(screen.includes('FB_DIAG_')); }],
  ['Tool entry visible only in existing developer tools', () => { assert(tools.includes('/firestore-data-fault-test')); assert(layout.includes('(internal)/firestore-data-fault-test')); }],
  ['11 distinct cases exposed', () => { assert.equal((screen.match(/\{ id: '(MEMBERSHIP|MEMBER|JOIN|EVENT|MOMENT)_[A-Z_]+', label:/g) || []).length, 11); }],
  ['Planner hero now scrolls inside both virtualized lists', () => {
    assert.equal(planner.split('<PlannerShell {...shellProps} />').length - 1, 2);
    const rootPart = planner.split('return (\n    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>')[1];
    assert(rootPart && !rootPart.split('<View\n          style={styles.panelViewport}')[0].includes('<PlannerShell'));
    assert(planner.includes('ListHeaderComponent={header}'));
    assert(planner.includes('stickySectionHeadersEnabled={false}'));
  }],
];
// Exercise the actual fixture factory without firebase-admin, credentials or network.
const fixtureCode = endpoint.slice(endpoint.indexOf('const DEV_EMAIL'), endpoint.indexOf('export default async function handler'));
const makeFixture = vm.runInNewContext(`${fixtureCode}\ncreateFixture`, { Date, Error, Object, Number });
const cases = ['MEMBERSHIP_BAD_DATE','MEMBERSHIP_BAD_ROLE','MEMBER_BAD_DATE',
  'JOIN_BAD_APPLICANT','JOIN_BAD_INTERESTS','EVENT_BAD_DATE','EVENT_BAD_TITLE',
  'EVENT_BAD_PARTICIPANTS','MOMENT_BAD_DATE','MOMENT_BAD_MEDIA','MOMENT_BAD_COUNTS'];
for (const caseId of cases) {
  const {path: dbPath, document} = makeFixture(caseId, 'devUid123456789', 'test-family');
  assert(dbPath.includes(`FB_DIAG_${caseId}_`));
  assert(!dbPath.includes('..') && !dbPath.includes('//'));
  assert.equal(document.fbDiagnostic.caseId,caseId);
  assert.equal(document.fbDiagnostic.tag,'FB_DIAG_DELETE_MANUALLY');
  assert(dbPath.startsWith('users/devUid123456789/memberships/') || dbPath.startsWith('families/test-family/'));
}
assert.equal(typeof makeFixture('EVENT_BAD_DATE','devUid123456789','test-family').document.dateISO,'object');
assert(Array.isArray(makeFixture('EVENT_BAD_TITLE','devUid123456789','test-family').document.title));
assert.equal(makeFixture('JOIN_BAD_APPLICANT','devUid123456789','test-family').document.applicant,null);
assert(!Array.isArray(makeFixture('EVENT_BAD_PARTICIPANTS','devUid123456789','test-family').document.participantIds));
console.log(`PASS ${cases.length} actual malformed fixture factories (offline)`);
for(const [name, fn] of tests) { fn(); console.log('PASS',name); }
console.log(`R3R14R3R6 dev fault + planner gates: ${tests.length}/${tests.length} PASS`);
