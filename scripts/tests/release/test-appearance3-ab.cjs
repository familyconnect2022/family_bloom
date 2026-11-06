#!/usr/bin/env node
'use strict';
/** Family Bloom Appearance 3.0 A/B same-APK checks.
 * Source contract only: never claim optimized JS is verified without a build.
 */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ts=require('typescript');
const root=path.resolve(__dirname,'../../..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const routes=['src/app/(internal)/appearance3-ab-lab.tsx','src/app/(internal)/appearance3-lab.tsx'];
const arms=['src/appearance3/ab/CompiledScenario.tsx','src/appearance3/ab/UncompiledScenario.tsx'];
const files=[...routes,...arms,'src/appearance3/ab/types.ts'];
let count=0;
function check(label,fn){fn();count++;process.stdout.write(`PASS ${String(count).padStart(2,'0')} ${label}\n`)}
for(const filename of files)check(`TS syntax ${filename}`,()=>{
  const code=read(filename);
  const file=ts.createSourceFile(filename,code,ts.ScriptTarget.Latest,true,filename.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.equal(file.parseDiagnostics.length,0,file.parseDiagnostics.map(x=>x.messageText).join('; '));
  const out=ts.transpileModule(code,{fileName:filename,reportDiagnostics:true,compilerOptions:{
    target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
  assert.equal((out.diagnostics||[]).length,0);
});
check('Compiler enabled at Expo project level',()=>{
  assert.equal(JSON.parse(read('app.json')).expo.experiments.reactCompiler,true);
});
check('Function-level directives on ALL equivalent components',()=>{
  const prefixes=['Compiled','Uncompiled'];
  for(let arm=0;arm<2;arm++){
    const file=ts.createSourceFile(arms[arm],read(arms[arm]),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    const functions=file.statements.filter(ts.isFunctionDeclaration);
    assert.equal(functions.length,6);
    for(const fn of functions){
      const body=fn.body;assert.ok(body);
      const first=body.statements[0];
      assert.ok(ts.isExpressionStatement(first)&&ts.isStringLiteral(first.expression),fn.name?.text);
      assert.equal(first.expression.text,arm===0?'use memo':'use no memo',fn.name?.text);
    }
    for(const primitive of ['Text','Card','Button','Input','Modal','Scenario']){
      assert.ok(functions.some(fn=>fn.name?.text===prefixes[arm]+primitive),primitive);
    }
  }
});
check('ON/OFF implementations are source-identical except directives/names',()=>{
  const canon=s=>s.replace(/Uncompiled/g,'Variant').replace(/Compiled/g,'Variant')
    .replace(/'use no memo'/g,"'use memo'")
    .replace(/off\./g,'on.').replace(/'off'/g,"'on'").replace(/Compiler OFF/g,'Compiler ON');
  assert.equal(canon(read(arms[0])),canon(read(arms[1])));
});
check('Both variants used exclusively in same APK Lab',()=>{
  const code=read(routes[0]);
  assert.match(code,/import \{ CompiledScenario \}/);
  assert.match(code,/import \{ UncompiledScenario \}/);
  assert.match(code,/<CompiledScenario\b/);
  assert.match(code,/<UncompiledScenario\b/);
  assert.match(code,/isVerifiedDeveloperAccount\(user\)/);
  assert.match(read(routes[1]),/appearance3-ab-lab/);
});
check('A/B benchmark: 100 measured steps per arm and balanced ABBA ordering',()=>{
  const t=read('src/appearance3/ab/types.ts');
  assert.match(t,/MEASURED_PER_ROUND = 50/);
  assert.match(t,/WARMUP_STEPS = 8/);
  assert.match(t,/\['on','off','off','on'\]/);
  assert.match(read(routes[0]),/MEASURED_PER_ROUND\*2/);
});
check('Benchmark includes cancellation and no persistent timers or Metro logs',()=>{
  const s=read(routes[0])+arms.map(read).join('\n');
  assert.doesNotMatch(s,/console\.(log|debug|info)\(/);
  assert.doesNotMatch(s,/setInterval\s*\(/);
  assert.match(s,/cancelAnimationFrame\(/);
  assert.match(s,/useEffect\(\(\)=>\(\)=>/);
});
check('Comparison does not write Firebase or reveal personal identifiers',()=>{
  const s=read(routes[0])+arms.map(read).join('\n');
  for(const disallowed of ['appearanceUserEdited','setDoc(', 'updateDoc(', 'getDoc(', 'onSnapshot(', 'user.uid','user.email']){
    assert.ok(!s.includes(disallowed),disallowed);
  }
  assert.match(s,/cloudAppearanceDelta/);
});
check('Report distinguishes source directives from compiler transform verification',()=>{
  const s=read(routes[0]);
  assert.match(s,/compilerTransformVerifiedInThisEnvironment:false/);
  assert.match(s,/nativeFPS:false/);
  assert.match(s,/JS update scheduled -> React useLayoutEffect/);
});
check('A/B route navigation and original lab protected',()=>{
  const s=read(routes[0]);
  assert.match(s,/isPerformanceTestAccount\(user\?\.email\)/);
  assert.match(s,/Chỉ tài khoản developer/);
});
check('Synthetic metric calculation yields stable P50/P95',()=>{
  const filename='src/appearance3/ab/types.ts';
  const code=ts.transpileModule(read(filename),{fileName:filename,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const vm=require('node:vm');
  const mod={exports:{}};
  vm.runInNewContext(`(function(module,exports){${code}\n})`,{})(mod,mod.exports);
  const actual=JSON.parse(JSON.stringify(mod.exports.metric([8,4,20,10])));
  assert.deepEqual(actual,{count:4,meanMs:10.5,p50Ms:8,p95Ms:20,maxMs:20});
  assert.equal(mod.exports.metric([]).meanMs,null);
});
console.log(`Appearance 3.0 Same APK A/B: ${count}/${count} PASS`);
