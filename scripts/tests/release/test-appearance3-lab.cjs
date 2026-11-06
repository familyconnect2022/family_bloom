#!/usr/bin/env node
'use strict';
/** Appearance 3.0 Lab contract + pure runtime smoke. No Firebase/network. */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const ts=require('typescript');
const root=path.resolve(__dirname,'../../..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
let checks=0;
function test(label,fn){fn();checks++;process.stdout.write(`PASS ${String(checks).padStart(2,'0')} ${label}\n`);}
const lab='src/app/(internal)/appearance3-lab.tsx';
const targets=['src/appearance3/useAppearance3.ts','src/appearance3/labComponents.tsx',lab,'src/theme/appearanceCloudSync.ts','src/app/(internal)/developer-tools.tsx'];
for(const file of targets){test(`TypeScript syntax ${file}`,()=>{
  const source=read(file);const node=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.equal(node.parseDiagnostics.length,0);
  const output=ts.transpileModule(source,{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
  assert.equal((output.diagnostics||[]).length,0);
});}
test('Compiler flag is an explicit boolean for controlled A/B',()=>assert.equal(typeof JSON.parse(read('app.json')).expo.experiments.reactCompiler,'boolean'));
test('Dev link exists and requires internal tools',()=>{
  assert.match(read('src/app/(internal)/developer-tools.tsx'),/appearance3-lab/);
  assert.match(read(lab),/isVerifiedDeveloperAccount\(user\)/);
});
test('Lab is sandbox by default and has explicit live mode',()=>{
  assert.match(read(lab),/useState<LabMode>\('sandbox'\)/);
  assert.match(read(lab),/labMode==='sandbox'/);
  assert.match(read(lab),/appearanceUserEdited\(\)/);
});
test('Lab includes Input Modal Button Card Text',()=>{
  for(const name of ['A3Text','A3Card','A3Button','A3Input','A3Modal'])assert.match(read(lab),new RegExp(`<${name}\\b`));
});
test('No legacy Proxy or typography WeakSet in new primitives',()=>{
  const content=read('src/appearance3/labComponents.tsx')+'\n'+read('src/appearance3/useAppearance3.ts');
  for(const string of ['createBloomStyles(', 'new Proxy(', 'WeakSet(', 'getBloomActiveColors(', 'COLORS.'])assert.equal(content.includes(string),false,string);
});
test('Explicit reactive snapshots and stable typography snapshot',()=>{
  assert.match(read('src/appearance3/useAppearance3.ts'),/useSyncExternalStore\(subscribeBloomTheme, getBloomThemeSnapshot, getBloomThemeSnapshot\)/);
  assert.match(read('src/appearance3/useAppearance3.ts'),/useSyncExternalStore\(subscribeLivingTypography, getTypographySnapshot, getTypographySnapshot\)/);
});
test('No Metro test logs or background performance ticker',()=>{
  const content=read(lab)+read('src/appearance3/labComponents.tsx');
  assert.doesNotMatch(content,/console\.(?:log|debug|info)\(/);
  assert.doesNotMatch(content,/setInterval\(/);
});
test('Cold-start marker and hydration source visible',()=>{
  assert.match(read(lab),/TEST_MARKER_PREFIX/);
  assert.match(read(lab),/hydrate\.phase/);
});
test('Hydration instrumentation never touches auth or writes',()=>{
  const content=read('src/theme/appearanceCloudSync.ts');
  for(const phase of ['reading-local','reading-cloud','ready-local','ready-cloud','ready-default','offline-default'])assert.ok(content.includes(phase),phase);
  assert.match(content,/getAppearanceHydrationStatus/);
  assert.match(content,/subscribeAppearanceHydration/);
});
test('Appearance benchmarks disclose JS-only metrics',()=>{
  const content=read(lab);assert.match(content,/Profiler/);assert.match(content,/p95RenderMs/);assert.match(content,/không phải FPS/);
});
// Pure runtime smoke: use a mocked React hook runtime to check snapshot stability
// and font scaling; no React Native modules are loaded.
test('Pure A3 token smoke: unchanged typography preserves object identity',()=>{
  const filename='src/appearance3/useAppearance3.ts';
  const code=ts.transpileModule(read(filename),{fileName:filename,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  let appearance={font:'modern',fontScale:100,motion:'gentle'};
  const colors={primary:'#39765A',card:'#FFFFFF',border:'#D7E6DA'};
  const theme={selection:{palette:'garden',mode:'light'},colors,resolvedMode:'light',revision:1};
  const mocks={
    'react':{useMemo:(fn)=>fn(),useSyncExternalStore:(_subscribe,read)=>read()},
    '../theme/runtime':{getBloomThemeSnapshot:()=>theme,subscribeBloomTheme:()=>()=>{}},
    '../theme/livingAppearance':{getLivingAppearance:()=>appearance,subscribeLivingTypography:()=>()=>{}},
    '../theme/palette':{getBloomColors:(p)=>({...colors,primary:p==='rose'?'#AC4D76':'#39765A'})},
  };
  const mod={exports:{}};
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`,{})(name=>{
    if(!Object.prototype.hasOwnProperty.call(mocks,name))throw Error(`unexpected import: ${name}`);return mocks[name];
  },mod,mod.exports);
  const api=mod.exports;
  const a=api.useA3Typography(),b=api.useA3Typography();
  assert.equal(a,b);
  const t100=api.useA3Tokens();
  assert.equal(t100.sizes.body,16);
  appearance={font:'rounded',fontScale:140,motion:'gentle'};
  const c=api.useA3Typography();
  assert.notEqual(a,c);
  const t140=api.useA3Tokens();
  assert.equal(t140.sizes.body,22.4);
  assert.equal(t140.typography.font,'rounded');
  appearance={...appearance,motion:'still'};
  assert.equal(api.useA3Typography(),c,'motion-only must not change typography snapshot');
});
console.log(`Appearance 3.0 Lab: ${checks}/${checks} PASS`);
