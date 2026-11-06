#!/usr/bin/env node
'use strict';
// Android-onboarding regressions exercisable without Firebase/Gradle.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const memory = new Map();
const storage = { getItem: async k => memory.get(k) ?? null, setItem: async (k,v) => { memory.set(k,v); } };
const ledgerSource = read('src/services/onboarding/welcomeLedger.ts');
const m = {exports:{}};
let ts; try {ts=require('typescript');} catch {}
if(ts){
 const js=ts.transpileModule(ledgerSource,{fileName:'welcomeLedger.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','exports','module',js)(id=> {
  if(id==='@react-native-async-storage/async-storage')return {__esModule:true,default:storage};
  throw Error('Unexpected dependency '+id);
 },m.exports,m);
}else{
 // Clean Auto Update must work BEFORE node_modules have been installed.
 const {stripTypeScriptTypes}=require('node:module');
 assert.equal(typeof stripTypeScriptTypes,'function','Use Node 22+ before installing dependencies');
 const plain=ledgerSource.replace(/^import .*;\s*$/gm,'');
 const js=stripTypeScriptTypes(plain,{mode:'strip'}).replace(/\bexport\s+(?=(?:const|function)\b)/g,'');
 new Function('storage','module','const AsyncStorage=storage;\n'+js+'\nmodule.exports={welcomeLedger,WELCOME_GATE_CUTOFF}')(storage,m);
}
const {welcomeLedger, WELCOME_GATE_CUTOFF} = m.exports;
let n=0;
const pass=(name,condition)=>{assert(condition,name);console.log('PASS',name);n++};
(async()=>{
 const before={familyId:'old-home',joinedAt:'2025-01-01T00:00:00.000Z'};
 const fresh={familyId:'fresh-home',joinedAt:'2026-11-01T09:00:00.000Z'};
 pass('Release cutoff is migration safe', WELCOME_GATE_CUTOFF === '2026-10-30T17:00:00.000Z');
 pass('Historic membership does not replay Welcome on app update',!(await welcomeLedger.needsWelcome('old-user',before)));
 pass('Newly approved member sees Welcome on first active-house verification',await welcomeLedger.needsWelcome('new-user',fresh));
 await welcomeLedger.markSeen('new-user',fresh);
 pass('Welcome completion persists across app restart',!(await welcomeLedger.needsWelcome('new-user',fresh)));
 pass('Different UID is not considered acknowledged',await welcomeLedger.needsWelcome('another-user',fresh));
 pass('Another family is not considered acknowledged',await welcomeLedger.needsWelcome('new-user',{...fresh,familyId:'second-home'}));
 pass('Rejoin with new joinedAt requires a new Welcome',await welcomeLedger.needsWelcome('new-user',{...fresh,joinedAt:'2026-11-02T00:00:00.000Z'}));
 const auth=read('src/context/AuthContext.tsx');
 const layout=read('src/app/_layout.tsx');
 const create=read('src/app/(profile)/create-profile.tsx');
 const cv=read('src/app/(profile)/profile.tsx');
 const gateway=read('src/app/(family)/(membership)/family-gateway.tsx');
 const picker=read('src/components/ui/BloomInputComponents/BloomInputAvatar.tsx');
 const statuses=read('src/services/media/avatarStatus.ts');
 const sync=read('src/services/media/avatarAsyncSync.ts');
 pass('Login/profile refresh does not generate Welcome intent',!auth.includes('welcomeRequestedRef') && auth.includes('Profile refresh is NOT a welcome intent'));
 pass('Root navigation blocks Home while welcome ledger is being checked',layout.includes('verifiedFamily && welcomeReady && !welcomeBlocking')&&layout.includes('|| !welcomeReady'));
 pass('Welcome read acknowledgment saved before Home unlock',auth.indexOf('await welcomeLedger.markSeen(')<auth.indexOf('setWelcomeTarget(current =>'));
 pass('Photo processing waits for cloud result before unlocking next onboarding step',create.indexOf('await avatarAsyncSync.waitForCompletion(')<create.indexOf('const verified = await refreshProfile();'));
 pass('Failed avatar save keeps Create Profile onscreen',create.includes('if (result !== "complete")')&&create.includes('return;')&&create.includes('continueWithoutAvatar'));
 pass('Editing profile waits for photo before closing CV',cv.indexOf('await avatarAsyncSync.waitForCompletion(')<cv.indexOf('setEditVisible(false);',cv.indexOf('const saveProfile =')));
 pass('No late sync toast observer from global resume',auth.includes('avatarAsyncSync.resume(user.uid);')&&!auth.includes('Ảnh đại diện đã đồng bộ'));
 pass('No late success toast callbacks from save screens',!create.includes('complete: async')&&!cv.includes('Ảnh đại diện đã cập nhật'));
 pass('Approve/Enter arm welcome before family activation',gateway.indexOf('requestWelcomeForFamily(request.familyId);')<gateway.indexOf('await familyService.switchActiveFamily(user.uid, request.familyId);'));
 pass('Native photo picker does not show provider technical text',!picker.includes('error instanceof Error ? error.message'));
 pass('User-facing avatar progress does not mention cloud providers',!Object.values(statuses.match(/(?:preparing|uploading|confirming|saving): .*/g)||{}).some(x=>/Cloudinary|Vercel/.test(x)));
 pass('Queue exposes awaited completion and timeout',sync.includes('async waitForCompletion(uid: string')&&sync.includes('setTimeout(() => finish("timeout")'));
 console.log(`Family Bloom R8R2 profile/welcome regression: ${n}/${n} PASS`);
})().catch(error=>{console.error(error);process.exitCode=1});
