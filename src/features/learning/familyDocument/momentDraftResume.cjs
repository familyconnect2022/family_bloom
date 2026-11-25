"use strict";
// Store only an opaque server draft pointer, never captions, media, tokens or unsaved text.
const validId=v=>typeof v==='string'&&/^[a-f0-9]{32}$/.test(v);
const scopeKey=(uid,familyId)=>'family-bloom:moment-draft:v1:'+JSON.stringify([uid,familyId]);
function createDraftResume(store,uid,familyId){
 const key=scopeKey(uid,familyId);
 return {
  async read(){try{const v=await store.getItem(key);return validId(v)?v:null;}catch{return null;}},
  async remember(id){if(!validId(id))return false;try{await store.setItem(key,id);return true;}catch{return false;}},
  async forget(id){if(!validId(id))return false;try{if(await store.getItem(key)===id)await store.removeItem(key);return true;}catch{return false;}}
 };
}
const AUTOSAVE_DELAY=2500,MEDIA_AUTOSAVE_DELAY=5000;
// Autosave never creates an unrequested draft, overwrites a conflict, or claims unsupported media was saved.
function canAutosave(s){return s.enabled===true&&!!s.current&&s.current.deletedAt===null&&!s.busy&&!s.retry&&!s.disabled&&(!s.hasAttachments||s.mediaSupported===true)&&typeof s.caption==='string'&&(!!s.caption.trim()||s.hasAttachments&&s.mediaSupported===true&&s.hasContent===true)&&s.saved!==s.stamp;}
module.exports={createDraftResume,canAutosave,AUTOSAVE_DELAY,MEDIA_AUTOSAVE_DELAY};
