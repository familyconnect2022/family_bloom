/** Dynamic H25 fake-Admin integration for concurrent Render claims and post-game release. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ts=require('typescript');
const source=fs.readFileSync('server/src/games/firebaseInvitationMatch.ts','utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const DB=new Map();let created=0;const game='h25-game-fixed';
const invitationKey='families/fam/boardInvitations/inv1';
const S=u=>`families/fam/boardInviteSlots/${u}`;
const base=()=>({inviteId:'inv1',familyId:'fam',gameKind:'chess',fromUid:'a',toUid:'b',status:'ACCEPT_REQUESTED',expiresAtMs:Date.now()+60000,acceptedAt:{toMillis:()=>Date.now()},revision:2,timeControl:{kind:'unlimited',initialMs:null,incrementMs:0}});
function snap(ref){const data=DB.get(ref.path);return {exists:data!==undefined, data:()=>data, ref, id:ref.path.split('/').at(-1)}}
function ref(path){return {path,get:async()=>snap(ref(path))}}
const tx={get:async r=>snap(r),update:(r,obj)=>DB.set(r.path,{...DB.get(r.path),...obj}),set:(r,obj)=>DB.set(r.path,{...DB.get(r.path),...obj})};
const adminDb={doc:ref,runTransaction:async fn=>fn(tx)};
const exports_={};vm.runInNewContext(js,{exports:exports_,require:n=>{if(n.endsWith('firebaseAdmin.js'))return {adminDb};throw Error(n)},Date,Promise,Map,Set,console,setTimeout,clearTimeout},{timeout:10000});
const {resolveFirebaseMatch,finalizeInvitationWithGame}=exports_;
const options=uid=>({familyId:'fam',inviteId:'inv1',uid,kind:'chess',getCurrent:async()=>null,sameMatch:async()=>false,create:async()=>{created++;await new Promise(r=>setTimeout(r,1));return game}});
(async()=>{
 DB.set(invitationKey,base());
 const [a,b]=await Promise.all([resolveFirebaseMatch(options('a')),resolveFirebaseMatch(options('b'))]);
 assert.equal(a,game);assert.equal(b,game);assert.equal(created,1,'two join requests create only one game');
 assert.equal(DB.get(invitationKey).status,'ACCEPTED');
 assert.equal(DB.get(S('a')).status,'MATCHED');assert.equal(DB.get(S('b')).gameId,game);
 console.log('PASS parallel A/B claim commits only one game and both match slots');
 const result=await resolveFirebaseMatch(options('a'));assert.equal(result,game);assert.equal(created,1);
 console.log('PASS duplicate claim idempotent once ACCEPTED');
 await finalizeInvitationWithGame(tx,adminDb,'fam',game,['a','b']);
 assert.equal(DB.get(invitationKey).status,'COMPLETED');assert.equal(DB.get(S('a')).status,'RELEASED');assert.equal(DB.get(S('b')).status,'RELEASED');
 console.log('PASS terminal game clears both slots and completes invitation');
 const before=DB.get(S('a'));
 await finalizeInvitationWithGame(tx,adminDb,'fam','unrelated-game',['a','b']);assert.deepEqual(DB.get(S('a')),before);
 console.log('PASS unrelated late finish cannot alter released slots');
 DB.set(invitationKey,base());
 DB.set(S('a'),{status:'RELEASED'});DB.set(S('b'),{status:'RELEASED'});
 const fresh=options('a');fresh.getCurrent=async uid=>({familyId:'fam',gameId:game,gameKind:'chess'});fresh.sameMatch=async()=>true;
 const recovered=await resolveFirebaseMatch(fresh);
 assert.equal(recovered,game);assert.equal(created,1);
 console.log('PASS restarted worker adopts durable game locks instead of duplicating game');
 DB.set(invitationKey,{...base(),status:'CANCELLED'});
 await assert.rejects(resolveFirebaseMatch(options('a')),/INVITE_NOT_ACCEPTED/);
 console.log('PASS terminal invite cannot spawn game');
 DB.set(invitationKey,{...base(),acceptedAt:{toMillis:()=>Date.now()-181000},expiresAtMs:Date.now()-120000});
 await assert.rejects(resolveFirebaseMatch(options('a')),/INVITE_CONNECT_TIMEOUT/);
 console.log('PASS expired connection intent cannot spawn game');
 DB.set(invitationKey,base());
 await assert.rejects(resolveFirebaseMatch(options('mallory')),/INVITE_NOT_AUTHORIZED/);
 console.log('PASS uninvited uid cannot claim invitation');
 console.log('H25 RUNTIME CLAIMS: 7/7 PASS');
})().catch(e=>{console.error('FAIL H25 RUNTIME CLAIMS',e);process.exitCode=1});
