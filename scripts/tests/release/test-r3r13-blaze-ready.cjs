#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let count=0;const test=(name,fn)=>{fn();console.log('PASS '+(++count)+' '+name)};
test('Blaze runtime is opt-in (not built-in true)',()=>{
 const f=read('src/constants/featureFlags.ts');assert.match(f,/get USE_CLOUD_FUNCTIONS\(\)/);assert.match(read('src/services/cloud/cloudFeatureService.ts'),/cloudFunctionsEnabled: false, remotePushEnabled: false/);
});
test('Fail-closed cloud flags are read lazily without Firestore listener',()=>{
 const s=read('src/services/cloud/cloudFeatureService.ts');assert.match(s,/AppState.addEventListener/);assert.match(s,/await getDoc/);assert.doesNotMatch(s,/onSnapshot\(/);assert.match(s,/this\.reset\(\);/);
});
test('Native push keeps working independently of remote FCM',()=>{let s=read('src/services/push/localNotificationService.ts');assert.match(s,/scheduleTest/);s=read('src/components/system/BloomPushBridge.tsx');assert.match(s,/watchCloudFeatureSwitches/);});
test('Cloud switches require verified developer identity on both client and server',()=>{const a=read('src/services/cloud/cloudFeatureService.ts');const b=read('functions/cloudFeatureFlags.js');assert.match(a,/isVerifiedDeveloperAccount/);assert.match(b,/developerIdentity/);});
test('Firestore rules protect global toggles in direct/cloud modes',()=>{for(const f of ['firestore.rules','firestore.cloud.rules']){const t=read(f);assert.match(t,/match \/system\/featureSwitches/);assert.match(t,/request\.auth\.token\.email_verified/);assert.match(t,/allow create, update: if isVerifiedBloomDeveloper\(\) && validBloomSwitches\(\)/);assert.match(t,/request\.resource\.data\.keys\(\)\.hasOnly/);}});
test('Backend validates feature state on graph mutations',()=>{const t=read('functions/index.js');assert.match(t,/featureOn\("cloudFunctionsEnabled"\)/);});
test('Backend FCM send and event handlers stop when feature off',()=>{const t=read('functions/pushNotifications.js');assert((t.match(/featureOn\("remotePushEnabled"\)/g)||[]).length>=8);assert.match(t,/getMessaging\(\)\.sendEachForMulticast/);});
test('Readiness HTTPS verifies developer token',()=>{const s=read('functions/index.js');assert.match(s,/exports\.bloomCloudReadiness = onRequest/);assert.match(s,/getAuth\(\)\.verifyIdToken\(token\)/);assert.match(s,/developerIdentity\(decoded\)/);});
test('R3R13 supports 4 original BAT root launchers unchanged',()=>{const fsRoot=fs.readdirSync(root).filter(x=>x.toLowerCase().endsWith('.bat'));assert.equal(fsRoot.length,4);});
test('Blaze BAT is nested and insists on explicit DEPLOY confirmation',()=>{const s=read('scripts/firebase/Family_Bloom_BLAZE_SETUP_ONCE.bat');assert.match(s,/--preflight/);assert.match(s,/set \/p "FB_CONFIRM=/);assert.match(s,/"DEPLOY"/);assert.match(s,/--only firestore:rules/);assert.match(s,/--only functions/);});
test('Blaze setup accessible in existing Android menu',()=>{const s=read('scripts/android/Family_Bloom_MENU.bat');assert.match(s,/choice \/C 123456780/);assert.match(s,/goto :blaze/);});
test('BAT manifest and legacy protection remains complete',()=>{const m=JSON.parse(read('scripts/setup/bat-entrypoints-manifest.json'));for(const f of m.batFiles) assert(fs.statSync(path.join(root,f)).isFile(),f);});
test('All R3R12 family/letter/radical tests are preserved',()=>{assert(fs.existsSync(path.join(root,'scripts/tests/release/test-r3r12-family-intro-letter-radical.cjs')));assert(fs.existsSync(path.join(root,'src/features/study/StudyFormula.tsx')));});
console.log(`R3R13 Blaze gates: ${count}/${count} PASS`);
