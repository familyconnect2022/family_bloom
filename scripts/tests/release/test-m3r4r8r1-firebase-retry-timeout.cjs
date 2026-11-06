#!/usr/bin/env node
'use strict';
// Executable P0 regression, source-only: runs before npm install on Node 22+.
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
const root=path.resolve(__dirname,'../../..');
const src=(name)=>fs.readFileSync(path.join(root,name),'utf8');
let n=0;
const pass=(name)=>{n++;console.log('PASS '+name)};
const helper=src('src/services/navigation/sessionVerificationTimeout.ts');
const js=stripTypeScriptTypes(helper,{mode:'strip'}).replace(/\bexport\s+(?=(?:const|function|class)\b)/g,'');
const timeout=new Function(js+';return {withSessionVerificationTimeout,SessionVerificationTimeoutError,SESSION_AUTH_TIMEOUT_MS,SESSION_PROFILE_TIMEOUT_MS,SESSION_MEMBERSHIP_TIMEOUT_MS};')();
const run=async()=>{
  assert(timeout.SESSION_AUTH_TIMEOUT_MS>=8000 && timeout.SESSION_AUTH_TIMEOUT_MS<=30000);pass('Auth bootstrap deadline bounded');
  assert(timeout.SESSION_PROFILE_TIMEOUT_MS>=8000 && timeout.SESSION_PROFILE_TIMEOUT_MS<=30000);pass('Profile deadline bounded');
  assert(timeout.SESSION_MEMBERSHIP_TIMEOUT_MS>=8000 && timeout.SESSION_MEMBERSHIP_TIMEOUT_MS<=30000);pass('Membership deadline bounded');
  assert.equal(await timeout.withSessionVerificationTimeout(Promise.resolve('verified'),40,'profile'),'verified');pass('Fast verification resolves');
  await assert.rejects(timeout.withSessionVerificationTimeout(new Promise(()=>{}),20,'profile'),e=>e.name==='SessionVerificationTimeoutError' && e.stage==='profile');pass('Hung profile request times out');
  await assert.rejects(timeout.withSessionVerificationTimeout(new Promise(()=>{}),20,'membership'),e=>e.name==='SessionVerificationTimeoutError' && e.stage==='membership');pass('Hung membership request times out');
  await assert.rejects(timeout.withSessionVerificationTimeout(Promise.reject(Error('permission-denied')),40,'membership'),/permission-denied/);pass('Permissions errors remain failures');
  let lateResolve;const late=new Promise(resolve=>{lateResolve=resolve});let state='loading';let token=1;
  void timeout.withSessionVerificationTimeout(late,12,'profile').then(()=>{if(token===1)state='ready'},()=>{if(token===1)state='error'});
  await new Promise(resolve=>setTimeout(resolve,25));assert.equal(state,'error');token=2;state='loading';lateResolve('outdated');
  await new Promise(resolve=>setTimeout(resolve,5));assert.equal(state,'loading');pass('Late timed-out response cannot change newer attempt');
  const auth=src('src/context/AuthContext.tsx'),family=src('src/services/family/familyService.ts'),layout=src('src/app/_layout.tsx'),gate=src('src/app/session-gate.tsx');
  assert(family.includes('getDocsFromServer(') && family.includes('listForUserAuthoritative') && family.includes('snap.metadata.fromCache'));pass('Membership bootstrap and stream never trust cache');
  assert(auth.includes('familyService.listForUserAuthoritative(currentUid)') && auth.includes('withSessionVerificationTimeout('));pass('Both Firebase verification stages have bounded server reads');
  assert(auth.includes('setMembershipStatus("error")') && !auth.includes('current === "ready" ? current : "ready"'));pass('Membership failure cannot be promoted to ready');
  assert(auth.includes('profileRequestRef.current') && auth.includes('request !== profileRequestRef.current') && auth.includes('epoch !== authEpochRef.current'));pass('Old Profile requests invalidated after retry/UID change');
  assert(auth.includes('if (!isCurrent()) return;') && auth.includes('acceptMembershipServerProof(serverProof, "read", true)') && auth.includes('applyVerified(memberships, "read")') && auth.includes('verifiedMembershipUidRef.current = currentUid'));pass('Server-authoritative membership read can recover listener failures; stale UID/epoch blocked');
  assert(auth.includes('retryFirebaseVerification') && auth.includes('setAuthSubscriptionAttempt((current) => current + 1)') && auth.includes('setMembershipAttempt((current) => current + 1)'));pass('Retry resubscribes without logout');
  assert(gate.includes('onPress={retryNow}') && gate.includes('retryFirebaseVerification();') && gate.includes('profileStatus === "error"') && gate.includes('membershipStatus === "error"') && gate.includes('authStatus === "error"'));pass('UI exposes retry for Auth/Profile/Membership failures');
  assert(layout.includes('<Stack.Screen name="session-gate"') && layout.includes('<Stack.Protected guard={allowFamilyRoutes}>') && layout.includes('membershipStatus === "error"'));pass('Home protected and anchor available on verification errors');
  const access=src('src/services/navigation/familySessionAccess.ts');
  assert(access.includes('input.membershipStatus === "ready"') && access.includes('input.profileStatus === "ready"') && access.includes('input.profileUid === input.uid'));pass('Home requires exact UID and both verified server stages');
  console.log(`Firebase Session Retry / Timeout P0: ${n}/${n} PASS`);
};run().catch(e=>{console.error(e);process.exitCode=1});
