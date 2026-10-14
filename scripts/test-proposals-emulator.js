// Run against demo-family-bloom Firestore emulator only.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const {initializeTestEnvironment,assertFails}=require('@firebase/rules-unit-testing');
const fb=require('node:module').createRequire(require.resolve('@firebase/rules-unit-testing'))('firebase/firestore');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
let currentDb,currentUid;
const cache=new Map();
function load(file){
 file=path.resolve(root,file);if(!path.extname(file))file+='.ts';
 if(cache.has(file))return cache.get(file);
 const exports={};cache.set(file,exports);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInNewContext(code,{exports,require:(id)=>{
  if(id==='@react-native-firebase/firestore')return {...fb,getFirestore:()=>currentDb,
    setDoc:(ref,data)=>fb.setDoc(ref,JSON.parse(JSON.stringify(data))),
    updateDoc:(ref,data)=>fb.updateDoc(ref,JSON.parse(JSON.stringify(data))),
    runTransaction:(db,fn)=>fb.runTransaction(db,tx=>fn({get:ref=>tx.get(ref),set:(ref,data,options)=>options?tx.set(ref,JSON.parse(JSON.stringify(data)),JSON.parse(JSON.stringify(options))):tx.set(ref,JSON.parse(JSON.stringify(data))),update:(ref,data)=>tx.update(ref,JSON.parse(JSON.stringify(data))),delete:ref=>tx.delete(ref)})),
  };
  if(id==='./familyGraphCloudGateway')return {postFamilyGraphMutation:()=>{throw new Error('Unexpected cloud call in direct-mode test');}};
  if(id==='@react-native-firebase/auth')return {getAuth:()=>({currentUser:{uid:currentUid}})};
  if(id.startsWith('.'))return load(path.resolve(path.dirname(file),id));
  return require(id);
 },console,Date,Map,Set,Promise},{filename:file});return exports;
}
(async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-family-bloom',firestore:{host:'127.0.0.1',port:8080,rules:fs.readFileSync(path.join(root,'firestore.rules'),'utf8')}});
 const fid='CaseSensitiveFamilyID',now='2026-09-24T01:00:00.000Z';
 const person=id=>({id,familyId:fid,displayName:id,gender:'other',nickname:null,birthDate:null,birthYear:null,birthPlace:null,deathDate:null,deathYear:null,lifeStatus:'unknown',birthOrder:null,avatarUrl:null,description:null,linkedUid:null,createdByUid:'admin',createdAt:now,updatedAt:now});
 const as=uid=>{currentUid=uid;currentDb=env.authenticatedContext(uid).firestore();return currentDb;};
 let checks=0;const ok=async(label,fn)=>{await fn();checks++;console.log('PASS',label);};
 try{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async ctx=>{
  const db=ctx.firestore();
  const entries={
   [`families/${fid}`]:{id:fid,name:'Nhà test',familyCode:'nha-test-1234',ownerId:'admin',createdAt:now,updatedAt:now},
   'family_codes/nha-test-1234':{id:'nha-test-1234',familyCode:'nha-test-1234',familyId:fid,familyName:'Nhà test',ownerId:'admin',createdAt:now},
   [`families/${fid}/persons/a`]:person('a'),[`families/${fid}/persons/b`]:person('b'),
  };
  for(const uid of ['admin','member','other']){entries[`families/${fid}/members/${uid}`]={uid,role:uid==='admin'?'admin':'member',displayName:uid};entries[`users/${uid}/memberships/${fid}`]={familyId:fid,role:uid==='admin'?'admin':'member'};}
  for(const uid of ['applicant','bycode','retry','member','admin'])entries[`users/${uid}`]={uid,displayName:uid,activeFamilyId:null,createdAt:now,updatedAt:now};
  for(const [key,value]of Object.entries(entries))await fb.setDoc(fb.doc(db,key),value);
 });
 const join=load('src/services/family/familyJoinService.ts').familyJoinService;
 const family=load('src/services/family/familyService.ts').familyService;
 const proposals=load('src/services/familyGraph/graphProposalService.ts').graphProposalService;
 as('applicant');
 await ok('outsider cannot read private family or self-promote',async()=>{await assertFails(fb.getDoc(fb.doc(currentDb,`families/${fid}`)));await assertFails(fb.setDoc(fb.doc(currentDb,`families/${fid}/members/applicant`),{uid:'applicant',role:'admin'}));});
 let request;
 await ok('request by exact-case Family ID',async()=>{request=await join.requestToJoin('applicant',`  ${fid}  `,{uid:'applicant',displayName:'Applicant'});assert.equal(request.familyId,fid);});
 await ok('duplicate pending request blocked',()=>assert.rejects(()=>join.requestToJoin('applicant',fid,{uid:'applicant',displayName:'Applicant'}),/JOIN_REQUEST_PENDING/));
 as('bycode');await ok('request by uppercase house code',async()=>{const r=await join.requestToJoin('bycode','NHA-TEST-1234',{uid:'bycode',displayName:'Code'});assert.equal(r.familyId,fid);});
 as('admin');await ok('admin approval without reading applicant private profile',()=>join.approve(fid,request,'admin'));
 as('applicant');await ok('applicant activates family after approval',async()=>{await family.switchActiveFamily('applicant',fid);assert.equal((await fb.getDoc(fb.doc(currentDb,'users/applicant'))).data().activeFamilyId,fid);});
 as('admin');await join.reject(fid,{uid:'bycode'},'admin','Kiểm tra lại');
 as('bycode');await ok('rejected applicant can send again',()=>join.requestToJoin('bycode',fid,{uid:'bycode',displayName:'Code'}));
 as('member');let id;
 await ok('member submits person update without changing graph',async()=>{id=await proposals.submit(fid,'persons','update','a',{displayName:'Tên mới'},'Sửa tên');assert.equal((await fb.getDoc(fb.doc(currentDb,`families/${fid}/persons/a`))).data().displayName,'a');});
 await ok('member cannot approve own proposal',()=>assert.rejects(()=>proposals.review(fid,id,'approved','')));
 await ok('cannot tamper with pending payload',()=>assertFails(fb.updateDoc(fb.doc(currentDb,`families/${fid}/graphProposals/${id}`),{reason:'Changed'})));
 as('admin');await ok('approval changes graph and audit atomically',async()=>{await proposals.review(fid,id,'approved','Đã đối chiếu');assert.equal((await fb.getDoc(fb.doc(currentDb,`families/${fid}/persons/a`))).data().displayName,'Tên mới');assert.equal((await fb.getDoc(fb.doc(currentDb,`families/${fid}/graphProposals/${id}`))).data().status,'approved');});
 await ok('second approval is blocked',()=>assert.rejects(()=>proposals.review(fid,id,'approved','')));
 as('member');const stale=await proposals.submit(fid,'persons','update','a',{displayName:'Stale'},'Old data');
 as('admin');await fb.updateDoc(fb.doc(currentDb,`families/${fid}/persons/a`),{nickname:'Changed',updatedAt:new Date().toISOString()});
 await ok('stale proposal cannot overwrite newer data',()=>assert.rejects(()=>proposals.review(fid,stale,'approved',''),/thay đổi/));
 await ok('rejection keeps original graph',()=>proposals.review(fid,stale,'rejected','Đã có dữ liệu mới'));
 as('member');const withdraw=await proposals.submit(fid,'persons','create',null,{displayName:'Withdraw',gender:'other'},'Test');
 as('other');await ok('other member cannot withdraw',()=>assertFails(proposals.review(fid,withdraw,'withdrawn','')));
 as('member');await ok('creator may withdraw',()=>proposals.review(fid,withdraw,'withdrawn',''));
 const create=await proposals.submit(fid,'persons','create',null,{displayName:'New',gender:'other'},'Thêm người');
 as('admin');await ok('create person approval',()=>proposals.review(fid,create,'approved',''));
 as('member');const relation=await proposals.submit(fid,'relationships','create',null,{type:'parent_child',personAId:'a',personBId:'b',subtype:'biological'},'Cha con');
 as('admin');await ok('create relationship approval',()=>proposals.review(fid,relation,'approved',''));
 as('member');const change=await proposals.submit(fid,'relationships','update','pc_a_b',{subtype:'adoptive'},'Sửa loại');
 as('admin');await ok('update parent relationship metadata',()=>proposals.review(fid,change,'approved',''));
 as('member');const cycle=await proposals.submit(fid,'relationships','create',null,{type:'parent_child',personAId:'b',personBId:'a'},'Cycle');
 as('admin');await ok('parent cycle blocked',()=>assert.rejects(()=>proposals.review(fid,cycle,'approved',''),/vòng lặp/));
 as('member');const delPerson=await proposals.submit(fid,'persons','delete','b',{},'Delete');
 as('admin');await ok('person deletion with relationship blocked',()=>assert.rejects(()=>proposals.review(fid,delPerson,'approved',''),/quan hệ/));
 as('member');const delRel=await proposals.submit(fid,'relationships','delete','pc_a_b',{},'Remove');
 as('admin');await ok('relationship deletion approval',()=>proposals.review(fid,delRel,'approved',''));
 await ok('isolated person deletion approval',()=>proposals.review(fid,delPerson,'approved',''));
 // Even an admin cannot set approved without the corresponding graph write.
 as('member');const atomic=await proposals.submit(fid,'persons','update','a',{displayName:'Atomic'},'Atomic');
 as('admin');const pr=(await fb.getDoc(fb.doc(currentDb,`families/${fid}/graphProposals/${atomic}`))).data();
 await ok('rules require atomic application',()=>assertFails(fb.updateDoc(fb.doc(currentDb,`families/${fid}/graphProposals/${atomic}`),{status:'approved',reviewedByUid:'admin',reviewedAt:new Date().toISOString(),applied:pr.after})));
 as('member');const concurrent=await proposals.submit(fid,'persons','update','a',{description:'Concurrent'},'Race');
 as('admin');await ok('concurrent approval applies once',async()=>{const results=await Promise.allSettled([proposals.review(fid,concurrent,'approved',''),proposals.review(fid,concurrent,'approved','')]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);});
 await env.withSecurityRulesDisabled(ctx=>fb.setDoc(fb.doc(ctx.firestore(),'families/legacy'),{id:'legacy',name:'Legacy',ownerId:'admin',createdAt:now,updatedAt:now}));
 as('admin');await ok('explicit legacy code creation is stable',async()=>{const code=await family.ensureFamilyCode('legacy');assert.equal(await family.ensureFamilyCode('legacy'),code);});
 as('stranger');await ok('invalid family ID does not create request',()=>assert.rejects(()=>join.requestToJoin('stranger','missing-family-id',{uid:'stranger',displayName:'Unknown'}),/FAMILY_NOT_FOUND/));
 await ok('slash in invitation input rejected',()=>assert.rejects(()=>join.requestToJoin('stranger','bad/id',{uid:'stranger',displayName:'Unknown'}),/FAMILY_ID_REQUIRED/));
 await env.withSecurityRulesDisabled(ctx=>fb.setDoc(fb.doc(ctx.firestore(),`families/${fid}/persons/b`),person('b')));
 as('member');const edge1=await proposals.submit(fid,'relationships','create',null,{type:'parent_child',personAId:'a',personBId:'b'},'Race forward');const edge2=await proposals.submit(fid,'relationships','create',null,{type:'parent_child',personAId:'b',personBId:'a'},'Race backward');
 as('admin');await ok('concurrent opposing proposals cannot create a cycle',async()=>{const results=await Promise.allSettled([proposals.review(fid,edge1,'approved',''),proposals.review(fid,edge2,'approved','')]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);});
 await env.withSecurityRulesDisabled(ctx=>fb.setDoc(fb.doc(ctx.firestore(),'users/newhome'),{uid:'newhome',displayName:'New owner',createdAt:now,updatedAt:now,activeFamilyId:null}));
 as('newhome');await ok('new family creation still reserves a working alias',async()=>{const result=await family.createFamilyForUser('newhome','Nhà mới');assert.ok(result.familyCode);assert.equal((await fb.getDoc(fb.doc(currentDb,`family_codes/${result.familyCode}`))).data().familyId,result.familyId);});
 as('admin');await ok('admin cannot create a proposal',()=>assertFails(proposals.submit(fid,'persons','create',null,{displayName:'No admin proposal',gender:'other'},'Denied')));
 const ownBefore=(await fb.getDoc(fb.doc(currentDb,`families/${fid}/persons/a`))).data();
 const own={...pr,id:'legacy-own',createdByUid:'admin',status:'pending',before:ownBefore,after:{...ownBefore,displayName:'Own change'}};
 await env.withSecurityRulesDisabled(ctx=>fb.setDoc(fb.doc(ctx.firestore(),`families/${fid}/graphProposals/legacy-own`),own));
 await ok('admin service cannot approve own legacy proposal',()=>assert.rejects(()=>proposals.review(fid,'legacy-own','approved',''),/tự duyệt/));
 await ok('rules reject own legacy approval',()=>assertFails(fb.runTransaction(currentDb,async tx=>{tx.set(fb.doc(currentDb,`families/${fid}/persons/a`),own.after);tx.update(fb.doc(currentDb,`families/${fid}/graphProposals/legacy-own`),{status:'approved',reviewedByUid:'admin',reviewedAt:now,applied:own.after});})));
 await ok('admin may withdraw own legacy proposal',()=>proposals.review(fid,'legacy-own','withdrawn',''));
 console.log(`ALL ${checks} FIRESTORE/SERVICE CHECKS PASSED`);
 }finally{await env.cleanup();}
})().catch(error=>{console.error(error);process.exitCode=1;});
