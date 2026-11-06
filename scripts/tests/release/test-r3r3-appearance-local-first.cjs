/** Deterministic offline mock of appearance source. No Firebase credentials. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {stripTypeScriptTypes} = require('node:module');
const root = path.resolve(__dirname, '../../..');
const memory = new Map();
let readCount = 0;
let writeCount = 0;
let remoteValue = null;
let renderWriteCount = 0;
const firebase = {
  doc: (_db, key) => key,
  getFirestore: () => ({}),
  getDocFromServer: async () => {
    readCount++;
    return { exists: () => !!remoteValue, data: () => remoteValue };
  },
  setDoc: async (_ref, payload) => {
    writeCount++;
    remoteValue = payload;
  },
};
const storage = {
  getItem: async key => memory.get(key) ?? null,
  setItem: async (key, val) => { memory.set(key, val); },
  multiSet: async pairs => pairs.forEach(([k,v]) => memory.set(k, v)),
};
const cache = new Map();
function load(rel) {
  const absolute = path.resolve(root, rel);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const source = fs.readFileSync(absolute,'utf8');
  const exported = [...source.matchAll(/^export (?:async )?(?:const|function|class|let) ([A-Za-z_$][\w$]*)/gm)].map(m=>m[1]);
  let code=stripTypeScriptTypes(source,{mode:'transform',sourceUrl:absolute});
  code=code.replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm, (_m,n,id)=>`const ${n}=require('${id}').default;`);
  code=code.replace(/^import \{([^}]+)\} from ['"]([^'"]+)['"];?$/gm, (_m,n,id)=>`const {${n}}=require('${id}');`);
  code=code.replace(/^export (?=(?:async )?(?:const|function|class|let) )/gm,'');
  assert(!/^\s*(?:import|export)\b/m.test(code),'unexpected module syntax '+absolute);
  code += `\nObject.assign(module.exports,{${exported.join(',')}});\n`;
  const mod={exports:{}};cache.set(absolute,mod);
  const localRequire = id => {
    if (id==='@react-native-async-storage/async-storage') return {default:storage, ...storage};
    if (id==='@react-native-firebase/firestore') return firebase;
    if (id==='../services/firebase/firestorePaths') return {FIRESTORE_PATHS:{userAppearance:u=>'users/'+u+'/preferences/appearance'}};
    if (id.startsWith('.')) return load(path.relative(root,path.resolve(path.dirname(absolute),id))+'.ts');
    throw Error('Unexpected dependency '+id);
  };
  require('node:vm').runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:absolute})(localRequire,mod,mod.exports);
  return mod.exports;
}
async function main() {
  const runtime=load('src/theme/runtime.ts');
  const living=load('src/theme/livingAppearance.ts');
  const sync=load('src/theme/appearanceCloudSync.ts');
  const init={palette:'garden',mode:'light',font:'modern',fontScale:100,motion:'gentle',schemaVersion:2,updatedAt:'2026-11-01T00:00:00.000Z'};
  memory.set(sync.APPEARANCE_USER_STORAGE+'uidA',JSON.stringify(init));
  await sync.bindAppearanceToUid('uidA',Promise.resolve());
  assert.equal(runtime.getBloomSelection().palette,'garden');
  assert.equal(readCount,0); assert.equal(writeCount,0);
  // Repeated renders/read-only lookups never write.
  for(let i=0;i<200;i++) {runtime.getBloomActiveColors();living.getLivingAppearance();}
  assert.equal(writeCount,renderWriteCount);
  // One change plus repeated rapid edits -> one logical cloud write.
  assert.equal(runtime.updateBloomPalette('rose'),true);sync.appearanceUserEdited();
  assert.equal(runtime.updateBloomPalette('heritage'),true);sync.appearanceUserEdited();
  assert.equal(runtime.updateBloomPalette('rose'),true);sync.appearanceUserEdited();
  await new Promise(r=>setTimeout(r,1000));
  assert.equal(writeCount,1,'only final user edit should write');
  assert.equal(remoteValue.palette,'rose');
  assert.equal(JSON.parse(memory.get(sync.APPEARANCE_USER_STORAGE+'uidA')).pendingSync,undefined);
  // No-op change cannot generate Firebase writes.
  assert.equal(runtime.updateBloomPalette('rose'),false);
  await new Promise(r=>setTimeout(r,900));assert.equal(writeCount,1);
  // New UID without local cache reads only, doesn't create document.
  remoteValue={...init,palette:'midnight'};
  await sync.bindAppearanceToUid('uidB',Promise.resolve());
  assert.equal(readCount,1);assert.equal(writeCount,1);
  assert.equal(runtime.getBloomSelection().palette,'midnight');
  // Cache hit after switching back -> zero further reads and zero writes.
  await sync.bindAppearanceToUid('uidA',Promise.resolve());
  assert.equal(readCount,1);assert.equal(writeCount,1);
  assert.equal(runtime.getBloomSelection().palette,'rose');
  // Font subscribers are isolated from motion-only changes.
  let typographySignals=0;let motionSignals=0;
  const stopFont=living.subscribeLivingTypography(()=>typographySignals++);
  const stopMotion=living.subscribeLivingMotion(()=>motionSignals++);
  living.applyLivingAppearance({...living.getLivingAppearance(),motion:'still'});
  assert.equal(typographySignals,0);assert.equal(motionSignals,1);
  living.applyLivingAppearance({...living.getLivingAppearance(),fontScale:130});
  assert.equal(typographySignals,1);assert.equal(motionSignals,1);
  stopFont();stopMotion();
  // Public screen resets identity-scoped theme without reading/writing cloud.
  await sync.bindAppearanceToUid(null,Promise.resolve());
  assert.equal(runtime.getBloomSelection().palette,'rose');
  assert.equal(writeCount,1);assert.equal(readCount,1);
  const code=fs.readFileSync(path.join(root,'src/theme/BloomThemeProvider.tsx'),'utf8');
  assert(!code.includes('BloomRenderRevisionContext.Provider'),'no root context revision broadcast');
  assert(!fs.readFileSync(path.join(root,'src/theme/appearanceCloudSync.ts'),'utf8').includes('onSnapshot('),'no live cloud subscription');
  console.log('PASS appearance local-first: cached UID 0 reads/0 writes, edit burst 1 write, no-op 0, new UID 1 read/0 write, account isolation, separated typography');
}
main().catch(e=>{ console.error(e);process.exitCode=1; });
