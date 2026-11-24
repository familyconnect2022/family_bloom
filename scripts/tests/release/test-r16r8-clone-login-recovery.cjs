'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const root=path.resolve(__dirname,'../../..');
const authSource=fs.readFileSync(path.join(root,'src/services/auth/authService.ts'),'utf8');
const leaseSource=fs.readFileSync(path.join(root,'src/services/auth/androidSingleSession.ts'),'utf8');
const authContext=fs.readFileSync(path.join(root,'src/context/AuthContext.tsx'),'utf8');
const loginUI=fs.readFileSync(path.join(root,'src/app/(auth)/login.tsx'),'utf8');
const emit=(src,file)=>ts.transpileModule(src,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021,esModuleInterop:true}}).outputText;

function mockAuthService({googleSignIn,playServices=async()=>true,firebaseSignIn=async()=>({})}={}) {
 const count={googleLogout:0,firebaseLogout:0,credentialCalls:0};
 const google={
  configure(){},hasPlayServices:playServices,signIn:googleSignIn || (async()=>({type:'success',data:{idToken:'fake-test-token'}})),
  getCurrentUser(){return {id:'test'};}, async signOut(){count.googleLogout++;}
 };
 const firebase={GoogleAuthProvider:{credential(t){return {testToken:t};}}, getAuth(){return {};},
  signInWithCredential:async (...args)=>{count.credentialCalls++;return firebaseSignIn(...args);},
  signInWithPhoneNumber:async()=>null, signOut:async()=>{count.firebaseLogout++;}
 };
 const env={ENV:{googleWebClientId:'public-client-id'}};
 const errors={AppError:class AppError extends Error {constructor(code,category,message){super(message);this.code=code;this.category=category;}}};
 const imports={'@react-native-firebase/auth':firebase,'@react-native-google-signin/google-signin':{GoogleSignin:google},'../../config/env':env,'../../types/errors':errors};
 const mod=new Module('authService.integration.test.js',module);
 mod.filename=path.join(root,'src/services/auth/authService.integration.test.js');mod.paths=module.paths;
 const old=Module._load;
 Module._load=function(id,parent,isMain){return imports[id]??old.call(this,id,parent,isMain)};
 try{mod._compile(emit(authSource.replace(/15000/g,'18').replace(/60000/g,'18').replace(/25000/g,'18').replace(/5000/g,'18'),'authService.ts'),mod.filename);}
 finally{Module._load=old;}
 return {...mod.exports,count};
}

test('Clone: forced A logout clears Firebase only, never global Google account',async()=>{
 const {authService,count}=mockAuthService();
 await authService.signOutFirebaseOnly();
 assert.equal(count.firebaseLogout,1);
 assert.equal(count.googleLogout,0,'Google Play Services may be shared by A and B');
 assert.match(authContext,/authService\.signOutFirebaseOnly\(\)/);
 assert.doesNotMatch(authContext,/void authService\.signOut\(\)\.catch/,'Automatic observer must not touch Google SSO');
 assert.match(authContext,/await authService\.signOutFirebaseOnly\(\)/,'Heartbeat eviction must not touch Google SSO');
});

test('Clone: hanging Google account chooser has bounded spinner and ignores late result',async()=>{
 let finish;
 const picker=new Promise(resolve=>{finish=resolve;});
 const {authService,GoogleLoginTimeoutError,count}=mockAuthService({googleSignIn:()=>picker});
 const stages=[];
 await assert.rejects(authService.signInWithGoogle(s=>stages.push(s)),e=>e instanceof GoogleLoginTimeoutError&&e.phase==='account-picker');
 finish({type:'success',data:{idToken:'late-test-token'}});
 await new Promise(resolve=>setTimeout(resolve,5));
 assert.deepEqual(stages,['play-services','account-picker']);
 assert.equal(count.credentialCalls,0,'A late native picker must NOT silently log in');
 assert.match(authContext,/finally\s*\{\s*\/\/ Always stop the login spinner[\s\S]*?setGoogleLoginPhase\(null\)/);
 assert.match(loginUI,/googleLoginNotice/);
 assert.match(loginUI,/googleLoginPhase === 'firebase'/);
});

test('Clone: hanging Firebase credential exchange is time-bounded',async()=>{
 const {authService,GoogleLoginTimeoutError}=mockAuthService({firebaseSignIn:()=>new Promise(()=>{})});
 await assert.rejects(authService.signInWithGoogle(),e=>e instanceof GoogleLoginTimeoutError&&e.phase==='firebase');
});

test('Gateway: hanging Firebase ID token cannot leave session checking forever',async()=>{
 assert.match(leaseSource,/withSessionDeadline\(user\.getIdToken\(\), 12000\)/);
 assert.match(leaseSource,/withSessionDeadline\(fetch\(url/);
 const env=['EXPO_PUBLIC_SINGLE_SESSION_ENABLED','EXPO_PUBLIC_SINGLE_SESSION_API_URL'];
 const prev=env.map(k=>process.env[k]);
 const origFetch=global.fetch;
 process.env.EXPO_PUBLIC_SINGLE_SESSION_ENABLED='1';
 process.env.EXPO_PUBLIC_SINGLE_SESSION_API_URL='https://example.test/api/session';
 let fetched=false;
 global.fetch=async()=>{fetched=true;throw new Error('should not fetch');};
 const stub={__esModule:true,default:{getItem:async()=>null,setItem:async()=>{},removeItem:async()=>{}}};
 const mod=new Module('nativeSession.integration.test.js',module);
 mod.filename=path.join(root,'src/services/auth/nativeSession.integration.test.js');mod.paths=module.paths;
 const old=Module._load;
 Module._load=function(id,parent,isMain){return id==='@react-native-async-storage/async-storage'?stub:old.call(this,id,parent,isMain);};
 try{mod._compile(emit(leaseSource.replace(/12000/g,'18').replace(/6000/g,'18'),'androidSingleSession.ts'),mod.filename);}
 finally{Module._load=old;}
 try{
  mod.exports.markAndroidLoginIntent();
  await assert.rejects(mod.exports.activateAndroidSession({uid:'alpha',getIdToken:()=>new Promise(()=>{})}),e=>e.reason==='unreachable');
  assert.equal(fetched,false);
 }finally{global.fetch=origFetch;env.forEach((k,i)=>prev[i]===undefined?delete process.env[k]:process.env[k]=prev[i]);}
});

test('No credential logging and no Rules, Media or production changes required',()=>{
 assert.doesNotMatch(authSource,/console\.(?:log|warn|info)\(/);
 assert.doesNotMatch(leaseSource,/console\.(?:log|warn|info)\(/);
 assert.match(authSource,/GoogleLoginTimeoutError/);
 assert.match(authSource,/async signOutFirebaseOnly\(\)/);
});


test('Strict TypeScript auth service and TSX syntax gate (Expo Bundler, not Node10)',()=>{
 const os=require('node:os');
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'fb-clone-ts-'));
 try{
  const put=(rel,content)=>{const full=path.join(temp,rel);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,content);return full;};
  const entry=put('src/services/auth/authService.ts',authSource);
  put('src/config/env.ts',`export const ENV: {googleWebClientId:string|undefined} = {googleWebClientId:'client'};`);
  put('src/types/errors.ts',`export class AppError extends Error {constructor(code:string,category:string,message?:string){super(message)}}`);
  const shim=put('shims.d.ts',[
   "declare module '@react-native-firebase/auth' {",
   "  export type ConfirmationResult={confirm(code:string):Promise<void>};",
   "  export interface User{uid:string;getIdToken():Promise<string>}",
   "  export const GoogleAuthProvider:{credential(idToken:string|null):unknown};",
   "  export function getAuth():{onAuthStateChanged(f:(user:User|null)=>void):()=>void};",
   "  export function signInWithCredential(a:unknown,b:unknown):Promise<unknown>;",
   "  export function signInWithPhoneNumber(a:unknown,b:string):Promise<ConfirmationResult>;",
   "  export function signOut(a:unknown):Promise<void>;",
   "}",
   "declare module '@react-native-google-signin/google-signin' {",
   "  export const GoogleSignin: {configure(o:unknown):void;hasPlayServices():Promise<boolean>;signIn():Promise<{type:'cancelled'}|{type:'success';data:{idToken:string}}>;getCurrentUser():unknown;signOut():Promise<void>};",
   "}",
  ].join('\n'));
  const options={noEmit:true,strict:true,skipLibCheck:true,types:[],target:ts.ScriptTarget.ES2021,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,esModuleInterop:true};
  const program=ts.createProgram([entry,shim],options);
  const diagnostics=ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length,0,ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCanonicalFileName:n=>n,getCurrentDirectory:()=>temp,getNewLine:()=> '\n'}));
  for(const [file,content] of [['AuthContext.tsx',authContext],['login.tsx',loginUI]]){
   const t=ts.transpileModule(content,{fileName:file,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2021}});
   assert.equal(t.diagnostics?.length||0,0,file+' must parse as TSX');
  }
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
