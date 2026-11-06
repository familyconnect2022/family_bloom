/** R3R9: inline continuation after a math formula and non-blank partial preview.
 * Runs without npm dependencies for Auto Update; dynamic logic when TS is present. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),path=require('node:path');
const root=process.cwd(),p='src/features/study/';
const read=(name)=>fs.readFileSync(path.join(root,p,name),'utf8');
const editor=read('StudyFormulaEditor.tsx'),expr=read('StudyFormulaExpression.ts');
let checked=0;
const test=(label,run)=>{run();checked++;console.log('PASS R3R9 '+checked+' '+label)};
test('Inline suffix is bound to template fields; no extra mode selection or button',()=>{
 assert(editor.includes('active.fields?.[FORMULA_FOLLOW_FIELD]'));
 assert(editor.includes('change(FORMULA_FOLLOW_FIELD,v)'));
 assert(!editor.includes('setExtraMode')&&!editor.includes('appendExtra'));
});
test('Suffix is visually secondary and dashed',()=>{
 assert(editor.includes("borderStyle:'dashed'"));
 assert(editor.includes('Viết thêm sau công thức (tùy chọn)'));
});
test('Preview uses compound compilation and does not erase saved formula parts',()=>{
 assert(editor.includes('compileFormulaParts(parts)'));
 assert(expr.includes('compoundFromSaved'));
 assert(expr.includes('FORMULA_FOLLOW_FIELD'));
});
test('Incomplete chemical templates are guarded for non-strict preview, strict save fails',()=>{
 assert(expr.includes('if(strict)throw e;'));
 assert(expr.includes('formula=String.raw`\\square`'));
});
let ts;try{ts=require('typescript')}catch{}
if(ts){
 const cache={};
 function load(name){if(cache[name])return cache[name].exports;
  const code=read(name+'.ts'),res=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},reportDiagnostics:true});
  assert.equal(res.diagnostics.length,0);
  const m={exports:{}};cache[name]=m;
  vm.runInNewContext('(function(require,module,exports){'+res.outputText+'})',{}, {timeout:1000})(id=>{if(!id.startsWith('./'))throw Error('Unexpected '+id);return load(id.slice(2));},m,m.exports);
  return m.exports;
 }
 const mod=load('StudyFormulaExpression');
 test('One fraction + O2 field compiles to correctly typeset O subscript',()=>{
  assert.equal(mod.compileFormulaParts([mod.templatePart('fraction',{top:'1',bottom:'2',__after:'O2'})],true),String.raw`\frac{1}{2}\,\mathrm{O_{2}}`);
 });
 test('H2O and CO2 after math root are converted consistently',()=>{
  for(const input of ['H2O','CO2']){
   const r=mod.compileFormulaParts([mod.templatePart('sqrt',{value:'25',__after:input})],true);
   assert(r.includes(String.raw`\mathrm{`));assert(r.includes('_{2}'));
  }
 });
 test('Ordinary text remains literal and is never guessed into chemistry',()=>{
  assert.equal(mod.formatFormulaFollow('x + 1').kind,'plain');
  assert.equal(mod.formatFormulaFollow('Co').kind,'plain');
 });
 test('Ambiguous 02 and Ca2+ are flagged and preserved exactly',()=>{
  for(const input of ['02','Ca2+']){
   const x=mod.formatFormulaFollow(input);assert.equal(x.kind,'uncertain');assert(x.tex.endsWith(input));
  }
 });
 test('Saving and reopening preserves suffix slots, TeX, and structure',()=>{
  const before=[mod.templatePart('fraction',{top:'1',bottom:'2',__after:'O2'}),mod.textPart('+'),mod.templatePart('sqrt',{value:'9'})];
  const tex=mod.compileFormulaParts(before,true);
  const revived=mod.compoundFromSaved(tex,JSON.parse(JSON.stringify(before)));
  assert.equal(revived[0].fields.__after,'O2');assert.equal(mod.compileFormulaParts(revived,true),tex);
 });
 test('Incomplete reaction preserves preview and rejects invalid save',()=>{
  const broken=[mod.templatePart('reaction',{left:'H2 +',right:'H2O'}),mod.textPart('+'),mod.templatePart('fraction',{top:'1',bottom:'2',__after:'O2'})];
  const tex=mod.compileFormulaParts(broken,false);
  assert(tex.startsWith(String.raw`\square`));assert(tex.includes(String.raw`\frac{1}{2}`));
  assert.throws(()=>mod.compileFormulaParts(broken,true));
 });
 test('Existing legacy fraction output is byte-for-byte unchanged',()=>{
  assert.equal(mod.compileFormulaParts([mod.templatePart('fraction',{top:'1',bottom:'2'})],true),String.raw`\frac{1}{2}`);
 });
}
console.log('SUPER BLOOM INLINE FOLLOW GATE '+checked+'/'+checked+' PASS'+(ts?' (dynamic + static)':' (preflight without TypeScript)'));
