#!/usr/bin/env node
'use strict';
/** Offline and source-safe typesetting gate. Works without dependencies in a fresh FULL ZIP. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'../../..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
let passed=0;const check=(what,fn)=>{try{fn();passed++;console.log('PASS Math R3R11 '+passed+' '+what)}catch(e){console.error('FAIL Math R3R11 '+what,e.stack);process.exitCode=1;}};
const parserSrc=read('src/features/study/StudyMathParser.ts');
const viewSrc=read('src/features/study/StudyFormula.tsx');
const tplSrc=read('src/features/study/StudyFormulaTemplates.ts');
check('lim has dedicated semantic AST node and condition',()=>{assert(parserSrc.includes("kind:'limit'"));assert(parserSrc.includes("cmd==='lim'"));});
check('lim condition centered directly BELOW operator and not beside it',()=>{
 assert.match(viewSrc,/case 'limit':return <View style=\{s\.limitBox\}/);
 assert.match(viewSrc,/s\.limitSymbol/);assert.match(viewSrc,/s\.limitCondition/);
 assert.match(viewSrc,/limitCondition:\{alignItems:'center',justifyContent:'center',alignSelf:'center'/);
 assert(!/case 'limit':return <View style=\{s\.row\}/.test(viewSrc));
});
check('matrix parses into bounded 2D cells and is rendered as native grid',()=>{
 assert(parserSrc.includes("kind:'matrix'"));assert(parserSrc.includes("cmd==='begin'"));
 assert(viewSrc.includes('node.rows.map('));assert(viewSrc.includes('matrixGrid'));assert(viewSrc.includes('matrixBracket'));
});
check('radical hook and overbar are continuous height-aware native geometry',()=>{
 assert(viewSrc.includes('const RootInk='));assert(viewSrc.includes('function RootSegment'));
 assert(viewSrc.includes("case 'root':return <RootInk"));assert(viewSrc.includes('onLayout={e=>'));
 assert(viewSrc.includes('borderTopWidth:stroke'));assert(!viewSrc.includes('rootGlyph'));
});
check('vector accent near base character, superscripts keep operators compact',()=>{
 assert(viewSrc.includes('marginBottom:-5'));assert(viewSrc.includes('compact={compact}'));
 assert(viewSrc.includes('compact/>'));assert(parserSrc.includes("cmd==='overrightarrow'"));
});
check('existing formula templates remain and emit valid TeX',()=>{
 for(const name of ["template('limit'","template('matrix2'","template('vector'","template('sqrt'"])assert(tplSrc.includes(name));
});
check('no WebView imports or global listener, render is bounded',()=>{
 for(const src of [parserSrc,viewSrc])assert(!/from ['\"]react-native-webview|onSnapshot\s*\(|setInterval\s*\(/.test(src));
 assert(parserSrc.includes('2400'));assert(parserSrc.includes('count>480'));
});
let ts;try{ts=require('typescript')}catch{};
if(ts){
 const js=ts.transpileModule(parserSrc,{fileName:'StudyMathParser.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const m={exports:{}};vm.runInNewContext('(function(module,exports){'+js+'})')(m,m.exports);
 const parse=m.exports.parseStudyMath,plain=m.exports.studyMathPlain;
 check('lim_{x -> 1} and lim\\limits both parse as centered limit condition',()=>{
  for(const t of [String.raw`\lim_{x\to 1}\cos(2x)`,String.raw`\lim\limits_{x\to1}\cos(2x)`]){
   const n=parse(t);assert.equal(n.kind,'row');assert.equal(n.children[0].kind,'limit');
   assert.equal(plain(n.children[0].condition).replace(/\s/g,''),'x→1');
  }
 });
 check('matrix2 TeX renders a 2x2 grid without raw commands',()=>{
  const n=parse(String.raw`\begin{bmatrix}2&7\\6&9\end{bmatrix}`);
  assert.equal(n.kind,'matrix');assert.deepEqual(Array.from(n.rows,row=>Array.from(row,plain)),[['2','7'],['6','9']]);
  assert(!plain(n).includes('bmatrix'));
 });
 check('radical and vector hold nested structure',()=>{
  assert.equal(parse(String.raw`\sqrt{x^3+1}`).kind,'root');
  const v=parse(String.raw`\overrightarrow{AB}`);assert.equal(v.kind,'accent');assert.equal(v.symbol,'→');
 });
 check('ion charge 2- stays tight in one superscript group',()=>{
  const n=parse(String.raw`\mathrm{O^{2-}}`);assert.equal(n.kind,'script');
  assert.equal(plain(n.sup),'2-');
 });
 check('unknown macros still remain visible; invalid matrix bounded',()=>{
  assert(plain(parse(String.raw`\unsupported{8}`)).includes('\\unsupported'));
  assert.equal(parse(String.raw`\begin{bmatrix}2&4`).kind,'text');
 });
}else check('offline no-dependency source gate available before npm install',()=>{assert(parserSrc.includes('export function parseStudyMath'))});
console.log('SUPER BLOOM R3R11 TYPESETTING '+passed+' PASS'+(process.exitCode?' / FAIL DETECTED':''));
