'use strict';
// Shared catalogue of synced drafts. No lease takeover, purge or local draft upload.
const key=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v);
const date=v=>Number.isSafeInteger(v)&&v>=0&&v<=8640000000000000;
const text=v=>typeof v==='string'?Array.from(v.replace(/\s+/g,' ').trim()).slice(0,100).join(''):'';
function parsePage(kind,trash,value,priorCursor=null){
 if(!['learning','moment'].includes(kind)||!value||!Array.isArray(value.drafts)||value.drafts.length>30||value.cursor!=null&&(!key(value.cursor)||value.cursor===priorCursor))throw Error('INVALID_DRAFT_PAGE');
 const seen=new Set(),rows=[];
 for(const d of value.drafts){
  if(!d||!key(d.draftId)||seen.has(d.draftId)||!Number.isSafeInteger(d.revision)||d.revision<0)throw Error('INVALID_DRAFT_PAGE');
  seen.add(d.draftId);
  if(kind==='learning'&&!trash&&d.revisionPointer==null)continue; // uncommitted lease, not a recoverable document
  const at=trash?d.deletedAt:d.updatedAt;
  if(!date(at)||kind==='moment'&&(d.kind!=='moment-create'||(!trash&&d.deletedAt!=null)||!(/^[a-f0-9]{32}$/.test(d.draftId)))||kind==='learning'&&!trash&&d.kind!=='learning')throw Error('INVALID_DRAFT_PAGE');
  const title=text(kind==='learning'?d.title:d.summary?.preview);
  const count=d.summary?.imageCount;
  rows.push({kind,id:d.draftId,revision:d.revision,at,title:title||(kind==='learning'?'Tài liệu chưa có tên':'Kỷ niệm không có lời nhắn'),mediaCount:kind==='moment'&&Number.isInteger(count)&&count>=0&&count<=10?count:0,hasVideos:kind==='moment'&&d.summary?.hasVideos===true});
 }
 return {rows,cursor:value.cursor??null};
}
async function readPage(request,kind,trash,cursor=null){
 if(!['learning','moment'].includes(kind)||cursor!=null&&!key(cursor))throw Error('INVALID_DRAFT_PAGE');
 const body=kind==='learning'?{action:trash?'listTrash':'list',...(cursor?{cursor}:{})}:{action:'listFormDrafts',trash,includeSummary:true,...(cursor?{cursor}:{})};
 return parsePage(kind,trash,await request(body),cursor);
}
function mergeRows(old,added){const rows=new Map();for(const row of [...old,...added]){const k=row.kind+':'+row.id,prev=rows.get(k);if(!prev||row.revision>=prev.revision)rows.set(k,row);}return [...rows.values()].sort((a,b)=>b.at-a.at||a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id));}
// Central trash/restore uses existing revision-checked server contracts. Never take over an editor lease.
async function changeRow(request,row,trash,randomId){
 if(!row||!['learning','moment'].includes(row.kind)||!key(row.id)||!Number.isSafeInteger(row.revision)||row.revision<1||row.revision>=Number.MAX_SAFE_INTEGER||typeof trash!=='boolean')throw Error('INVALID_DRAFT_ACTION');
 const draftId=row.id,expectedRevision=row.revision;
 const matches=h=>h&&h.draftId===draftId&&h.revision===expectedRevision+1;
 const token=()=>{const v=randomId();if(typeof v!=='string'||!(/^[a-f0-9]{32}$/.test(v)))throw Error('INVALID_OPERATION_ID');return v;};
 if(row.kind==='moment'){
  if(!/^[a-f0-9]{32}$/.test(draftId))throw Error('INVALID_DRAFT_ACTION');
  const r=await request({action:trash?'trashFormDraft':'restoreFormDraft',draftId,expectedRevision,operationId:token()});
  if(r?.purgeEnabled!==false||!matches(r.draft)||r.draft.kind!=='moment-create'||(trash?!date(r.draft.deletedAt):r.draft.deletedAt!==null))throw Error('INVALID_DRAFT_ACTION_RESPONSE');
  return;
 }
 if(!trash){const r=await request({action:'restoreTrash',draftId,expectedRevision});if(r?.purgeEnabled!==false||!matches(r.draft)||r.draft.kind!=='learning'||!key(r.draft.revisionPointer))throw Error('INVALID_DRAFT_ACTION_RESPONSE');return;}
 const sessionId=token();const h=(await request({action:'acquire',draftId,sessionId,expectedRevision,kind:'learning',create:false,takeover:false}))?.draft;
 if(!h||h.draftId!==draftId||h.kind!=='learning'||h.revision!==expectedRevision||!key(h.revisionPointer)||h.lease?.sessionId!==sessionId||!Number.isSafeInteger(h.lease.fence)||h.lease.fence<1)throw Error('INVALID_DRAFT_LEASE');
 const fields={draftId,expectedRevision,sessionId,fence:h.lease.fence};let removed=false;
 try{const r=await request({action:'remove',...fields});if(r?.purgeEnabled!==false||r.removed!==true||!matches(r.trash)||!date(r.trash.deletedAt))throw Error('INVALID_DRAFT_ACTION_RESPONSE');removed=true;}
 finally{if(!removed){try{await request({action:'release',...fields});}catch{/* Lease expires; never force takeover or retry a destructive request blindly. */}}}
}
// In-memory, single-use navigation handoff; never put private draft IDs in a URL.
const validSelection=(v)=>v&&v.kind==='moment'&&typeof v.id==='string'&&/^[a-f0-9]{32}$/.test(v.id)&&Number.isSafeInteger(v.revision)&&v.revision>0;
function createMomentSelection(now=Date.now){let offer=null;return {
 queue(uid,familyId,row){offer=null;if(!key(uid)||!key(familyId)||!validSelection(row))return false;const at=now();if(!Number.isSafeInteger(at)||at<0)return false;offer={uid,familyId,id:row.id,revision:row.revision,at};return true;},
 take(uid,familyId){const value=offer;offer=null;const at=now();if(!value||value.uid!==uid||value.familyId!==familyId||!Number.isSafeInteger(at)||at<value.at||at-value.at>120000)return null;return {draftId:value.id,revision:value.revision};},
 clear(){offer=null;}
};}
const momentSelection=createMomentSelection();
function checkSelectedMoment(target,result){if(!target||!result||result.draftId!==target.draftId||(target.revision!==undefined&&result.revision!==target.revision)||result.deletedAt!==null)throw Object.assign(Error('REVISION_CONFLICT'),{code:'REVISION_CONFLICT'});return result;}
module.exports={parsePage,readPage,mergeRows,changeRow,createMomentSelection,momentSelection,checkSelectedMoment};
