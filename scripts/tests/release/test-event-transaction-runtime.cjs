'use strict';
// Run with the project's pinned TypeScript. Only Firebase I/O is mocked;
// actual repository, contracts and Publish Manager are executed.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const ts=require('typescript');
const root=process.cwd(),native=fs.existsSync(path.join(root,'src/services/event/eventService.ts'));
const entry=native?'src/services/event/eventService.ts':'src/events/repository.ts';
function harness(){
 const auth={currentUser:{uid:'alice'}},rows=new Map(),cache=new Map();let seq=0,writes=0,lose=false,onRead=null;
 const db={};const ref=p=>({path:p,id:p.split('/').at(-1)});
 const snapshot=r=>({exists:()=>rows.has(r.path),data:()=>structuredClone(rows.get(r.path)),id:r.id});
 const sdk={getFirestore:()=>db,collection:(_,p)=>ref(p),doc:(x,p)=>ref(p??(x.path+'/generated-'+ ++seq)),getDoc:async r=>snapshot(r),getDocFromServer:async r=>snapshot(r),runTransaction:async(_,fn)=>{const pending=[];const value=await fn({get:async r=>{const s=snapshot(r);if(onRead){const f=onRead;onRead=null;f();}return s;},set:(r,v)=>pending.push([r,structuredClone(v)]),update:(r,v)=>pending.push([r,{...rows.get(r.path),...structuredClone(v)}])});for(const [r,v] of pending){rows.set(r.path,v);writes++;}if(lose){lose=false;throw Error('lost response');}return value;}};
 function load(p){if(p.endsWith('.cjs'))return require(p);if(cache.has(p))return cache.get(p);const m=new Module(p);m.filename=p;cache.set(p,m.exports);m.require=q=>{if(['firebase/firestore','@react-native-firebase/firestore'].includes(q))return sdk;if(q==='@react-native-firebase/auth')return {getAuth:()=>auth};if(q.endsWith('/lib/firebase'))return {webFirebase:()=>({auth,db})};if(q.endsWith('/familyGraphRepository'))return {familyGraphRepository:{listPersons:async()=>[]}};if(q.startsWith('.')){const r=path.resolve(path.dirname(p),q);return load(fs.existsSync(r)?r:r+'.ts');}throw Error('Unexpected module '+q);};m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,p);cache.set(p,m.exports);return m.exports;}
 const mod=load(path.join(root,entry)),api=native?mod.eventService:mod.eventRepository;
 const date=new Date(2035,5,20,12),input={title:'Ngày vui',dateISO:date.toISOString(),date,time:'12:00',allDay:true,eventType:'family',notificationLevel:'normal',participantsMode:'all',participantIds:[],personIds:[],recurrence:'none',description:'',location:'',createdByUid:'alice'};
 const create=(id,patch={})=>native?api.create('house',{...input,...patch},id):api.create('house','alice',{...input,...patch},id);
 return {api,auth,rows,create,writes:()=>writes,lose:()=>{lose=true;},onRead:f=>{onRead=f;},key:id=>'families/house/events/'+id};
}
test('default ID path compiles and transaction stores exactly one event',async()=>{const h=harness(),v=await h.create(undefined);assert.equal(v.id,'generated-1');assert.equal(h.rows.size,1);assert.equal(h.writes(),1);});
test('lost response retry returns existing event and preserves moderation; different content rejected',async()=>{const h=harness(),id=h.api.newEventId('house');h.lose();await assert.rejects(h.create(id),/lost response/);const key=h.key(id);h.rows.set(key,{...h.rows.get(key),moderationStatus:'hidden'});const v=await h.create(id);assert.equal(v.moderationStatus,'hidden');assert.equal(h.writes(),1);await assert.rejects(h.create(id,{title:'Changed'}));assert.equal(h.rows.get(key).title,'Ngày vui');assert.equal(h.writes(),1);});
test('corrupt persisted scope is not normalized into a successful retry',async()=>{const h=harness(),id='stable';await h.create(id);const key=h.key(id),saved=h.rows.get(key);for(const patch of [{id:'another'},{familyId:'other'},{dateISO:'invalid'}]){h.rows.set(key,{...saved,...patch});await assert.rejects(h.create(id));}assert.equal(h.writes(),1);});
test('auth changes after transaction read prevent any write',async()=>{const h=harness();h.onRead(()=>{h.auth.currentUser={uid:'bob'};});await assert.rejects(h.create('stable'));assert.equal(h.writes(),0);});
