'use strict';
// Shared, read-only catalogue of synced drafts. No lease takeover, mutation or local draft upload.
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
module.exports={parsePage,readPage,mergeRows};
