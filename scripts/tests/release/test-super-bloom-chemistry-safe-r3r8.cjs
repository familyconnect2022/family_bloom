/** R3R8 chemistry acceptance tests: standalone (no npm needed for source-only preflight). */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');let tests=0;
const test=(message,fn)=>{fn();console.log('PASS '+(++tests)+' '+message)};
const chemSrc=read('src/features/study/StudyChemistry.ts');
const tplSrc=read('src/features/study/StudyFormulaTemplates.ts');
const expressionSrc=read('src/features/study/StudyFormulaExpression.ts');
const editorSrc=read('src/features/study/StudyFormulaEditor.tsx');
const modelSrc=read('src/features/study/studyRepository.ts');
test('Chemistry uses periodic-table element validation and bounded parsing',()=>{
 assert(chemSrc.includes('ELEMENTS'));assert(chemSrc.includes('MAX_CHEM_LENGTH'));assert(chemSrc.includes('readGroup'));assert(chemSrc.includes('parseChemicalSpecies'));
});
test('Unambiguous chemistry follows fraction automatically, ordinary prose remains untouched',()=>{
 assert(editorSrc.includes('FORMULA_FOLLOW_FIELD'));assert(editorSrc.includes('Viết thêm sau công thức'));
 assert(!editorSrc.includes('setExtraMode'));
 assert(expressionSrc.includes('formatFormulaFollow'));assert(expressionSrc.includes("part.syntax==='chemistry'"));
 assert(modelSrc.includes("syntax?:'plain'|'chemistry'"));
});
test('Inline optional suffix uses low-emphasis dashed input and warning without discarding typed text',()=>{
 assert(editorSrc.includes("borderStyle:'dashed'"));assert(editorSrc.includes('active.fields?.[FORMULA_FOLLOW_FIELD]'));
 assert(editorSrc.includes('follow.note'));assert(editorSrc.includes('extraWarning'));
});
test('No extra WebView, root listener, remote chemistry dependency',()=>{
 for(const text of [chemSrc,expressionSrc,tplSrc]){
  const code=text.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/[^\n]*/gm,'');
  assert(!/\bfetch\s*\(|\bWebView\b\s*[<(]|https?:\/\//.test(code));
 }
});
test('Native compiler retains source and editability',()=>{
 assert(expressionSrc.includes('compileFormulaParts'));assert(expressionSrc.includes('compoundFromSaved'));assert(expressionSrc.includes('textPart(part.value||\'\''));
});
let ts;try{ts=require('typescript')}catch{}
if(ts){
 const cache={};const base='src/features/study/';
 const load=(file)=>{
  if(cache[file])return cache[file].exports;
  const text=read(base+file+'.ts');const result=ts.transpileModule(text,{fileName:file+'.ts',reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}});
  assert.equal(result.diagnostics.length,0,'typescript '+file);
  const module={exports:{}};cache[file]=module;
  const fn=vm.runInNewContext('(function(require,module,exports){'+result.outputText+'})',{}, {timeout:1000});
  fn(name=>{if(name.startsWith('./'))return load(name.slice(2));throw Error('Unexpected external module '+name)},module,module.exports);
  return module.exports;
 };
 const c=load('StudyChemistry'),e=load('StudyFormulaExpression'),t=load('StudyFormulaTemplates');
 test('Case-sensitive chemical elements are distinct: CO versus Co',()=>{
  assert.deepEqual({...c.parseChemicalSpecies('CO').atoms},{C:1,O:1});
  assert.deepEqual({...c.parseChemicalSpecies('Co').atoms},{Co:1});
 });
 test('Subscripts, bracket groups, coefficients and physical states compile accurately',()=>{
  assert.equal(c.parseChemicalSpecies('H2O').tex,String.raw`\mathrm{H_{2}O}`);
  assert.equal(c.parseChemicalSpecies('Fe2(SO4)3').atoms.O,12);
  assert.equal(c.parseChemicalSpecies('2H2O').atoms.H,4);
  assert.equal(c.parseChemicalSpecies('H2O(aq)').ok,true);
 });
 test('Fractional coefficient with O2 works both in species and after math fraction',()=>{
  assert.equal(c.parseChemicalSpecies('1/2 O2').tex,String.raw`\frac{1}{2}\,\mathrm{O_{2}}`);
  const parts=[e.templatePart('fraction',{top:'1',bottom:'2'}),e.textPart('O2','chemistry')];
  assert.equal(e.compileFormulaParts(parts,true),String.raw`\frac{1}{2}\,\mathrm{O_{2}}`);
 });
 test('Charge notation is explicit; ambiguous Ca2+ and invalid 02 are rejected',()=>{
  assert(!c.parseChemicalSpecies('Ca2+').ok);assert(!c.parseChemicalSpecies('02').ok);
  assert.equal(c.parseChemicalSpecies('Ca^2+').tex,String.raw`\mathrm{Ca}^{2+}`);
  assert.equal(c.parseChemicalSpecies('Cl^-').ok,true);
 });
 test('Reject invalid elements, unbalanced parentheses and invalid zero indices',()=>{
  for(const bad of ['Xx2','H0O','H02','Fe2(SO4','Fe2(SO4))3','O_2','0H2','H2..O'])assert(!c.parseChemicalSpecies(bad).ok,bad);
 });
 test('Balanced reaction is recognized, unbalanced reaction warns but does not block question',()=>{
  assert.deepEqual([...c.parseChemicalEquation('2H2 + O2 -> 2H2O').warnings],[]);
  const r=c.parseChemicalEquation('H2 + O2 -> H2O');assert(r.ok&&r.warnings.length);
  assert(c.parseChemicalEquation('Na^+ + Cl^- -> NaCl').ok);
 });
 test('Reaction requires both sides and valid separators',()=>{
  for(const bad of ['H2 + -> H2O','H2 + O2','H2 ->','-> H2','H2 + O2 -> H2O -> O2'])assert(!c.parseChemicalEquation(bad).ok,bad);
 });
 test('Chemical isotope atomic number is checked against actual element',()=>{
  assert(c.compileChemicalIsotope('C','14','6').ok);
  assert(!c.compileChemicalIsotope('C','14','8').ok);
  assert(!c.compileChemicalIsotope('Xx','14','6').ok);
 });
 test('Chemical visual template uses validated symbols, reaction and ion',()=>{
  assert.equal(t.compileVisualFormula('chemical',{formula:'H2SO4'}),String.raw`\mathrm{H_{2}SO_{4}}`);
  assert(t.compileVisualFormula('reaction',{left:'H2 + 1/2 O2',right:'H2O'}).includes(String.raw`\frac{1}{2}`));
  assert.equal(t.compileVisualFormula('ion',{formula:'Ca',charge:'2+'}),String.raw`\mathrm{Ca}^{2+}`);
  assert.throws(()=>t.compileVisualFormula('chemical',{formula:'02'}));
 });
 test('Saved chemical segment preserves mode; plain text is never automatically converted',()=>{
  const mixed=[e.templatePart('sqrt',{value:'25'}),e.textPart('O2','chemistry')];
  const serialized=JSON.parse(JSON.stringify(mixed));const restored=e.compoundFromSaved(e.compileFormulaParts(mixed,true),serialized);
  assert.equal(restored[1].syntax,'chemistry');assert(e.compileFormulaParts(restored,true).includes('O_{2}'));
  assert.equal(e.compileFormulaParts([e.textPart('O2')],true),'O2');
 });
 test('Rejected chemistry cannot be saved silently; input source remains unchanged',()=>{
  const p=e.textPart('Ca2+','chemistry');assert.throws(()=>e.compileFormulaParts([p],true));assert.equal(p.value,'Ca2+');
 });
}
console.log(`SUPER BLOOM CHEMISTRY GATE ${tests}/${tests} PASS${ts?' (dynamic + static)':' (source-only before npm install)'}`);
