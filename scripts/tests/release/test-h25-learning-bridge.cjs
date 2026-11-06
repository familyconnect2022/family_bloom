'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('typescript');const root=path.resolve(__legacyScriptsDir,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=read('src/features/learning/publishedLessons.ts'),rule=read('firestore.rules');
let count=0;function check(name,fn){try{fn();count++;console.log('PASS '+name)}catch(e){console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1}}
const testModule={exports:{}};
const mocked={getFirestore:()=>({}),collection:(_,p)=>({p}),doc:(_,p,id)=>({p,id}),limit:(n)=>({n}),query:(...args)=>args,startAfter:(v)=>v,
 getDoc:async()=>({exists:()=>false}),getDocs:async()=>({docs:[]})};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,
 {exports:testModule.exports,require:()=>mocked});const api=testModule.exports;
const sample=(patch={})=>({schema:'bloom-studio-cloud/1',reviewStatus:'approved',entry:{title:'Bảng nhân 2',status:'approved',alignment:'verified',subject:'math',grade:2,unit:'Phép nhân',topic:'Bảng nhân'},
 content:{body:'# Bảng nhân\n**Ghi nhớ**',reviewedAt:'2026-10-22T00:00:00.000Z',questions:[{prompt:'2 x 4?',answer:'8'}],imageUrls:['https://res.cloudinary.com/studio-learning/image/upload/a.png']},...patch});
check('Production contract and Firestore collection match',()=>{assert.equal(api.PUBLISHED_PATH,'bloomStudioPublishedLessons');assert.match(source,/limit\(pageSize\)/);});
check('Valid approved lesson parses with 10-question-ready structure',()=>{const v=api.parsePublished('math-2-bang-nhan',sample());assert.equal(v.title,'Bảng nhân 2');assert.equal(v.questions[0].answer,'8');assert.equal(v.grade,2);assert.equal(v.imageUrls.length,1)});
check('Draft and pending articles cannot render',()=>{assert.equal(api.parsePublished('math-2-lesson',sample({reviewStatus:'draft'})),null);assert.equal(api.parsePublished('math-2-lesson',sample({entry:{...sample().entry,status:'in_review'}})),null)});
check('Unverified source and unreviewed content are rejected',()=>{assert.equal(api.parsePublished('math-2-lesson',sample({entry:{...sample().entry,alignment:'unverified'}})),null);assert.equal(api.parsePublished('math-2-lesson',sample({content:{body:'a'}})),null)});
check('Bad URLs and unknown subjects are not rendered',()=>{const v=api.parsePublished('math-2-lesson',sample({content:{...sample().content,imageUrls:['http://bad','javascript:alert(1)','https://res.cloudinary.com/ok.png']}}));assert.equal(v.imageUrls.length,1);assert.equal(api.parsePublished('a',sample({entry:{...sample().entry,subject:'other'}})),null)});
check('Family hub links to reader, reader does not add root listeners',()=>{assert.match(read('src/app/(tabs)/play.tsx'),/learning-library/);assert.doesNotMatch(read('src/app/_layout.tsx'),/subscribePublishedLessons|onSnapshot\(/);});
check('Family Cloud Manager guarded by verified developer account',()=>{assert.match(read('src/app/(profile)/cloud-manager.tsx'),/isVerifiedDeveloperAccount/);assert.match(read('src/app/(profile)/settings.tsx'),/cloud-manager/)});
check('Private Studio drafts remain editor-only',()=>{const block=rule.split('match /bloomStudioLessons/{lessonId} {')[1].split('match /bloomStudioPublishedLessons')[0];assert.doesNotMatch(block,/allow (?:list|get)/);assert.match(block,/allow read, delete: if isBloomStudioEditor\(\)/)});
check('Published read restricted to signed-in Family user doc and page <=50',()=>{const p=rule.split('match /bloomStudioPublishedLessons/{lessonId} {')[1];assert.match(p,/exists\(\/databases\/\$\(database\)\/documents\/users\/\$\(request\.auth\.uid\)\)/);assert.match(p,/request\.query\.limit <= 50/);assert.match(p,/resource\.data\.reviewStatus == 'approved'/)});
check('Publishing write still requires Studio verified UID and approved entry',()=>{const p=rule.split('match /bloomStudioPublishedLessons/{lessonId} {')[1];assert.match(p,/allow create, update: if isBloomStudioEditor\(\)/);assert.match(p,/request\.resource\.data\.entry\.alignment == 'verified'/);assert.match(rule,/5kCsIiIYWFNM0HwW48K51RIz2KF3/)});
check('No Cloudinary Secret or account-switching in APK',()=>{assert.doesNotMatch(read('src/app/(profile)/cloud-manager.tsx'),/CLOUDINARY_API_SECRET|api_secret|unsigned_preset|setCloudinaryAccount/);assert.match(read('src/services/media/cloudinaryService.ts'),/APP_CONFIG\.CLOUDINARY\.cloudName/)});
console.log('EDUCATION BRIDGE '+count+'/11 '+(count===11?'PASS':'FAIL'));if(count!==11)process.exitCode=1;
