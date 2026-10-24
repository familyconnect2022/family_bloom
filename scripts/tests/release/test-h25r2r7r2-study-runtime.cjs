/** Deterministic contract tests using mocked Firestore, no network/auth access. */
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
let ts;try{ts=require('typescript')}catch{if(!process.env.FB_TYPESCRIPT_PATH)throw Error('Run npm install before this runtime test; missing TypeScript');ts=require(process.env.FB_TYPESCRIPT_PATH)}
const compile=(p,requireFn)=>{
 const source=fs.readFileSync(p,'utf8'),js=ts.transpileModule(source,{fileName:p,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
 const module={exports:{}};vm.runInNewContext('(function(require,module,exports){'+js+'})',{console})(requireFn,module,module.exports);return module.exports;
};
const mockReact={memo:x=>x,useMemo:x=>x(),useState:()=>{},default:{memo:x=>x,useMemo:x=>x()}};
const math=compile('src/features/study/StudyMathParser.ts',name=>{throw Error('Parser must remain dependency free: '+name)});
const relations=compile('src/features/study/StudySolutionModel.ts',name=>{throw Error('Solution relation model must remain dependency-free: '+name)});
const f=compile('src/features/study/StudyFormula.tsx',name=>{
 if(name==='react')return mockReact;
 if(name==='react/jsx-runtime')return {jsx:()=>null,jsxs:()=>null};
 if(name==='react-native')return {StyleSheet:{create:x=>x}};
 if(name==='./studyRepository')return {};
 if(name==='./StudyMathParser')return math;
 if(name==='./StudySolutionModel')return relations;
 throw Error(name)
});
assert(f.formulaToAccessibleText('x^{2}+H_{2}O').includes('x^(2)'));
assert(f.formulaToAccessibleText('x^{2}+H_{2}O').includes('H_(2)O'));
assert.equal(f.formulaToAccessibleText(String.raw`\frac{a}{b}`),'(a)/(b)');
const frac=math.parseStudyMath(String.raw`\frac{a}{b}`);
assert.equal(frac.kind,'fraction');assert.equal(math.studyMathPlain(frac.top),'a');assert.equal(math.studyMathPlain(frac.bottom),'b');
const complex=math.parseStudyMath(String.raw`\int_0^1 x^2\,dx`);
assert.equal(complex.kind,'row');assert.equal(complex.children[0].kind,'large');
assert(!math.studyMathPlain(complex).includes('\\,'));
assert.equal(f.FORMULA_TEMPLATES.length,12);
const calls=[];const fakeTime={timestamp:true};let items=[];let docIndex=0;
const firestore={
 getFirestore:()=>({db:true}),collection:(...a)=>({type:'collection',parts:a}),doc:(...a)=>({type:'doc',args:a,id:a.length===1?'generated-'+(++docIndex):a[a.length-1]}),getDoc:async()=>({exists:()=>false}),getDocs:async()=>({docs:items,size:items.length}),
 limit:(n)=>({type:'limit',n}),orderBy:(...a)=>({type:'order',a}),startAfter:(x)=>({type:'cursor',x}),query:(...a)=>{calls.push(a);return a},
 serverTimestamp:()=>fakeTime,setDoc:async(ref,data)=>{calls.push(['set',ref,data])},deleteDoc:async()=>{},updateDoc:async(ref,change)=>{calls.push(['update',ref,change])}
};
const r=compile('src/features/study/studyRepository.ts',name=>{
 if(name==='@react-native-firebase/firestore')return firestore;
 if(name==='./StudySolutionModel')return relations;
 throw Error(name)
});
(async()=>{
 const blocks=[{kind:'text',value:'Bài toán cần giải'}];
 const created=await r.studyRepository.createQuestion('f1','u1','Bắp','Bài toán', 'math',9,blocks,[]);
 assert.match(created,/generated-/);
 const saved=calls.find(x=>x[0]==='set')[2];
 assert.equal(saved.authorUid,'u1');assert.equal(saved.familyId,'f1');assert.equal(saved.createdAt,fakeTime);
 await assert.rejects(()=>r.studyRepository.createQuestion('f1','u1','Bắp','', 'math',9,blocks,[]));
 await r.studyRepository.listQuestions('f1');
 const request=calls.find(x=>x[0]?.type==='collection');
 assert(request.some(x=>x?.type==='limit'&&x.n===15));
 await r.studyRepository.createAnswer('f1','q1','u2','Chị',blocks,[]);
 await r.studyRepository.acceptAnswer('f1','q1','a1');
 assert(calls.some(x=>x[0]==='update'&&x[2].acceptedAnswerId==='a1'));
 await r.studyRepository.addComment('f1','q1','a1','u1','Bắp','Em đã hiểu!');
 assert(calls.filter(x=>x[0]==='set').length>=3);
 console.log('STUDY RUNTIME MOCK PASS: 12 templates, native structured math, paging, Firestore create/accept/comment');
})().catch(e=>{console.error(e);process.exitCode=1});
