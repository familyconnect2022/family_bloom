#!/usr/bin/env node
'use strict';
/** In-memory behavior tests. Never connect Firebase or native modules. */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const ts=require('typescript');
const root=path.resolve(__dirname,'../../..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const cloudPath='src/theme/appearanceCloudSync.ts';
let passes=0;
async function check(label,fn){await fn();passes++;console.log(`PASS ${String(passes).padStart(2,'0')} ${label}`);}
const pref=(palette='garden',font='classic')=>({palette,mode:'light',font,fontScale:140,motion:'gentle',updatedAt:'2026-11-03T00:00:00.000Z',schemaVersion:2});
function harness({cache={},docValue=null,getItem=null}={}) {
  const reads=[],writes=[],colorHistory=[],typographyHistory=[];
  let current={palette:'rose',mode:'light'};
  let typeface={font:'modern',fontScale:100,motion:'gentle'};
  const storage=new Map(Object.entries(cache));
  const storageApi={getItem:async key=>getItem?getItem(key):storage.get(key)??null,
    setItem:async(key,val)=>{storage.set(key,val);}};
  const firestore={doc:(_db,p)=>p,getFirestore:()=>null,
    getDocFromServer:async key=>{reads.push(key);const data=typeof docValue==='function'?docValue(key):docValue;
      return {exists:()=>data!==null,data:()=>data};},
    setDoc:async(key,payload)=>{writes.push({key,payload});}};
  const mock={
    '@react-native-async-storage/async-storage':{__esModule:true,default:storageApi},
    '@react-native-firebase/firestore':firestore,
    '../services/firebase/firestorePaths':{FIRESTORE_PATHS:{userAppearance:uid=>`appearance/${uid}`}},
    './runtime':{
      getBloomSelection:()=>current,
      applyBloomSelection:value=>{current={palette:value.palette,mode:value.mode};colorHistory.push(current);},
    },
    './palette':{DEFAULT_BLOOM_SELECTION:{palette:'rose',mode:'light'},
      isBloomSelection:value=>value&&['rose','garden','heritage','midnight'].includes(value.palette)&&['light','dark','system'].includes(value.mode)},
    './livingAppearance':{
      DEFAULT_LIVING_APPEARANCE:{font:'modern',fontScale:100,motion:'gentle'},
      getLivingAppearance:()=>typeface,
      applyLivingAppearance:value=>{typeface={font:value.font,fontScale:value.fontScale,motion:value.motion};typographyHistory.push(typeface);},
      isLivingAppearance:value=>value&&['modern','rounded','cute','clear','classic'].includes(value.font)&&typeof value.fontScale==='number'&&['vivid','gentle','still'].includes(value.motion)},
  };
  const mod={exports:{}};
  const transpiled=ts.transpileModule(read(cloudPath),{fileName:cloudPath,
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const task=(name)=>{if(!(name in mock))throw Error(`unexpected module ${name}`);return mock[name];};
  vm.runInNewContext('(function(require,module,exports){'+transpiled+'\n})',{setTimeout,clearTimeout,Date,JSON},
    {timeout:4000})(task,mod,mod.exports);
  return {api:mod.exports,storage,reads,writes,colorHistory,typographyHistory,
    colors:()=>current,typography:()=>typeface};
}
const ROOT_BRIDGE='src/theme/BloomAppearanceAccountBridge.tsx';
async function main(){
  await check('UID cache hit publishes only saved Garden/Classic, never intermediary Rose',async()=>{
    const t=harness({cache:{'@family-bloom/android/appearance/uid/v2/u1':JSON.stringify(pref())}});
    const promise=t.api.bindAppearanceToUid('u1',Promise.resolve());
    assert.equal(t.api.isAppearanceReadyForUid('u1'),false);
    await promise;
    assert.deepEqual(JSON.parse(JSON.stringify(t.colorHistory)),[{palette:'garden',mode:'light'}]);
    assert.equal(t.typography().font,'classic');
    assert.equal(t.api.getAppearanceHydrationStatus().phase,'ready-local');
    assert.equal(t.api.isAppearanceReadyForUid('u1'),true);
    assert.equal(t.api.isAppearanceReadyForUid('u2'),false);
    assert.equal(t.reads.length,0);assert.equal(t.writes.length,0);
  });
  await check('First-use cloud miss applies defaults only after cache probe, with 0 writes',async()=>{
    const t=harness();await t.api.bindAppearanceToUid('u1',Promise.resolve());
    assert.equal(t.reads.length,1);assert.equal(t.writes.length,0);
    assert.equal(t.api.getAppearanceHydrationStatus().phase,'ready-default');
    assert.equal(t.api.getAppearanceHydrationStatus().source,'default');
  });
  await check('Late response from previous UID never replaces current UID appearance',async()=>{
    let unblock; const wait=new Promise(r=>{unblock=r});
    const t=harness({getItem:async key=>key.endsWith('u1')?wait:JSON.stringify(pref('midnight','rounded'))});
    const a=t.api.bindAppearanceToUid('u1',Promise.resolve());
    const b=t.api.bindAppearanceToUid('u2',Promise.resolve());
    unblock(JSON.stringify(pref('heritage','classic')));
    await Promise.all([a,b]);
    assert.equal(t.colors().palette,'midnight');
    assert.equal(t.typography().font,'rounded');
    assert.equal(t.api.isAppearanceReadyForUid('u1'),false);
    assert.equal(t.api.isAppearanceReadyForUid('u2'),true);
    assert.equal(t.reads.length,0);
  });
  await check('Sign out resets global appearance for unauthenticated login',async()=>{
    const t=harness({cache:{'@family-bloom/android/appearance/uid/v2/u1':JSON.stringify(pref())}});
    await t.api.bindAppearanceToUid('u1',Promise.resolve());
    await t.api.bindAppearanceToUid(null,Promise.resolve());
    assert.equal(t.colors().palette,'rose');
    assert.equal(t.typography().font,'modern');
    assert.equal(t.api.isAppearanceReadyForUid('u1'),false);
  });
  await check('Visual gate uses explicit hydration snapshot and prevents premature signed-in UI',async()=>{
    const s=read(ROOT_BRIDGE);
    assert.match(s,/useSyncExternalStore\(/);
    assert.match(s,/status\.bound/);
    assert.match(s,/isAppearanceReadyForUid\(uid\)/);
    assert.match(s,/if \(!ready\)/);
    assert.match(s,/Đang khôi phục giao diện/);
    const root=read('src/app/_layout.tsx');
    assert.match(root,/<BloomAppearanceAccountBridge>/);
    assert.match(root,/<\/BloomAppearanceAccountBridge>/);
  });
  await check('Cold-start lab disambiguates sandbox reset / legacy marker / same session / real cache',async()=>{
    const s=read('src/app/(internal)/appearance3-lab.tsx');
    for(const str of ["labMode!=='live'",'testVersion:2','LAB_SESSION','Preview LIVE','evaluateColdStart('])assert.ok(s.includes(str),str);
    const pure=read('src/appearance3/coldStartCheck.ts');
    for(const key of ['same-session','fail-mismatch','fail-cache-source','legacy-marker','pass'])assert.ok(pure.includes(key),key);
  });
  await check('Pure cold-start evaluator distinguishes real cache failure from sandbox reset',async()=>{
    const file='src/appearance3/coldStartCheck.ts';
    const out=ts.transpileModule(read(file),{fileName:file,
      compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
    const mod={exports:{}};
    vm.runInNewContext('(function(module,exports){'+out+'\n})',{}, {timeout:4000})(mod,mod.exports);
    const evaluate=mod.exports.evaluateColdStart;
    const marker={...pref(),scale:140,session:'first-session',testMode:'live',testVersion:2};
    const current={palette:'garden',mode:'light',font:'classic',scale:140};
    const ready={bound:true,phase:'ready-local',source:'cache'};
    assert.equal(evaluate(marker,'first-session',current,ready).key,'same-session');
    assert.equal(evaluate(marker,'second-session',current,ready).key,'pass');
    assert.equal(evaluate(marker,'second-session',{...current,scale:100},ready).key,'fail-mismatch');
    assert.equal(evaluate(marker,'second-session',current,{...ready,source:'cloud'}).key,'fail-cache-source');
    assert.equal(evaluate(marker,'second-session',current,{...ready,phase:'reading-local'}).key,'pending');
    assert.equal(evaluate({...marker,testVersion:undefined},'second-session',current,ready).key,'legacy-marker');
  });
  await check('Same APK A/B Lab discloses non-persistent sandbox behavior',async()=>{
    assert.match(read('src/app/(internal)/appearance3-ab-lab.tsx'),/chỉ là SANDBOX/);
  });
  await check('No login, Firestore Rules, or Compiler setting is modified by cold-start patch',async()=>{
    assert.equal(JSON.parse(read('app.json')).expo.experiments.reactCompiler,true);
  });
  console.log(`Appearance cold start: ${passes}/${passes} PASS`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
