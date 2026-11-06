#!/usr/bin/env node
'use strict';
/** Standalone release gate: math typography + per-UID study reactions. No Firebase access. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let count=0;function check(name,fn){try{fn();console.log(`PASS ${++count}: ${name}`)}catch(err){console.error('FAIL '+name+'\n'+err.stack);process.exitCode=1;}}
const parser=read('src/features/study/StudyMathParser.ts');
const renderer=read('src/features/study/StudyFormula.tsx');
const repo=read('src/features/study/studyRepository.ts');
const detail=read('src/app/(home)/(learning)/study-question-detail.tsx');
check('Root mark and overbar share one connected view structure',()=>{
 assert.match(renderer,/rootContainer/);assert.match(renderer,/RootSegment/);
 assert.match(renderer,/rootBody/);assert.match(renderer,/borderTopWidth:stroke/);
 assert.doesNotMatch(renderer,/rootHookFoot|rootStem|rootGlyph/);
 assert.doesNotMatch(renderer,/<Text[^>]*style=\{\[s\.rootSymbol/);
});
check('Spacing for distinct operators is structural and consistent',()=>{
 assert.match(renderer,/mathOperatorSpacing/);assert.match(renderer,/marginHorizontal:mathOperatorSpacing/);
});
check('Placeholder math command is not shown raw',()=>{
 assert.match(parser,/square:'□'/);
});
check('Math renderer remains RN-only and lazy; no WebView or new library',()=>{
 assert.doesNotMatch(renderer,/react-native-webview|MathLive|https?:\/\//i);
 const p=JSON.parse(read('package.json'));assert(!p.dependencies['react-native-svg']&&!p.dependencies['react-native-webview']);
});
check('UI offers six distinct emoji, optimistic rollback and busy guard',()=>{
 assert.match(detail,/STUDY_REACTIONS\.map/);assert.match(detail,/setReaction\(old\)/);
 assert.match(detail,/setReactionKind/);assert.match(detail,/if\(likeBusy\|\|!uid\)return/);
});
check('Per-user reactions preserve legacy documents and support create, update, delete',()=>{
 for(const token of ['getMyReactionKind','normalizeStudyReaction','old.exists()','updateDoc(ref,{reaction})','deleteDoc(ref)','setDoc(ref,{uid,reaction'])assert(repo.includes(token),token);
});
check('Both Firestore rules permit only an authenticated family member and whitelisted emoji',()=>{
 for(const f of ['firestore.rules','firestore.cloud.rules']){
  const s=read(f),start=s.indexOf('match /studyQuestions/{questionId}'),end=s.indexOf('match /moments/{postId}',start),body=s.slice(start,end);
  assert(start>0&&end>start,f);
  assert(body.includes('match /reactions/{reactionUid}'));
  assert(body.includes("request.resource.data.reaction in ['heart','like','laugh','wow','clap','flower']"));
  assert(body.includes('request.auth.uid == reactionUid'));
  assert(body.includes('allow list: if false;'));
  assert(body.includes("affectedKeys().hasOnly(['reaction'])"));
 }
});
check('No Q&A listeners are added to root or unrelated features',()=>{
 assert(!read('src/app/_layout.tsx').includes('StudyMathParser'));
 assert.doesNotMatch(repo,/onSnapshot|setInterval/);
});
let ts;try{ts=require('typescript')}catch{}
if(ts){
 const load=(file,mocks={})=>{
  const code=ts.transpileModule(read(file),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const obj={exports:{}};
  new Function('module','exports','require',code)(obj,obj.exports,id=>mocks[id]||require(id));return obj.exports;
 };
 const math=load('src/features/study/StudyMathParser.ts');
 check('Math expressions keep all operators and normalize empty root placeholders',()=>{
  const t=math.studyMathPlain(math.parseStudyMath(String.raw`\int_0^1 x^2\,dx+\sqrt{x^3+2}\times\frac{20}{x}`));
  assert(t.includes('∫')&&t.includes('√(')&&t.includes('×')&&t.includes('/')&&t.includes('+'),t);
  const empty=math.studyMathPlain(math.parseStudyMath(String.raw`\sqrt{\square}`));assert(!empty.includes('\\square'),empty);
 });
 const db=new Map();let counter=0;let forbid=false;
 const firestore={
  getFirestore:()=>({}),collection:(...a)=>a.map(x=>typeof x==='string'?x:x.path||'').join('/'),
  doc:(ref,...rest)=>({path:(typeof ref==='string'?ref:ref.path||'')+'/'+(rest.length?rest.join('/'):'id-'+(++counter))}),
  getDoc:async r=>({exists:()=>db.has(r.path),data:()=>db.get(r.path)}),
  setDoc:async(r,v)=>{if(forbid)throw Error('permission-denied');db.set(r.path,v)},
  updateDoc:async(r,v)=>{if(forbid)throw Error('permission-denied');if(!db.has(r.path))throw Error('not-found');db.set(r.path,{...db.get(r.path),...v})},
  deleteDoc:async r=>{if(forbid)throw Error('permission-denied');db.delete(r.path)},
  serverTimestamp:()=>12345,
  query:()=>{},orderBy:()=>{},startAfter:()=>{},limit:()=>{},getDocs:()=>{},
 };
 const solutionModel=load('src/features/study/StudySolutionModel.ts');
 const mod=load('src/features/study/studyRepository.ts',{'@react-native-firebase/firestore':firestore,'./StudySolutionModel':solutionModel});
 // Keep assertions synchronous around one Promise chain to propagate failures.
 const test=async()=>{
  const store=mod.studyRepository;
  // Rather than relying on mock-ref formatting, enumerate paths after each write.
  await store.setReactionKind('fam','question','answer','user','like');
  assert.equal(db.size,1);assert.equal(await store.getMyReactionKind('fam','question','answer','user'),'like');
  await store.setReactionKind('fam','question','answer','user','flower');
  assert.equal(db.size,1);assert.equal(await store.getMyReactionKind('fam','question','answer','user'),'flower');
  await store.setReactionKind('fam','question','answer','user',null);assert.equal(db.size,0);
  await store.setReaction('fam','question','answer','user',true);
  const path=[...db.keys()][0];db.set(path,{uid:'user',createdAt:12345});
  assert.equal(await store.getMyReactionKind('fam','question','answer','user'),'heart');
  await store.setReactionKind('fam','question','answer','user','wow');assert.equal(db.get(path).createdAt,12345);
  forbid=true;await assert.rejects(()=>store.setReactionKind('fam','question','answer','user','clap'),/permission-denied/);
  forbid=false;await store.setReaction('fam','question','answer','user',false);assert.equal(db.size,0);
 };
 test().then(()=>console.log('PASS '+(++count)+': mocked Firestore reaction flow and permission errors'),e=>{console.error('FAIL mocked Firestore reaction flow',e);process.exitCode=1});
}else check('Before npm install the gate still checks source safely',()=>assert(parser.includes('parseStudyMath')));
