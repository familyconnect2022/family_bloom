"use strict";
// Private Moment drafts, optional private image transport. IDs are operation identifiers, never credentials.
const {plainFieldDocument,readFieldDocument}=require('./formDocument.cjs');
const token=v=>typeof v==='string'&&/^[a-f0-9]{32}$/.test(v);
const fail=code=>{throw Object.assign(Error(code),{code});};
function fields(value){
 const {caption,richBody,audience,notify,personIds}=value;
 if(typeof caption!=='string'||!['self','family','persons'].includes(audience)||typeof notify!=='boolean'||!Array.isArray(personIds))fail('INVALID_FORM_FIELDS');
 plainFieldDocument(caption);
 if(richBody!==null&&!readFieldDocument(richBody,caption))fail('INVALID_FORM_RICH_BODY');
 const ids=audience==='persons'?[...new Set(personIds)]:[];
 if(ids.length>24||ids.some(x=>typeof x!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(x)))fail('INVALID_FORM_FIELDS');
 return {caption,richBody,audience,notify:audience==='family'&&notify,personIds:ids};
}
function head(v,id){if(!v||!token(v.draftId)||id!==undefined&&v.draftId!==id||v.kind!=='moment-create'||!Number.isSafeInteger(v.revision)||v.revision<1||!Number.isSafeInteger(v.updatedAt)||v.updatedAt<0||v.deletedAt!==null&&(!Number.isSafeInteger(v.deletedAt)||v.deletedAt<0))fail('INVALID_FORM_RESPONSE');return {draftId:v.draftId,kind:v.kind,revision:v.revision,updatedAt:v.updatedAt,deletedAt:v.deletedAt};}
function createMomentDraftClient({request,randomId,imagesEnabled=false,videosEnabled=false,directVideo=null}){
 let pending=null,imageJob=null,inFlight=false;
 const confirmedImages=new Map();
 function rememberImages(h,ids){confirmedImages.delete(h.draftId);confirmedImages.set(h.draftId,{revision:h.revision,ids:ids.slice()});if(confirmedImages.size>8)confirmedImages.delete(confirmedImages.keys().next().value);}
 const directFlag=directVideo?{includeDirectVideos:true}:{};
 const newId=()=>{const v=randomId();if(!token(v))fail('INVALID_DRAFT_ID');return v;};
 async function send(body){
  // Keep the exact operation across an ambiguous network failure. A different
  // body is not silently sent with the same idempotency key.
  if(pending&&JSON.stringify(pending.payload)!==JSON.stringify(body))fail('FORM_RETRY_REQUIRED');
  if(!pending)pending={payload:body,wire:{...body,operationId:newId()}};
  try{const out=await request(pending.wire);const result=head(out.draft,body.draftId);if(result.revision!==body.expectedRevision+1||((body.action==='trashFormDraft')!==(result.deletedAt!==null)))fail('INVALID_FORM_RESPONSE');if(['saveFormImages','saveFormMedia'].includes(body.action))rememberImages(result,body.imageIds);else confirmedImages.delete(result.draftId);pending=null;return result;}
  catch(e){if(['REVISION_CONFLICT','FORM_OPERATION_CONFLICT','FORM_STATE_CONFLICT','FORM_DRAFT_NOT_FOUND','INVALID_FORM_FIELDS','INVALID_FORM_RICH_BODY','FORM_ATTACHMENTS_UNSUPPORTED','FORM_IMAGES_CLIENT_REQUIRED','EDITOR_DRAFTS_DISABLED','FORM_DRAFTS_DISABLED','NOT_FAMILY_MEMBER','AUTH_CHANGED','INVALID_TOKEN','AUTH_REQUIRED','FORM_IMAGES_DISABLED','FORM_VIDEOS_DISABLED','FORM_VIDEOS_CLIENT_REQUIRED','INVALID_FORM_VIDEO','INVALID_FORM_IMAGES','FORM_IMAGE_NOT_FOUND','INVALID_IMAGE','EDITOR_IMAGE_TOO_LARGE','FORM_IMAGE_STAGE_LIMIT','FORM_IMAGE_IDENTITY_MISMATCH','FORM_IMAGE_CONFLICT','FORM_DIRECT_VIDEO_CLIENT_REQUIRED','FORM_DIRECT_VIDEO_DISABLED','FORM_DIRECT_VIDEO_LIMIT','FORM_DIRECT_VIDEO_IDENTITY'].includes(e?.code))pending=null;throw e;}
 }
 const validAsset=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
 const directBytes=x=>typeof x==='string'&&x.startsWith('data:video/mp4;base64,')?Math.floor(x.split(',')[1].length*3/4)-(x.endsWith('==')?2:x.endsWith('=')?1:0):0;
 const isDirect=x=>!!directVideo&&directBytes(x)>2*1024*1024&&directBytes(x)<=16*1024*1024&&/^data:video\/mp4;base64,[A-Za-z0-9+/]+={0,2}$/.test(x);
 const validData=x=>isDirect(x)||typeof x==='string'&&x.length<=2796268&&(/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(x)||videosEnabled&&/^data:video\/mp4;base64,[A-Za-z0-9+/]+={0,2}$/.test(x));
 async function runImageJob(){
  const job=imageJob;if(!job)fail('NO_PENDING_OPERATION');
  try{
   while(job.ids.length<job.data.length){const index=job.ids.length,value=job.data[index];let out;if(isDirect(value)){const args={draftId:job.draftId,expectedRevision:job.revision,uploadId:job.uploadIds[index],bytes:directBytes(value),...directFlag};const ticket=await request({action:'prepareDirectFormVideo',...args});if(ticket.ready===true){out=ticket;}else{if(!validAsset(ticket.assetId))fail('INVALID_FORM_RESPONSE');try{out=await request({action:'confirmDirectFormVideo',...args});}catch(e){if(e?.code!=='FORM_DIRECT_VIDEO_NOT_UPLOADED')throw e;await directVideo.upload(ticket.upload,value);out=await request({action:'confirmDirectFormVideo',...args});}if(out.assetId!==ticket.assetId)fail('INVALID_FORM_RESPONSE');}}else out=await request({action:videosEnabled?'stageFormMedia':'stageFormImage',draftId:job.draftId,expectedRevision:job.revision,dataUrl:value,...directFlag});if(!validAsset(out.assetId))fail('INVALID_FORM_RESPONSE');if(job.ids.includes(out.assetId))fail('FORM_DUPLICATE_IMAGE');job.ids.push(out.assetId);}
   const result=await send({action:videosEnabled?'saveFormMedia':'saveFormImages',draftId:job.draftId,expectedRevision:job.revision,imageIds:job.ids.slice(),fields:job.fields,...directFlag});imageJob=null;return result;
  }catch(e){if(['REVISION_CONFLICT','FORM_STATE_CONFLICT','FORM_DRAFT_NOT_FOUND','FORM_DUPLICATE_IMAGE','FORM_IMAGES_DISABLED','FORM_VIDEOS_DISABLED','FORM_VIDEOS_CLIENT_REQUIRED','INVALID_FORM_VIDEO','FORM_IMAGE_STAGE_LIMIT','INVALID_FORM_IMAGES','INVALID_IMAGE','EDITOR_IMAGE_TOO_LARGE','FORM_IMAGE_NOT_FOUND','FORM_IMAGE_IDENTITY_MISMATCH','FORM_IMAGE_CONFLICT','FORM_DIRECT_VIDEO_CLIENT_REQUIRED','FORM_DIRECT_VIDEO_DISABLED','FORM_DIRECT_VIDEO_LIMIT','FORM_DIRECT_VIDEO_IDENTITY','AUTH_CHANGED','INVALID_TOKEN','AUTH_REQUIRED','NOT_FAMILY_MEMBER','FORM_OPERATION_CONFLICT','FORM_DRAFTS_DISABLED','EDITOR_DRAFTS_DISABLED','INVALID_FORM_FIELDS','INVALID_FORM_RICH_BODY'].includes(e?.code)){imageJob=null;pending=null;}throw e;}
 }
 const api={
  pending:()=>inFlight||!!pending||!!imageJob,
  retry:()=>{if(imageJob)return runImageJob();if(!pending)fail('NO_PENDING_OPERATION');return send(pending.payload);},
  async list(trash=false,cursor=null,includeSummary=false){const out=await request({action:'listFormDrafts',trash,cursor,...(includeSummary?{includeSummary:true}:{})});if(!Array.isArray(out.drafts)||out.drafts.length>30||out.cursor!==null&&(!token(out.cursor)||out.cursor===cursor))fail('INVALID_FORM_RESPONSE');const drafts=out.drafts.map(v=>{const h=head(v);if(!includeSummary||v.summary===undefined)return h;const s=v.summary;if(!s||typeof s.preview!=='string'||Array.from(s.preview).length>80||!Number.isSafeInteger(s.imageCount)||s.imageCount<0||s.imageCount>10)fail('INVALID_FORM_RESPONSE');return {...h,summary:{preview:s.preview,imageCount:s.imageCount,...(s.hasVideos===true?{hasVideos:true}:{})}};});if(new Set(drafts.map(v=>v.draftId)).size!==drafts.length||drafts.some(v=>(v.deletedAt!==null)!==trash))fail('INVALID_FORM_RESPONSE');return {drafts,cursor:out.cursor};},
  async get(id){if(!token(id))fail('INVALID_DRAFT_ID');const out=await request({action:'getFormDraft',draftId:id,...(imagesEnabled?{includeImages:true,...(videosEnabled?{includeVideos:true}:{})}:{}),...directFlag});const h=head(out.draft,id);if(h.deletedAt!==null)fail('INVALID_FORM_RESPONSE');const f=fields(out.draft.fields);if(!imagesEnabled)return {...h,fields:f};const ids=out.draft.imageIds??[];if(!Array.isArray(ids)||ids.length>10||!ids.every(validAsset)||new Set(ids).size!==ids.length)fail('INVALID_FORM_RESPONSE');const images=[];for(const assetId of ids){const r=await request({action:videosEnabled?'readFormMedia':'readFormImage',draftId:id,assetId,...directFlag});const data=r.direct&&directVideo?await directVideo.download(r.direct):r.dataUrl;if(!validData(data)||r.direct&&(!isDirect(data)||directBytes(data)!==r.direct.bytes))fail('INVALID_FORM_RESPONSE');images.push(data);}if(ids.length){const verify=await request({action:'getFormDraft',draftId:id,includeImages:true,...(videosEnabled?{includeVideos:true}:{}),...directFlag});const latest=head(verify.draft,id);if(latest.revision!==h.revision||latest.deletedAt!==null||JSON.stringify(verify.draft.imageIds??[])!==JSON.stringify(ids))fail('REVISION_CONFLICT');}rememberImages(h,ids);return {...h,fields:f,images};},
  saveKeepingImages(value,current){if(!imagesEnabled)fail('FORM_IMAGES_DISABLED');if(pending||imageJob)fail('FORM_RETRY_REQUIRED');const refs=current&&confirmedImages.get(current.draftId);if(!current||current.deletedAt!==null||!refs||refs.revision!==current.revision||!refs.ids.length)fail('FORM_IMAGE_REFS_NOT_CONFIRMED');return send({action:videosEnabled?'saveFormMedia':'saveFormImages',draftId:current.draftId,expectedRevision:current.revision,imageIds:refs.ids.slice(),fields:fields(value),...directFlag});},
  saveImages(value,data,current){if(!imagesEnabled)fail('FORM_IMAGES_DISABLED');if(pending||imageJob)fail('FORM_RETRY_REQUIRED');if(current?.deletedAt!=null)fail('FORM_STATE_CONFLICT');if(!Array.isArray(data)||data.length>10||!data.every(validData)||data.filter(isDirect).length>2||data.filter(isDirect).reduce((n,x)=>n+directBytes(x),0)>32*1024*1024)fail('INVALID_FORM_IMAGES');const f=fields(value);if(!f.caption.trim()&&!data.length)fail('FORM_EMPTY');if(!current&&!data.length)return this.save(value,false,null);imageJob={draftId:current?.draftId??newId(),revision:current?.revision??0,fields:f,data:data.slice(),ids:[],uploadIds:data.map(x=>isDirect(x)?newId():null)};return runImageJob();},
  save(value,hasAttachments,current){if(imageJob)fail('FORM_RETRY_REQUIRED');if(hasAttachments)fail('FORM_ATTACHMENTS_UNSUPPORTED');if(current?.deletedAt!=null)fail('FORM_STATE_CONFLICT');const f=fields(value);if(!f.caption.trim())fail('FORM_EMPTY');return send({action:'saveFormDraft',kind:'moment-create',draftId:current?.draftId??newId(),expectedRevision:current?.revision??0,hasAttachments:false,fields:f});},
  trash(current){if(imageJob)fail('FORM_RETRY_REQUIRED');return send({action:'trashFormDraft',draftId:current.draftId,expectedRevision:current.revision});},
  restore(current){if(imageJob)fail('FORM_RETRY_REQUIRED');return send({action:'restoreFormDraft',draftId:current.draftId,expectedRevision:current.revision});}
 };
 // One mutation per scoped client. A second tap/autosave/retry must not
 // race the active staging loop or clear an operation it does not own.
 const exclusive=fn=>(...args)=>{if(inFlight)fail('FORM_RETRY_REQUIRED');inFlight=true;try{return Promise.resolve(fn.apply(api,args)).finally(()=>{inFlight=false;});}catch(e){inFlight=false;throw e;}};
 return Object.fromEntries(Object.entries(api).map(([key,fn])=>[key,['save','saveImages','saveKeepingImages','retry','trash','restore'].includes(key)?exclusive(fn):fn]));
}
module.exports={createMomentDraftClient,validateMomentDraftFields:fields};
