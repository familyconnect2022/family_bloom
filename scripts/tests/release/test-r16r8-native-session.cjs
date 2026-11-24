'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
let ts;
try{ts=require('typescript');}catch{
  throw new Error('BLOCKED: TypeScript is required for Android session runtime gate; npm install first.');
}
const root=path.resolve(__dirname,'../../..');
const source=fs.readFileSync(path.join(root,'src/services/auth/androidSingleSession.ts'),'utf8');
const jsx=fs.readFileSync(path.join(root,'src/context/AuthContext.tsx'),'utf8');
const layout=fs.readFileSync(path.join(root,'src/app/_layout.tsx'),'utf8');
// TypeScript 5/6 can emit either a direct `.default` import or an
// `__importDefault(...)` helper depending on compiler defaults and interop flags.
// Exercise BOTH CommonJS shapes; the test stub must behave like an ES-module
// default export in either case.
const clientJsByInterop=new Map([false,true].map(interop=>[interop,ts.transpileModule(source,{
  fileName:'androidSingleSession.ts',
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021,esModuleInterop:interop},
}).outputText]));

function runtime(store,interop){
  const mod=new Module('androidSingleSession.test.js',module);
  mod.filename=path.join(root,'src/services/auth/androidSingleSession.test.js');
  mod.paths=module.paths;
  const nativeStorage={
    async getItem(k){return store.get(k)??null;},
    async setItem(k,v){store.set(k,v);},
    async removeItem(k){store.delete(k);},
  };
  // __esModule is required. Without it, `__importDefault` double-wraps the
  // stub as `{default:{default:storage}}` and an otherwise valid reauth error
  // is falsely reported as a storage configuration error on some TS versions.
  const storageModule={__esModule:true,default:nativeStorage};
  const old=Module._load;
  Module._load=function(id,parent,isMain){return id==='@react-native-async-storage/async-storage'?storageModule:old.call(this,id,parent,isMain);};
  try {mod._compile(clientJsByInterop.get(interop),mod.filename);} finally {Module._load=old;}
  return mod.exports;
}
const user=uid=>({uid,async getIdToken(){return `user:${uid}`;}});

// Unlike transpileModule(), createProgram reports semantic errors such as TS7006.
// Keep the platform-independent type shim intentionally small: the real Android
// typecheck (run later by the BAT) continues to validate the full Expo project.
test('Android single-session TypeScript strict/noImplicitAny and TS5107-safe Bundler resolution',()=>{
  const sourcePath=path.join(root,'src/services/auth/androidSingleSession.ts');
  const shimPath=path.join(root,'src/services/auth/__android_session_type_shim__.d.ts');
  const shim=[
    'declare const process: any;',
    "declare module '@react-native-async-storage/async-storage' {",
    '  const AsyncStorage: { getItem(k:string):Promise<string|null>; setItem(k:string,v:string):Promise<void>; removeItem(k:string):Promise<void> };',
    '  export default AsyncStorage;',
    '}',
    "declare module '@react-native-firebase/auth' {",
    '  export interface User { uid:string; getIdToken():Promise<string> }',
    '}',
  ].join('\n');
  const opts={strict:true,noImplicitAny:true,noEmit:true,skipLibCheck:true,types:[],
    target:ts.ScriptTarget.ES2021,// Expo uses a Bundler resolution strategy. Node10 is deprecated by TS 6+
    // and fails the gate with TS5107 even when application code is valid.
    module:ts.ModuleKind.ESNext,
    moduleResolution:ts.ModuleResolutionKind.Bundler,esModuleInterop:true};
  // The isolated regression gate must use a modern resolution mode so that
  // TypeScript 6.x does not emit TS5107 (removed in TypeScript 7).
  assert.equal(opts.moduleResolution,ts.ModuleResolutionKind.Bundler);
  assert.equal(opts.module,ts.ModuleKind.ESNext);
  const host=ts.createCompilerHost(opts);
  const orig=host.getSourceFile.bind(host);
  host.getSourceFile=(name,languageVersion,onError,shouldCreateNewSourceFile)=>
    path.resolve(name)===path.resolve(shimPath)
      ?ts.createSourceFile(name,shim,languageVersion,true)
      :orig(name,languageVersion,onError,shouldCreateNewSourceFile);
  const program=ts.createProgram([sourcePath,shimPath],opts,host);
  const diagnostics=ts.getPreEmitDiagnostics(program);
  assert.ok(!diagnostics.some(d=>d.code===5107),
    'The Android session gate must never use deprecated moduleResolution=node10 (TS5107)');
  assert.equal(diagnostics.length,0,ts.formatDiagnosticsWithColorAndContext(diagnostics,{
    getCanonicalFileName:name=>name,getCurrentDirectory:()=>root,getNewLine:()=> '\n',
  }));
  // Prove the strict gate still catches implicit-any, even though the old CSV
  // allowlist (and its previous TS7006 callback) was intentionally removed.
  const broken=source+'\nfunction __probe(value) { return value; }\n';
  assert.notEqual(broken,source,'Type regression fixture must actually remove the annotation');
  const brokenHost=ts.createCompilerHost(opts);
  const oldGet=brokenHost.getSourceFile.bind(brokenHost);
  brokenHost.getSourceFile=(name,lang,onError,createNew)=>
    path.resolve(name)===path.resolve(shimPath)
      ?ts.createSourceFile(name,shim,lang,true)
      :path.resolve(name)===path.resolve(sourcePath)
        ?ts.createSourceFile(name,broken,lang,true)
        :oldGet(name,lang,onError,createNew);
  const brokenDiagnostics=ts.getPreEmitDiagnostics(ts.createProgram([sourcePath,shimPath],opts,brokenHost));
  assert.ok(brokenDiagnostics.some(d=>d.code===7006),
    'Strict regression gate must detect TS7006 when the string callback loses its type');
});

for (const interop of [false,true]) test(`Android A -> B -> A, restore and offline checks (esModuleInterop=${interop})`,async()=>{
  const envNames=['EXPO_PUBLIC_SINGLE_SESSION_ENABLED','EXPO_PUBLIC_SINGLE_SESSION_API_URL'];
  const prev=envNames.map(k=>process.env[k]);
  const oldFetch=global.fetch;
  try {
    process.env.EXPO_PUBLIC_SINGLE_SESSION_ENABLED='1';
    process.env.EXPO_PUBLIC_SINGLE_SESSION_API_URL='https://preview.example/api/session';
    const docs=new Map();let connected=true;let claims=0;
    global.fetch=async (_url,options)=>{
      assert.equal(options.headers['X-FamilyBloom-Client'],'android');
      assert.equal(options.headers['Content-Type'],'application/json');
      if(!connected)throw new Error('offline');
      const {action,token}=JSON.parse(options.body);
      const uid=options.headers.Authorization.slice('Bearer user:'.length);
      const previous=docs.get(uid);
      if(action==='claim'){
        const value=String.fromCharCode(65+(claims++%26))+'X'.repeat(42);
        docs.set(uid,value);
        return {ok:true,status:200,async json(){return {state:'active',token:value};}};
      }
      const active=previous===token;
      if(action==='release'&&active)docs.delete(uid);
      return {ok:active,status:active?200:409,async json(){return {state:active?'active':'replaced'};}};
    };
    const aStore=new Map(),bStore=new Map();
    const a=runtime(aStore,interop),b=runtime(bStore,interop);const u=user('alpha');
    assert.equal(a.singleSessionEnabled('alpha'),true);
    assert.equal(a.singleSessionEnabled('other'),true,'every Firebase UID must be covered');
    await assert.rejects(a.activateAndroidSession(user('other')),e=>e.reason==='reauth');
    await assert.rejects(a.activateAndroidSession(u),e=>e.reason==='reauth','old install must sign in again');
    a.markAndroidLoginIntent();const aLease=await a.activateAndroidSession(u);
    assert.equal((await a.checkAndroidSession(u,aLease)),'active');
    b.markAndroidLoginIntent();const bLease=await b.activateAndroidSession(u);
    assert.notEqual(aLease.token,bLease.token);
    assert.equal((await a.checkAndroidSession(u,aLease)),'replaced');
    await a.releaseAndroidSession(u,aLease);
    assert.equal((await b.checkAndroidSession(u,bLease)),'active','A cannot release B');
    const bRestored=runtime(bStore,interop);
    assert.deepEqual(await bRestored.activateAndroidSession(u),bLease,'reboot must check, not claim');
    connected=false;
    await assert.rejects(bRestored.checkAndroidSession(u,bLease),e=>e.reason==='unreachable');
    await assert.rejects(bRestored.activateAndroidSession(u),e=>e.reason==='unreachable','offline never unlocks');
    connected=true;
    assert.equal((await bRestored.checkAndroidSession(u,bLease)),'active');
    await bRestored.releaseAndroidSession(u,bLease);
    await assert.rejects(bRestored.activateAndroidSession(u),e=>e.reason==='reauth','logout should require login again');
  } finally {
    global.fetch=oldFetch;
    envNames.forEach((k,i)=>prev[i]===undefined?delete process.env[k]:process.env[k]=prev[i]);
  }
});

test('Android UI integration gates lease BEFORE profile/family and evicts on replacement',()=>{
  assert.match(jsx,/const needsLease = !!currentUser && singleSessionEnabled/);
  assert.match(jsx,/setUser\(needsLease \? null : currentUser\)/);
  assert.match(jsx,/void activateAndroidSession\(currentUser\)/);
  assert.match(jsx,/setUser\(null\);\s*setAuthStatus\('initializing'\)/);
  assert.match(jsx,/await forgetAndroidLease\(lease\)/);
  assert.match(jsx,/if \(\!alive \|\| authUidRef.current !== uid/);
  assert.match(jsx,/avatarPickerActivity\.isPicking\(\)/);
  assert.match(layout,/singleSessionStatus === 'off' \|\| singleSessionStatus === 'active'/);
  assert.doesNotMatch(source,/console\.(?:log|warn|info)\(/);
  console.log('[ANDROID SINGLE SESSION PRODUCTION PASS] all integration guards present');
});
