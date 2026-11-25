"use strict";
// Local recovery is a separate, explicitly opted-in copy, not a cloud draft/revision.
const {validateMomentDraftFields}=require('./momentFormDraft.cjs');
const MAX=28*1024*1024;
const fail=code=>{throw Object.assign(Error(code),{code});};
const key=(uid,familyId)=>JSON.stringify([uid,familyId]);
const image=v=>typeof v==='string'&&v.length<=2796268&&/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(v);
const version=v=>typeof v==='string'&&/^[a-f0-9]{32}$/.test(v);
function validate(value,scope,allowVideo){
 if(!value||value.schema!==1||value.scope!==scope||!version(value.version)||!Number.isSafeInteger(value.savedAt)||value.savedAt<0||!Array.isArray(value.images)||value.images.length>10||!value.images.every(v=>image(v)||allowVideo&&typeof v==='string'&&v.length<=2796268&&/^data:video\/mp4;base64,[A-Za-z0-9+/]+={0,2}$/.test(v)))fail('LOCAL_DRAFT_INVALID');
 const fields=validateMomentDraftFields(value.fields);if(!fields.caption.trim()&&!value.images.length)fail('LOCAL_DRAFT_EMPTY');
 const record={schema:1,scope,version:value.version,savedAt:value.savedAt,fields,images:value.images.slice()};
 if(JSON.stringify(record).length>MAX)fail('LOCAL_DRAFT_TOO_LARGE');return record;
}
function createLocalMomentJournal(store,uid,familyId,newId,now=Date.now,allowVideo=false){
 if(typeof uid!=='string'||!uid||typeof familyId!=='string'||!familyId)fail('LOCAL_DRAFT_SCOPE');const scope=key(uid,familyId);
 return {async read(){const v=await store.read(scope);return v===null?null:validate(v,scope,allowVideo);},
 async save(fields,images,expected){if(expected!==null&&!version(expected))fail('LOCAL_DRAFT_INVALID');const v=validate({schema:1,scope,version:newId(),savedAt:now(),fields,images},scope,allowVideo);if(!await store.compareAndSet(scope,expected,v))fail('LOCAL_DRAFT_CONFLICT');return v;},
 async clear(expected){if(!version(expected))fail('LOCAL_DRAFT_INVALID');if(!await store.compareAndSet(scope,expected,null))fail('LOCAL_DRAFT_CONFLICT');}};
}
module.exports={createLocalMomentJournal};
