'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
if(!process.env.FIRESTORE_EMULATOR_HOST||!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST)||!process.env.BLOOM_RULES_TEST_DEPS)throw Error('Local emulator and isolated dependencies required');
const req=createRequire(path.join(process.env.BLOOM_RULES_TEST_DEPS,'package.json'));
const {initializeTestEnvironment,assertFails,assertSucceeds}=req('@firebase/rules-unit-testing');
const {doc,collection,getDoc,getDocs,setDoc,updateDoc,deleteDoc,runTransaction,writeBatch}=req('firebase/firestore');
const projectId='demo-family-bloom-r44';
const rules=fs.readFileSync(path.resolve(__dirname,'../../../firestore.rules'),'utf8');
const privatePaths=['familyEditorDraftUsers/alice/houses/house/drafts/lesson','familyEditorDraftUsers/alice/houses/house/drafts/lesson/revisions/rev/chunks/0000','familyEditorDraftUsers/alice/houses/house/drafts/lesson/media/asset','familyEditorDraftUsers/alice/houses/house/drafts/lesson/revisions/rev/referenceIndex/summary','familyEditorDraftUsers/alice/houses/house/forms/moment','familyEditorDraftUsers/alice/houses/house/forms/moment/images/asset','familyLearningArticles/house/articles/lesson','familyEditorDraftRateLimits/alice','familyMediaAuditScans/state','familyEditorFormMediaIndex/asset','familyEditorFormMediaReview/state'];
(async()=>{const env=await initializeTestEnvironment({projectId,firestore:{rules}});let checks=0;try{await env.clearFirestore();await env.withSecurityRulesDisabled(async ctx=>{const db=ctx.firestore();await Promise.all([...privatePaths.map(p=>setDoc(doc(db,p),{marker:'test'})),setDoc(doc(db,'users/alice'),{uid:'alice'}),setDoc(doc(db,'families/house'),{ownerId:'alice'}),setDoc(doc(db,'families/house/members/alice'),{uid:'alice',role:'owner'})]);});
 const owner=env.authenticatedContext('alice').firestore();await assertSucceeds(getDoc(doc(owner,'users/alice')));checks++;
 for(const db of [owner,env.authenticatedContext('bob').firestore(),env.unauthenticatedContext().firestore()])for(const p of privatePaths){const ref=doc(db,p);await assertFails(getDoc(ref));await assertFails(getDocs(collection(db,p.split('/').slice(0,-1).join('/'))));await assertFails(updateDoc(ref,{marker:'tampered'}));await assertFails(deleteDoc(ref));await assertFails(setDoc(doc(db,p+'-new'),{marker:'created'}));checks+=5;}
 assert.equal(checks,166);console.log('PASS '+checks+' emulator checks (165 denied private operations + 1 positive control)');
 const outsider=env.authenticatedContext('bob').firestore(),event=doc(owner,'families/house/events/r55-event'),foreign=doc(outsider,'families/house/events/r55-event');
 const payload={id:'r55-event',familyId:'house',createdByUid:'alice',title:'Test event',personIds:[],moderationStatus:'visible',moderatedByUid:null,moderatedAt:null,createdAt:'2026-11-26T00:00:00.000Z',updatedAt:'2026-11-26T00:00:00.000Z'};
 await assertSucceeds(runTransaction(owner,async tx=>{const snap=await tx.get(event);assert(!snap.exists());tx.set(event,payload);}));
 await assertSucceeds(runTransaction(owner,async tx=>{const snap=await tx.get(event);assert.equal(snap.data().title,payload.title);tx.update(event,{title:'Edited'});}));
 await assertFails(runTransaction(owner,async tx=>{await tx.get(event);tx.update(event,{createdByUid:'bob'});}));
 await assertFails(getDoc(foreign));
 await assertFails(runTransaction(outsider,async tx=>{await tx.get(foreign);tx.update(foreign,{title:'Tampered'});}));
 assert.equal((await getDoc(event)).data().title,'Edited');console.log('PASS event transaction and access checks (5 rules assertions + final state)');

 const fid='abcdefghijk123456789', defaultName='Nhà-abcdefghij', legacyId='legacy12345678901234', aliasKey=s=>'v1_'+encodeURIComponent(s);
 const stamp='2026-11-28T00:00:00.000Z';
 await env.withSecurityRulesDisabled(async ctx=>{
  const db=ctx.firestore();
  for(const id of [fid,legacyId]){
   const base={id,ownerId:'alice',name:'Family Test',familyCode:'test-'+id};
   if(id===fid){base.introName=defaultName;base.introNameKey=aliasKey(defaultName);}
   await setDoc(doc(db,'families',id),base);
   await setDoc(doc(db,'families',id,'members','alice'),{uid:'alice',role:'owner'});
  }
  await setDoc(doc(db,'family_intro_names',aliasKey(defaultName)),{id:aliasKey(defaultName),name:defaultName,familyId:fid,familyName:'Family Test',ownerId:'alice',createdAt:stamp});
 });
 const rename=(db,id,previous,next)=>{
  const batch=writeBatch(db),key=aliasKey(next);
  batch.set(doc(db,'family_intro_names',key),{id:key,name:next,familyId:id,familyName:'Family Test',ownerId:'alice',createdAt:stamp});
  batch.update(doc(db,'families',id),{introName:next,introNameKey:key,updatedAt:stamp});
  if(previous)batch.delete(doc(db,'family_intro_names',aliasKey(previous)));
  return batch.commit();
 };
 await assertFails(rename(outsider,fid,defaultName,'Outsider'));
 await assertSucceeds(rename(owner,fid,defaultName,'Bloom One'));
 await assertFails(rename(owner,fid,'Bloom One','Bloom Two'));
 await assertFails(rename(owner,fid,'Bloom One',defaultName));
 await assertFails(updateDoc(doc(owner,'families',fid),{introName:null,introNameKey:null}));
 assert.equal((await getDoc(doc(owner,'families',fid))).data().introName,'Bloom One');
 assert.equal((await getDoc(doc(owner,'families',fid))).data().familyCode,'test-'+fid);
 await assertSucceeds(rename(owner,legacyId,null,'Nhà-legacy1234'));
 await assertSucceeds(rename(owner,legacyId,'Nhà-legacy1234','Legacy Bloom'));
 await assertFails(rename(owner,legacyId,'Legacy Bloom','Legacy Twice'));
 console.log('PASS family introduction name: first custom rename, legacy bootstrap, second/reset/outsider denied; house code preserved');
 }finally{await env.cleanup();}})().catch(e=>{console.error(e);process.exitCode=1;});
