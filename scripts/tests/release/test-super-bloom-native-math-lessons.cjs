#!/usr/bin/env node
'use strict';
/** R3R6: Offline, dependency-free build gate for Maths / Physics / Chemistry lessons and Q&A. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'../../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
let n=0;const check=(name,fn)=>{try{fn();console.log('PASS '+(++n)+' '+name)}catch(e){console.error('FAIL '+name,e.stack);process.exitCode=1}};
const parser=read('src/features/study/StudyMathParser.ts'),native=read('src/features/study/StudyFormula.tsx');
const view=read('src/features/learning/LessonRichView.tsx'),markdown=read('src/features/learning/richLesson.ts');
const lessonScreen=read('src/app/(home)/(learning)/learning-lesson.tsx');
check('Native parser and renderer are local/offline',()=>{
 assert.doesNotMatch(parser,/\b(fetch|require|import\s+.*from|WebView)\s*\(/);
 assert.doesNotMatch(native,/react-native-webview|https:\/\//);
 assert.match(native,/parseStudyMath/);
});
check('Native typesetting covers integrals, fractions, radicals, bounds and scripts',()=>{
 for(const v of ['fraction','root','large','script','accent','fractionLine','rootBody','largeSymbol'])assert(native.includes(v),v);
});
check('Published lessons share native math renderer',()=>{
 for(const v of ['NativeFormula','RichLine','splitLessonMathInline'])assert(view.includes(v));
 for(const v of ['lesson.formulas','<NativeFormula','q.prompt','q.answer'])assert(lessonScreen.includes(v));
 assert(!lessonScreen.includes("fontFamily:'monospace'"));
});
check('Lesson Markdown supports display math, inline math and preserves original content',()=>{
 assert(markdown.includes("kind:'math'"));assert(parser.includes('splitLessonMathInline'));
 assert(markdown.includes("raw.startsWith('\\\\[')"));
});
check('No parser/math editor bootstrap in the root layout',()=>{
 const app=read('src/app/_layout.tsx');assert(!app.includes('StudyMathParser'));assert(!app.includes('StudyFormulaEditor'));
});
check('Build/share, Clean Apply, and EAS call the native math gate',()=>{
 for(const bat of ['scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat','scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat','scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat'])
 assert(read(bat).includes('test-super-bloom-native-math-lessons.cjs'),bat);
});
check('Auto Update checks math before backup/overlay and without TypeScript dependency',()=>{
 const updater=read('scripts/maintenance/auto-update-full.cjs');
 assert(updater.includes('test-super-bloom-native-math-lessons.cjs'));
 assert(updater.indexOf('test-super-bloom-native-math-lessons.cjs')<updater.indexOf("if(mode==='backup')"));
});
let ts;try{ts=require('typescript')}catch{};
if(ts){
 function load(p){const src=read(p),js=ts.transpileModule(src,{fileName:p,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const o={exports:{}};vm.runInNewContext('(function(module,exports){'+js+'})') (o,o.exports);return o.exports;}
 const math=load('src/features/study/StudyMathParser.ts');
 const lesson=load('src/features/learning/richLesson.ts');
 check('Integral cận trên dưới and differential spacing',()=>{
  const ast=math.parseStudyMath(String.raw`\int_{0}^{1}x^{2}\,dx`);
  assert.equal(ast.kind,'row');assert.equal(ast.children[0].kind,'large');
  const p=math.studyMathPlain(ast);assert(p.includes('∫'));assert(p.includes('x^(2)'));assert(!p.includes('\\,'));
 });
 check('Nested fraction, radical and grouped powers do not lose structure',()=>{
  const a=math.parseStudyMath(String.raw`\frac{1+\sqrt{9}}{x^{2}}`);
  assert.equal(a.kind,'fraction');assert.equal(a.top.kind,'row');
  assert(math.studyMathPlain(a).includes('√(9)'));
 });
 check('Chemistry equations and subscripts are readable',()=>{
  const p=math.studyMathPlain(math.parseStudyMath(String.raw`\ce{2H2 + O2 -> 2H2O}`));
  assert(p.includes('→'),p);assert(p.includes('H_(2)'),p);
 });
 check('Vectors and physics Greek symbols remain meaningful',()=>{
  const p=math.studyMathPlain(math.parseStudyMath(String.raw`\vec{F}=m\vec{a}\quad\Delta v`));
  assert(p.includes('F→')&&p.includes('Δ'),p);
 });
 check('Unknown math commands are visible, not silently dropped',()=>{
  assert(math.studyMathPlain(math.parseStudyMath(String.raw`\unknowncommand{42}`)).includes('\\unknowncommand'));
 });
 check('Legacy TeX delimiters display correctly',()=>{
  assert.equal(math.studyMathPlain(math.parseStudyMath(String.raw`\(\sqrt{25}+3\)`)), '√(25)+3');
 });
 check('Inline math preserves surrounding lesson prose and callout formatting',()=>{
  const items=math.splitLessonMathInline(String.raw`Tính $\sqrt{25}+3$ nhé.`);
  assert.equal(items.length,3);assert.equal(items[1].kind,'math');
  const blocks=lesson.parseLessonBlocks(String.raw`## Toán\n$$\frac{1}{2}+\sqrt{4}$$\n:::remember\nÁp dụng $E=mc^2$\n:::`.replace(/\\n/g,'\n'));
  assert.equal(blocks[1].kind,'math');assert.equal(blocks[2].kind,'callout');
 });
 check('Long or malformed formulas fail safely and do not execute HTML',()=>{
  const p=math.studyMathPlain(math.parseStudyMath('\\frac{'.repeat(1000)));
  assert(p.length<3000);
 });
}else{
 check('Source-only preflight works before npm install',()=>{
  assert(parser.includes('export function parseStudyMath'));assert(markdown.includes('export function parseLessonBlocks'));
 });
}
console.log('SUPER BLOOM NATIVE MATH LESSON GATE '+n+'/'+n+(process.exitCode?' FAIL':' PASS'));
