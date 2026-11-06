/** Pure regression for lightweight editable native formula templates; no npm install required in preflight. */
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const src=read('src/features/study/StudyFormulaTemplates.ts');
const ui=read('src/features/study/StudyFormulaEditor.tsx');
const composer=read('src/features/study/StudyComposer.tsx');
const model=read('src/features/study/studyRepository.ts');
// Read executable source, not prose comments: the template catalog intentionally
// documents that it does not use WebView, which must NOT trigger a FAIL.
// Keep this gate dependency-free; it runs before npm install on Windows.
const executableOnly = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^[ \t]*\/\/[^\r\n]*/gm, '');
const hasRuntimeDependency = (text) => {
  // The pure local chemistry tokenizer is allowed; unsafe imports/remote calls remain blocked.
  const code = executableOnly(text).replace(/^\s*import\s+\{[^\n}]*\}\s+from\s+['"]\.\/StudyChemistry['"];?\s*$/gm,'');
  return /(?:^|\n)\s*import\s*(?:[({*]|[\w$])|(?:^|\n)\s*export\s+.*\s+from\s*['"]|\brequire\s*\(|\bfetch\s*\(|\bnew\s+WebView\b|\bReact\s*\.\s*createElement\b|\bWebView\s*[(<]|https?:\/\/[\w]/m.test(code);
};
let passed=0;const check=(name,fn)=>{fn();passed++;console.log(`PASS ${passed} ${name}`)};
// Self-test the safety gate: commentary may mention dependencies without
// introducing them, but actual imports/network calls must still be rejected.
check('Preflight ignores comments and detects actual runtime dependencies',()=>{
  assert.equal(hasRuntimeDependency('/* no React or WebView involved; https://example.com */\nexport const pure=1;'),false);
  assert.equal(hasRuntimeDependency("import WebView from 'react-native-webview';"),true);
  assert.equal(hasRuntimeDependency("import React from 'react';"),true);
  assert.equal(hasRuntimeDependency("const remote=fetch('https://example.com')"),true);
});
let ts;
try{ts=require('typescript')}catch{};
if(!ts){
 // Source-only safety preflight works even before npm install in Windows.
 check('Templates have no React, WebView or remote dependency',()=>assert.equal(hasRuntimeDependency(src),false));
 check('Native slot editor imported lazily',()=>{assert(composer.includes("import('./StudyFormulaEditor')"));assert(!composer.includes("import {FormulaEditor"));});
 check('Editable formula metadata persists',()=>{assert(model.includes('formulaTemplate?:string'));assert(model.includes('formulaFields?:Record<string,string>'));});
 check('Fraction direct top/bottom slots exist',()=>{assert(src.includes("slot('top','Tử số'"));assert(src.includes("slot('bottom','Mẫu số'"));assert(ui.includes('s.fractionBar'));});
 check('UI supports three subjects',()=>{for(const a of ['math','physics','chemistry'])assert(ui.includes(a));});
} else {
 const compiled=ts.transpileModule(src,{fileName:'StudyFormulaTemplates.ts',compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
 const module={exports:{}};
 const chemCode=ts.transpileModule(read('src/features/study/StudyChemistry.ts'),{fileName:'StudyChemistry.ts',compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
 const chemModule={exports:{}};vm.runInNewContext('(function(require,module,exports){'+chemCode+'})')(null,chemModule,chemModule.exports);
 vm.runInNewContext('(function(require,module,exports){'+compiled+'})')(name=>{if(name==='./StudyChemistry')return chemModule.exports;throw Error('Unapproved dependency '+name)},module,module.exports);
 const f=module.exports;
 check('At least 30 editable visual formula templates',()=>assert(f.VISUAL_FORMULA_TEMPLATES.length>=30));
 check('Fraction numerator and denominator retain positions',()=>assert.equal(f.compileVisualFormula('fraction',{top:'17',bottom:'29'}),String.raw`\frac{17}{29}`));
 check('Fraction slots preserve the intended labels',()=>assert.deepEqual(Array.from(f.findVisualTemplate('fraction').slots).map(x=>x.label),['Tử số','Mẫu số']));
 check('Power and radical render correct structured TeX',()=>{assert.equal(f.compileVisualFormula('square',{base:'x',power:'3'}),'x^{3}');assert.equal(f.compileVisualFormula('sqrt',{value:'16'}),String.raw`\sqrt{16}`);});
 check('Physics formulas contain correct fractions',()=>{assert.equal(f.compileVisualFormula('ohm',{voltage:'12',resistance:'6'}),String.raw`I=\frac{12}{6}`);});
 check('Chemical formula accepts subscripts',()=>{assert.equal(f.compileVisualFormula('chemical',{formula:'H2SO4'}),String.raw`\mathrm{H_{2}SO_{4}}`);});
 check('Editable formula data does not inject nested TeX commands',()=>{assert(!f.compileVisualFormula('fraction',{top:String.raw`\evil{42}`,bottom:'3'}).includes('\\evil'));});
 check('All templates have unique ID',()=>assert.equal(new Set(f.VISUAL_FORMULA_TEMPLATES.map(x=>x.id)).size,f.VISUAL_FORMULA_TEMPLATES.length));
 check('Templates span maths, physics and chemistry',()=>{for(const group of ['math','physics','chemistry'])assert(f.VISUAL_FORMULA_TEMPLATES.filter(x=>x.group===group).length>=7)});
 check('Template fields are not reused between invocations',()=>{let a=f.sampleFields(f.findVisualTemplate('fraction'));a.top='99';let b=f.sampleFields(f.findVisualTemplate('fraction'));assert.equal(b.top,'');});
 check('Legacy saved fraction reopens in structured slots',()=>{const old=f.migrateLegacyFormula(String.raw`\frac{3}{7}`);assert.equal(old.id,'fraction');assert.equal(old.fields.top,'3');assert.equal(old.fields.bottom,'7');});
 check('High value formulas have no WebView',()=>{assert.equal(hasRuntimeDependency(src),false);assert(!/\bimport\s+.*WebView/.test(executableOnly(ui)));});
 check('Composer lazy loads only while entering formula',()=>assert(composer.includes("import('./StudyFormulaEditor')")));
 check('Composer persists structured editable fields with TeX',()=>{assert(composer.includes('formulaTemplate'));assert(composer.includes('formulaFields'));assert(composer.includes('initialBlock='));});
 check('Rules accept original blocks without migration',()=>{assert(model.includes('formulaTemplate?:string'));assert(model.includes('formulaFields?:Record<string,string>'));for(const p of ['firestore.rules','firestore.cloud.rules'])assert(read(p).includes('validStudyBlocks(blocks)'));});
}
console.log(`VISUAL FORMULA TEST ${passed}/${passed} PASS`);
