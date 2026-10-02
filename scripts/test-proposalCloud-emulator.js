process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8080';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {initializeTestEnvironment,assertFails}=require('@firebase/rules-unit-testing');
const fb=require('node:module').createRequire(require.resolve('@firebase/rules-unit-testing'))('firebase/firestore');
const {initializeApp,deleteApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {makeApproveGraphProposal}=require('../functions/proposalApproval');
(async()=>{
 const projectId='demo-family-bloom-cloud';
 const env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8080,rules:fs.readFileSync(path.join(__dirname,'../firestore.cloud.rules'),'utf8')}});
 const app=initializeApp({projectId},'proposal-tests'),db=getFirestore(app),now='2026-09-24T01:00:00.000Z',fid='f';
 const person={id:'a',familyId:fid,displayName:'A',gender:'other',nickname:null,birthDate:null,birthYear:null,birthPlace:null,deathDate:null,deathYear:null,lifeStatus:'unknown',birthOrder:null,avatarUrl:null,description:null,linkedUid:null,createdByUid:'admin',createdAt:now,updatedAt:now};
 const proposal=id=>({id,familyId:fid,entity:'persons',action:'update',targetId:'a',before:person,after:{...person,displayName:'Updated'},reason:'Correct name',createdByUid:'member',createdAt:now,status:'pending',reviewedByUid:null,reviewedAt:null,reviewNote:null,applied:null});
 let count=0;const ok=async(name,fn)=>{await fn();count++;console.log('PASS',name);};
 const authorize=async(tx,familyId,uid)=>{const m=await tx.get(db.doc(`families/${familyId}/members/${uid}`));if(!m.exists||m.data().role!=='admin')throw new Error('GRAPH_PERMISSION_DENIED');};
 const approve=makeApproveGraphProposal(db,authorize);
 try{
  await env.clearFirestore();
  await db.doc('families/f').set({id:fid,ownerId:'admin',name:'Cloud'});
  await db.doc('families/f/members/admin').set({uid:'admin',role:'admin'});await db.doc('families/f/members/member').set({uid:'member',role:'member'});
  await db.doc('families/f/persons/a').set(person);
  const member=env.authenticatedContext('member').firestore(),admin=env.authenticatedContext('admin').firestore();
  await ok('cloud member can propose',()=>fb.setDoc(fb.doc(member,'families/f/graphProposals/p'),proposal('p')));
  await ok('cloud admin client cannot directly approve',()=>assertFails(fb.updateDoc(fb.doc(admin,'families/f/graphProposals/p'),{status:'approved',reviewedByUid:'admin',reviewedAt:now,applied:proposal('p').after})));
  await ok('cloud backend checks admin again in transaction',()=>assert.rejects(()=>approve({familyId:fid,payload:{proposalId:'p'},actorUid:'member'}),/GRAPH_PERMISSION_DENIED/));
  await ok('cloud backend applies graph and audit atomically',async()=>{await approve({familyId:fid,payload:{proposalId:'p'},actorUid:'admin'});assert.equal((await db.doc('families/f/persons/a').get()).data().displayName,'Updated');assert.equal((await db.doc('families/f/graphProposals/p').get()).data().status,'approved');});
  await ok('cloud duplicate approval blocked',()=>assert.rejects(()=>approve({familyId:fid,payload:{proposalId:'p'},actorUid:'admin'}),/PROPOSAL_ALREADY_REVIEWED/));
  await db.doc('families/f/graphProposals/stale').set(proposal('stale'));
  await ok('cloud stale snapshot blocked',()=>assert.rejects(()=>approve({familyId:fid,payload:{proposalId:'stale'},actorUid:'admin'}),/PROPOSAL_CONFLICT/));
  await ok('cloud admin cannot create proposal',()=>assertFails(fb.setDoc(fb.doc(admin,'families/f/graphProposals/admin-new'),{...proposal('admin-new'),createdByUid:'admin'})));
  await db.doc('families/f/graphProposals/own').set({...proposal('own'),createdByUid:'admin'});
  await ok('cloud backend denies own legacy approval',()=>assert.rejects(()=>approve({familyId:fid,payload:{proposalId:'own'},actorUid:'admin'}),/GRAPH_PERMISSION_DENIED/));
  console.log(`ALL ${count} CLOUD CHECKS PASSED`);
 }finally{await env.cleanup();await deleteApp(app);}
})().catch(error=>{console.error(error);process.exitCode=1;});
