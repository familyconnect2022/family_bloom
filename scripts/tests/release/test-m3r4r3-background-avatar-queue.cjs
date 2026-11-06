#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
const source=fs.readFileSync(path.join(__dirname,'../../../src/services/media/avatarAsyncSync.ts'),'utf8');
const code=ts.transpileModule(source,{fileName:'avatarAsyncSync.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const db=new Map(),deviceFiles=new Map();
const storage={getItem:async k=>db.get(k)??null,setItem:async(k,v)=>{db.set(k,v)},removeItem:async k=>{db.delete(k)}};
class Directory {constructor(base,...parts){this.uri=[base.uri||base,...parts].join('/')}create(){} }
class File {constructor(base,...parts){this.uri=[base.uri||base,...parts].join('/')} get exists(){return deviceFiles.has(this.uri)} async copy(target){deviceFiles.set(target.uri,deviceFiles.get(this.uri)||this.uri)} delete(){deviceFiles.delete(this.uri)} }
const Paths={document:'file:///documents'};
let user={uid:'uid-test'},continueFirst,firstStarted;
const firstReady=new Promise(r=>{firstStarted=r}),firstGate=new Promise(r=>{continueFirst=r});
const attachments=[],discarded=[];let attempt=0;
const service={updateWithAvatar:async(uid,patch,file,cb,options)=>{
  attempt++;assert.equal(uid,user.uid);
  if(attempt===1){firstStarted();await firstGate;}
  options.onProgress?.(40);
  if(await options.canCommit())attachments.push(file.uri);
  else discarded.push(file.uri);
}};
const mocks={
  '@react-native-async-storage/async-storage':{__esModule:true,default:storage},
  '@react-native-firebase/auth':{getAuth:()=>({currentUser:user})},
  'expo-file-system':{Directory,File,Paths},
  './avatarFile':{avatarFileFromUri:uri=>({uri})},
  '../profile/profileService':{profileService:service},
};
const loaded={exports:{}};
new Function('require','exports','module',code)(key=>{if(!(key in mocks))throw Error('Unexpected module '+key);return mocks[key]},loaded.exports,loaded);
const {avatarAsyncSync}=loaded.exports;
async function spinUntil(fn){for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,4))}assert(fn(),'Timed out awaiting background upload');}
(async()=>{
  deviceFiles.set('file:///avatar-A.jpg','A');deviceFiles.set('file:///avatar-B.jpg','B');deviceFiles.set('file:///avatar-C.jpg','C');
  const seen=[];const un=avatarAsyncSync.subscribe('uid-test',s=>seen.push({...s}));
  await avatarAsyncSync.enqueue(user.uid,'file:///avatar-A.jpg');await firstReady;
  await avatarAsyncSync.enqueue(user.uid,'file:///avatar-B.jpg');continueFirst();
  await spinUntil(()=>attachments.length===1);
  assert.equal(discarded.length,1);
  assert.equal(attachments.length,1);
  assert.notEqual(attachments[0],discarded[0]); // only new job is attached
  await spinUntil(()=>db.size===0);
  assert(seen.some(s=>s.phase==='uploading'));
  console.log('PASS replaced upload cannot attach stale picture; foreground state tracks latest');
  await avatarAsyncSync.enqueue(user.uid,'file:///avatar-C.jpg');
  assert.equal(await avatarAsyncSync.waitForCompletion(user.uid,2000),'complete');
  await spinUntil(()=>attachments.length===2);
  console.log('PASS waitForCompletion unblocks only after profile update');
  await avatarAsyncSync.discard(user.uid);assert.equal(db.size,0);
  console.log('PASS discard removes persisted intent');
  user={uid:'other-user'};
  await assert.rejects(avatarAsyncSync.enqueue('uid-test','file:///avatar-A.jpg'),/AVATAR_OWNER_CHANGED/);
  console.log('PASS UID identity boundary');un();
})().catch(e=>{console.error(e);process.exitCode=1});
