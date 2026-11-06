/** Regression for compound ƒx editing, safe before installing node_modules. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),path=require('node:path');
const read=p=>fs.readFileSync(p,'utf8');
const base='src/features/study/';
const data=read(base+'StudyFormulaExpression.ts'),ui=read(base+'StudyFormulaEditor.tsx'),composer=read(base+'StudyComposer.tsx');
const repo=read(base+'studyRepository.ts'),route=read('src/app/(home)/(learning)/study-question-compose.tsx');
let n=0;const check=(name,fn)=>{fn();n++;console.log(`PASS ${n} ${name}`)};
const preflight=()=>{
 check('Compound formula metadata is persisted without changing Firestore collection',()=>assert(repo.includes('formulaParts?:StudyFormulaPart[]')));
 check('Composer passes compound parts to question and answer save',()=>assert(composer.includes("'formulaParts'")&&composer.includes('...extra')));
 check('Editor selects and edits multiple parts instead of replacing the single template',()=>{assert(ui.includes('setParts(v=>[...v.slice(0,position),part,...v.slice(position)])'));assert(ui.includes('parts.map((p,i)'));assert(ui.includes('Dời phải'))});
 check('Native composer remains opt-in and independent of home',()=>assert(composer.includes("import('./StudyFormulaEditor')")&&!route.includes('StudyFormulaEditor')));
 check('Editor has math/physics/chemistry, text and arithmetic buttons',()=>{for(const t of ["'math'","'physics'","'chemistry'",'COMPOUND_OPERATORS','123 / abc'])assert(ui.includes(t))});
 check('No WebView or network calls in pure compound expression model',()=>{const executable=data.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^[ \t]*\/\/[^\n]*/gm,'');assert(!/\bfetch\s*\(|\bWebView\s*[<(]|https?:\/\//.test(executable))});
 check('Old single formula metadata and raw TeX remain readable',()=>assert(data.includes('oldTemplate')&&data.includes('migrateLegacyFormula')&&data.includes('return null')));
 check('Compound input has safety caps, edit/reorder/remove, and no new native dependency',()=>{assert(data.includes('MAX_EXPRESSION_PARTS=32'));assert(data.includes('MAX_COMPOUND_TEX_LENGTH=3000'));assert(ui.includes('moveFormulaPart'));assert(ui.includes('Xóa phần'))});
};
preflight();
let ts;try{ts=require('typescript')}catch{};
if(!ts){console.log('COMPOUND PREFLIGHT '+n+'/'+n+' PASS (source-only before npm install)');process.exit(0)}
const cache={};
function load(relative){if(cache[relative])return cache[relative];
 const p=path.join(base,relative+'.ts');const code=read(p);
 const transformed=ts.transpileModule(code,{fileName:p,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}});
 assert.equal(transformed.diagnostics.length,0,'transpile '+relative);
 const module={exports:{}};cache[relative]=module.exports;
 vm.runInNewContext('(function(require,module,exports){'+transformed.outputText+'})',{}, {timeout:1000})(function(name){if(name.startsWith('./'))return load(name.slice(2));throw Error('Unexpected dependency '+name)},module,module.exports);
 cache[relative]=module.exports;return module.exports;
}
const x=load('StudyFormulaExpression');
check('√25 + 3 compiles into a SINGLE formula block',()=>{
 const parts=[x.templatePart('sqrt',{value:'25'}),x.textPart('+'),x.textPart('3')];
 assert.equal(x.compileFormulaParts(parts,true),String.raw`\sqrt{25}+3`);
});
check('Fraction + √9 - power compile in exact order',()=>{
 const parts=[x.templatePart('fraction',{top:'1',bottom:'2'}),x.textPart('+'),x.templatePart('sqrt',{value:'9'}),x.textPart('-'),x.templatePart('square',{base:'x',power:'2'})];
 assert.equal(x.compileFormulaParts(parts,true),String.raw`\frac{1}{2}+\sqrt{9}-x^{2}`);
});
check('Combined chemical/physics formula fragments remain editable',()=>{
 const ps=[x.templatePart('chemical',{formula:'H2O'}),x.textPart('='),x.templatePart('ohm',{voltage:'12',resistance:'6'})];
 const te=x.compileFormulaParts(ps,true);assert(te.includes('H_{2}O')&&te.includes(String.raw`\frac{12}{6}`));
 const restored=x.compoundFromSaved(te,JSON.parse(JSON.stringify(ps)));assert.equal(x.compileFormulaParts(restored,true),te)
});
check('Editing one existing part preserves its siblings and order',()=>{
 const p=[x.templatePart('sqrt',{value:'25'}),x.textPart('+'),x.textPart('3')];
 const copy=x.compoundFromSaved(x.compileFormulaParts(p),p);
 copy[0].fields.value='36';assert.equal(x.compileFormulaParts(copy,true),String.raw`\sqrt{36}+3`);
 assert.equal(x.compileFormulaParts(p,true),String.raw`\sqrt{25}+3`);
});
check('Reorder moves parts without mutating original',()=>{
 const a=[x.textPart('a'),x.textPart('+'),x.textPart('b')];const b=x.moveFormulaPart(a,2,0);
 assert.equal(x.compileFormulaParts(b),'ba+');assert.equal(x.compileFormulaParts(a,true),'a+b')
});
check('Empty slots or trailing operators cannot be saved',()=>{
 assert.throws(()=>x.compileFormulaParts([x.templatePart('fraction',{top:'1',bottom:''})],true));
 assert.throws(()=>x.compileFormulaParts([x.templatePart('sqrt',{value:'25'}),x.textPart('+')],true));
});
check('Too many segments and oversized TeX fail closed',()=>{
 assert.throws(()=>x.compileFormulaParts(Array.from({length:33},()=>x.textPart('x'))));
 assert.throws(()=>x.compileFormulaParts(Array.from({length:32},()=>x.textPart('a'.repeat(100)))));
});
check('Legacy single saved fraction still opens in its original editable slots',()=>{
 const result=x.compoundFromSaved(String.raw`\frac{3}{4}`,undefined,'fraction',{top:'3',bottom:'4'});
 assert.equal(x.compileFormulaParts(result,true),String.raw`\frac{3}{4}`);
});
check('Advanced legacy TeX is left intact rather than silently altered',()=>{
 assert.equal(x.compoundFromSaved(String.raw`\sin(x)+\cos(x)`),null);
});
check('Mixed symbols use native display-friendly output, not WebView',()=>{
 const text=x.compileFormulaParts([x.textPart('3'),x.textPart('×'),x.textPart('4')],true);
 assert.equal(text,String.raw`3\times 4`);
});
console.log('COMPOUND FORMULA REGRESSION '+n+'/'+n+' PASS');
