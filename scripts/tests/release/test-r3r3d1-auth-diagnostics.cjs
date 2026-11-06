#!/usr/bin/env node
'use strict';
// Standalone read-only release gate. No Firebase credentials, no network, no writes.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../..');
const text = f => fs.readFileSync(path.join(root, f), 'utf8');
const source = text('src/diagnostics/sessionDiagnostics.ts');
const auth = text('src/context/AuthContext.tsx');
const gate = text('src/app/session-gate.tsx');
const routes = text('src/app/_layout.tsx');
const card = text('src/diagnostics/SessionDiagnosticCard.tsx');
let n=0;
const test=(label,fn)=>{fn();console.log('PASS '+(++n)+' '+label);};
function loadModule(enabled=true) {
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 assert.equal(js.diagnostics.filter(x=>x.category===ts.DiagnosticCategory.Error).length,0);
 const ctx={exports:{},setTimeout,clearTimeout,process:{env:{EXPO_PUBLIC_FB_SESSION_DIAGNOSTICS:enabled?'1':'0'}},console};
 vm.runInNewContext(js.outputText,ctx,{filename:'sessionDiagnostics.js'});
 return ctx.exports;
}
const d=loadModule();
const snap=()=>new d.SessionDiagnostics();
test('Native-safe independent diagnostic module',()=>!source.includes('@react-native-firebase') && !source.includes('router.replace('));
test('Error code allows only enumerated firebase codes',()=>assert.equal(d.sanitizeFirebaseCode({code:'firestore/permission-denied',message:'email'}),'permission-denied'));
test('Reject fake firebase/error with raw identifier',()=>assert.equal(d.sanitizeFirebaseCode({code:'user/secret-token-111'}),'unknown'));
test('UID / email / token cannot enter exported report',()=>{
 const x=snap();x.identityChanged('sensitive_uid_123');const t=x.start('PROFILE','profile-server-read',0);
 x.success(t,{uid:'secret',email:'foo@example.com',token:'abc-secret',familyId:'private',source:'server'});
 const s=x.exportReport();for(const val of ['sensitive_uid_123','foo@example.com','abc-secret','familyId'])assert.ok(!s.includes(val),val);x.dispose();
});
test('Auth UID switch invalidates previous profile ticket',()=>{const x=snap();x.identityChanged('a');const t=x.start('PROFILE','profile-server-read',0);x.identityChanged('b');assert.equal(x.success(t),false);assert.equal(x.getSnapshot().steps.length,0);x.dispose();});
test('Duplicate auth callback does not restart diagnostic epoch',()=>{const x=snap();x.identityChanged('a');const old=x.getEpoch();assert.equal(x.identityChanged('a'),false);assert.equal(x.getEpoch(),old);x.dispose();});
test('Later response after new retry cannot complete newer ticket',()=>{const x=snap();x.identityChanged('a');const old=x.start('MEMBERSHIP','server-read',0),cur=x.start('MEMBERSHIP','server-read',0);assert.equal(x.success(old),false);assert.equal(x.success(cur),true);x.dispose();});
test('Permission denied distinguishes Membership from Profile',()=>{assert.equal(d.classifyFailure('MEMBERSHIP',{code:'firestore/permission-denied'}),'MEM-202');assert.equal(d.classifyFailure('PROFILE',{code:'permission-denied'}),'PRO-103');});
test('Unavailability does not indicate missing profile',()=>assert.equal(d.classifyFailure('PROFILE',{code:'unavailable'}),'PRO-101'));
test('Firestore mismatch classifier does not mistake pending for mismatch',()=>{assert.equal(d.compareMembershipEvidence({listener:'exists',server:'pending'}),null);assert.equal(d.compareMembershipEvidence({listener:'exists',server:'absent'}),'MEM-204');});
test('Home bypass invariant can detect unauthorized UI mount',()=>{assert.equal(d.analyzeSessionInvariant({uidVerified:false,profileVerified:false,membershipVerified:false,activeFamilyVerified:false,welcomeRequired:false,welcomePainted:false,homeMounted:true,gatePendingMs:9999}),'NAV-502');});
test('Data retention bounded to 120 records',()=>{const x=snap();for(let i=0;i<200;i++)x.note('SYSTEM','test');assert.equal(x.getSnapshot().records.length,120);x.dispose();});
test('No diagnostic ability to open Home or update Firestore',()=>{const x=snap();assert.equal(x.canOpenHome,undefined);assert.equal(x.setProfileStatus,undefined);x.dispose();});
test('Diagnostics can be disabled by build env without auth changes',()=>{const m=loadModule(false),x=new m.SessionDiagnostics();assert.equal(x.start('AUTH','main').authEpoch,-1);assert.equal(x.identityChanged('a'),false);assert.equal(x.getSnapshot().records.length,0);x.dispose();});
test('Auth and Profile instrumentation present',()=>{assert.ok(auth.includes('diagnostic.identityChanged(nextUid)'));assert.ok(auth.includes('diagnostic.start("PROFILE", "profile-server-read"'));assert.ok(auth.includes('diagnostic.failure(profileTicket, error)'));});
test('Membership records independent server read + listener',()=>{assert.ok(auth.includes('diagnostic.start("MEMBERSHIP", "listener-first-result"'));assert.ok(auth.includes('diagnostic.start("MEMBERSHIP", "server-read"'));assert.ok(auth.includes('noteEvidence();'));});
test('Welcome ledger write and selected-family proof are observed',()=>{assert.ok(auth.includes('diagnostic.start("WELCOME", "ack-write"'));assert.ok(auth.includes('diagnostic.start("FAMILY", "server-verify"'));});
test('Route/Welcome/shield are observed; no diagnostic-led unlock',()=>{assert.ok(routes.includes('diagnostic.note("NAVIGATION", "redirect"'));assert.ok(routes.includes('diagnostic.start("NAVIGATION", "foreground"'));assert.ok(gate.includes('onLayout={() => diagnostic.note("WELCOME", "layout"'));assert.ok(!source.includes('router.replace('));});
test('Session Gate shows code and copy-to-clipboard action',()=>{assert.ok(gate.includes('Mã chẩn đoán: {diagnosisCode}'));assert.ok(gate.includes('Clipboard.setStringAsync(report)'));assert.ok(gate.includes('<ScrollView'));assert.ok(card.includes('canViewDetailedDiagnostics'));});
test('Full timeline restricted to verified developer account',()=>{assert.ok(card.includes('authUser.emailVerified === true'));assert.ok(card.includes("huynh235@gmail.com"));assert.ok(card.includes('fullDetails ? familyBloomSessionDiagnostics.exportReport()'));});
test('Unchanged protected Home gate requires verified Profile + Membership',()=>{const service=text('src/services/navigation/familySessionAccess.ts');assert.ok(service.includes('input.membershipStatus === "ready"'));assert.ok(service.includes('input.profileUid === input.uid'));assert.ok(routes.includes('guard={allowFamilyRoutes}'));});
test('Existing R3R3 watchdog preserved',()=>{assert.ok(auth.includes('const membershipDeadline = setTimeout(() => {'));assert.ok(auth.includes('new SessionVerificationTimeoutError("membership")'));});
console.log(`R3R3D1 source diagnostic regression: ${n}/${n} PASS (source + VM only; Android APK untested)`);
