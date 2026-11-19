'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {createNativeLeaseManager,NativeSessionGateError}=require('../../../src/services/auth/nativeSingleSessionCore.cjs');
const {claim,check,release}=require(path.resolve(__dirname,'../../../../../03_SERVERS/family_bloom_session_gateway-preview-r16r3/lib/session-core.cjs'));
const fs=require('node:fs');

function harness(){
  const docs=new Map(),storageData=new Map();
  const store={
    async read(uid){return docs.get(uid)||null;},
    async replace(uid,data){docs.set(uid,data);},
    async removeIfCurrent(uid,hash){if(docs.get(uid)?.tokenHash!==hash)return false;docs.delete(uid);return true;},
  };
  let unavailable=false;
  const transport=(user,action,token)=>{
    if(unavailable)throw new NativeSessionGateError('unreachable','Offline');
    if(action==='claim')return claim(store,user.uid,Date.now());
    if(action==='check')return check(store,user.uid,token);
    return release(store,user.uid,token);
  };
  const storage={
    getItem:async key=>storageData.get(key)||null,
    setItem:async(key,value)=>{storageData.set(key,value);},
    removeItem:async key=>{storageData.delete(key);},
  };
  const newManager=()=>createNativeLeaseManager({selected:uid=>uid==='tester',storage,transport});
  const user={uid:'tester',getIdToken:async()=> 'firebase-id-token'};
  return {newManager,user,transport,storageData,docs,setOffline:value=>{unavailable=value;}};
}

test('Android sign-in claims, cold restart checks, Web takes over, old device cannot release B',async()=>{
  const h=harness();
  const a=h.newManager();a.markExplicitLogin();
  const first=await a.activate(h.user);
  assert.match(first.token,/^[A-Za-z0-9_-]{43}$/);
  const coldStart=h.newManager();
  assert.deepEqual(await coldStart.activate(h.user),first,'Cold start must verify saved server lease');
  const web=await h.transport(h.user,'claim');
  assert.notEqual(web.token,first.token);
  assert.equal(await a.check(h.user,first),'replaced');
  await assert.rejects(()=>coldStart.activate(h.user),error=>error.reason==='replaced');
  await a.release(h.user,first);
  assert.equal((await h.transport(h.user,'check',web.token)).state,'active');
  assert.equal(h.storageData.size,0);
});

test('Web first then explicit Android login evicts Web and logout releases exactly Android',async()=>{
  const h=harness();
  const web=await h.transport(h.user,'claim');
  const device=h.newManager();device.markExplicitLogin();
  const mobile=await device.activate(h.user);
  assert.equal((await h.transport(h.user,'check',web.token)).state,'replaced');
  assert.equal(await device.check(h.user,mobile),'active');
  await device.release(h.user,mobile);
  assert.equal(h.docs.size,0);
  assert.equal(h.storageData.size,0);
});

test('Restored tester without lease must reauthenticate; non-tester keeps legacy flow',async()=>{
  const h=harness(),manager=h.newManager();
  await assert.rejects(()=>manager.activate(h.user),error=>error.reason==='reauth');
  manager.markExplicitLogin();
  assert.equal(await manager.activate({uid:'ordinary',getIdToken:async()=>''}),null);
  assert.equal(h.docs.size,0);
});

test('Network uncertainty never authorizes restored session from local token',async()=>{
  const h=harness(),a=h.newManager();a.markExplicitLogin();
  const lease=await a.activate(h.user);
  h.setOffline(true);
  await assert.rejects(()=>h.newManager().activate(h.user),error=>error.reason==='unreachable');
  await assert.rejects(()=>a.check(h.user,lease),error=>error.reason==='unreachable');
  await a.release(h.user,lease);
  assert.equal(h.storageData.size,0,'Local logout works while offline');
});

test('native auth integration marks Google+OTP intent before Firebase callback and gates first data unlock',()=>{
  const auth=fs.readFileSync(path.resolve(__dirname,'../../../src/services/auth/authService.ts'),'utf8');
  const ctx=fs.readFileSync(path.resolve(__dirname,'../../../src/context/AuthContext.tsx'),'utf8');
  const api=fs.readFileSync(path.resolve(__dirname,'../../../src/services/auth/nativeSingleSessionPreview.ts'),'utf8');
  assert.match(auth,/nativeSingleSessionPreview\.markExplicitLogin\(\);\s*nativeSecureSessionPreview\.markExplicitLogin\(\);\s*try \{ await signInWithCredential/);
  assert.match(auth,/nativeSingleSessionPreview\.markExplicitLogin\(\);\s*nativeSecureSessionPreview\.markExplicitLogin\(\);\s*try \{ await confirmation\.confirm/);
  assert.match(ctx,/setUser\(null\);\s*setAuthStatus\(currentUser \? "initializing"/);
  assert.match(ctx,/nativeSingleSessionPreview\.activate\(currentUser\)\.then\(lease=>/);
  assert.match(api,/const enabled=process\.env\.EXPO_PUBLIC_SINGLE_SESSION_PREVIEW==='1'/);
  assert.match(api,/url\.protocol!=='https:'/);
  assert.doesNotMatch(api,/FIREBASE_SERVICE_ACCOUNT_JSON/,'No admin secrets in the mobile app');
});

test('V2 secure Android Preview is gated before all profile and membership reads',()=>{
  const ctx=fs.readFileSync(path.resolve(__dirname,'../../../src/context/AuthContext.tsx'),'utf8');
  const secure=fs.readFileSync(path.resolve(__dirname,'../../../src/services/auth/nativeSecureSessionPreview.ts'),'utf8');
  const claimPosition=ctx.indexOf('nativeSecureSessionPreview.activate(currentUser)');
  const legacyPosition=ctx.indexOf('nativeSingleSessionPreview.activate(currentUser)');
  assert.ok(claimPosition>0&&claimPosition<legacyPosition,'Secure V2 takes precedence over cooperative V1');
  assert.match(ctx,/secureSessionRef\.current=session;\s*startAuthoritativeVerification\(verifiedUser\)/);
  assert.match(ctx,/const verifiedUser=getAuth\(\)\.currentUser/,'Session-bound custom Firebase identity used for data');
  assert.match(ctx,/await nativeSecureSessionPreview\.check\(currentUser,secure\)/,'V2 foreground heartbeat');
  assert.match(ctx,/await nativeSecureSessionPreview\.release\(user,secureSession\)/,'V2 sign-out release');
  assert.match(ctx,/nativeSecureSessionPreview\.requiresSession\(user.uid\)/,'V2 error-state retry remains gated');
  assert.match(secure,/EXPO_PUBLIC_SESSION_ENFORCED_V2==='1'&&process\.env\.EXPO_PUBLIC_SINGLE_SESSION_PREVIEW==='1'/);
  assert.match(secure,/signInWithCustomToken\(getAuth\(\),claim\.customToken\)/);
  assert.match(secure,/getIdTokenResult\(\)/);
  assert.match(secure,/fbSessionVersion===2/);
  assert.doesNotMatch(secure,/localStorage|AsyncStorage|FIREBASE_SERVICE_ACCOUNT_JSON/,'V2 session bearer is Firebase token only');
});

test('V2 security protocol cross-client claim-check-release never grants previous SID',async()=>{
  const {claimSecure,checkSecure,releaseSecure}=require(path.resolve(__dirname,'../../../../../03_SERVERS/family_bloom_session_gateway-preview-r16r3/lib/secure-session-core.cjs'));
  const docs=new Map();
  const store={
    read:async uid=>docs.get(uid)||null,
    replace:async(uid,value)=>{docs.set(uid,value);},
    removeIfCurrent:async(uid,sid)=>{
      if(docs.get(uid)?.sid!==sid)return false;
      docs.delete(uid);return true;
    },
  };
  const now=Date.now(),uid='tester';
  const auth={createCustomToken:async(_uid,claims)=>JSON.stringify(claims)};
  const fresh={uid,auth_time:Math.floor(now/1000),firebase:{sign_in_provider:'google.com'}};
  const web=await claimSecure({store,auth,decoded:fresh,nowMs:now});
  const webProof={uid,...JSON.parse(web.customToken)};
  assert.equal((await checkSecure(store,webProof)).state,'active');
  const android=await claimSecure({store,auth,decoded:{...fresh,firebase:{sign_in_provider:'phone'}},nowMs:now+1});
  const androidProof={uid,...JSON.parse(android.customToken)};
  assert.equal((await checkSecure(store,webProof)).state,'replaced');
  assert.equal((await releaseSecure(store,webProof)).state,'replaced','Web must not revoke Android');
  assert.equal((await checkSecure(store,androidProof)).state,'active');
  assert.equal((await releaseSecure(store,androidProof)).state,'active');
  assert.equal((await checkSecure(store,androidProof)).state,'replaced');
});
