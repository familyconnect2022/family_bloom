'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
if(!process.env.FIRESTORE_EMULATOR_HOST||!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST)||!process.env.BLOOM_RULES_TEST_DEPS)throw Error('Local emulator and isolated dependencies required');
const req=createRequire(path.join(process.env.BLOOM_RULES_TEST_DEPS,'package.json'));
const {initializeTestEnvironment,assertFails,assertSucceeds}=req('@firebase/rules-unit-testing');
const {doc,collection,getDoc,getDocs,setDoc,updateDoc,deleteDoc}=req('firebase/firestore');
const projectId='demo-family-bloom-r44';
const rules=fs.readFileSync(path.resolve(__dirname,'../../../firestore.rules'),'utf8');
const privatePaths=['familyEditorDraftUsers/alice/houses/house/drafts/lesson','familyEditorDraftUsers/alice/houses/house/drafts/lesson/revisions/rev/chunks/0000','familyEditorDraftUsers/alice/houses/house/drafts/lesson/media/asset','familyEditorDraftUsers/alice/houses/house/forms/moment','familyEditorDraftUsers/alice/houses/house/forms/moment/images/asset','familyEditorDraftRateLimits/alice','familyMediaAuditScans/state','familyEditorFormMediaIndex/asset','familyEditorFormMediaReview/state'];
(async()=>{const env=await initializeTestEnvironment({projectId,firestore:{rules}});let checks=0;try{await env.clearFirestore();await env.withSecurityRulesDisabled(async ctx=>{const db=ctx.firestore();await Promise.all([...privatePaths.map(p=>setDoc(doc(db,p),{marker:'test'})),setDoc(doc(db,'users/alice'),{uid:'alice'}),setDoc(doc(db,'families/house'),{ownerId:'alice'}),setDoc(doc(db,'families/house/members/alice'),{uid:'alice',role:'owner'})]);});
 const owner=env.authenticatedContext('alice').firestore();await assertSucceeds(getDoc(doc(owner,'users/alice')));checks++;
 for(const db of [owner,env.authenticatedContext('bob').firestore(),env.unauthenticatedContext().firestore()])for(const p of privatePaths){const ref=doc(db,p);await assertFails(getDoc(ref));await assertFails(getDocs(collection(db,p.split('/').slice(0,-1).join('/'))));await assertFails(updateDoc(ref,{marker:'tampered'}));await assertFails(deleteDoc(ref));await assertFails(setDoc(doc(db,p+'-new'),{marker:'created'}));checks+=5;}
 assert.equal(checks,136);console.log('PASS '+checks+' emulator checks (135 denied private operations + 1 positive control)');
 }finally{await env.cleanup();}})().catch(e=>{console.error(e);process.exitCode=1;});
