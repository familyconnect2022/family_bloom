import {File,Paths} from 'expo-file-system';
import {fetch as streamFetch} from 'expo/fetch';
import * as Legacy from 'expo-file-system/legacy';
import type {DirectVideoFile,DraftMediaData} from './momentFormDraft.cjs';
const MAX=32*1024*1024;
const fail=(code:string)=>Object.assign(Error(code),{code});
const cleanUrl=(value:unknown)=>{if(typeof value!=='string'||!/^https:\/\/api\.cloudinary\.com\//.test(value)||value.length>4096)throw fail('INVALID_FORM_RESPONSE');const url=new URL(value);if(url.protocol!=='https:'||url.hostname!=='api.cloudinary.com'||url.username||url.password||url.port||url.hash)throw fail('INVALID_FORM_RESPONSE');return value;};
export function directFileBytes(value:DirectVideoFile):number{if(typeof value.source!=='string'||!value.source.startsWith('file://'))return 0;const f=new File(value.source);return f.exists&&f.size===value.bytes?f.size:0;}
export async function uploadDirectVideo(ticket:any,dataUrl:DraftMediaData){
 const p=ticket?.params;
 if(!/^[A-Za-z0-9_-]{1,100}$/.test(ticket?.cloudName??'')||typeof ticket?.apiKey!=='string'||!(/^[a-f0-9]{40}$|^[a-f0-9]{64}$/i.test(ticket?.signature??''))||!p||Object.keys(p).sort().join(',')!=='allowed_formats,overwrite,public_id,timestamp,type'||!/^family_bloom\/form_private\/[a-f0-9]{64}$/.test(p.public_id)||p.type!=='authenticated'||p.overwrite!=='false'||p.allowed_formats!=='mp4'||!Number.isSafeInteger(p.timestamp))throw fail('INVALID_FORM_RESPONSE');
 if(typeof dataUrl!=='string'){if(directFileBytes(dataUrl)!==dataUrl.bytes||dataUrl.bytes<=2*1024*1024||dataUrl.bytes>MAX)throw fail('FORM_DIRECT_VIDEO_IDENTITY');const task=Legacy.createUploadTask('https://api.cloudinary.com/v1_1/'+ticket.cloudName+'/video/upload',dataUrl.source as string,{httpMethod:'POST',uploadType:Legacy.FileSystemUploadType.MULTIPART,fieldName:'file',mimeType:'video/mp4',parameters:{api_key:ticket.apiKey,signature:ticket.signature,...Object.fromEntries(Object.entries(p).map(([k,v])=>[k,String(v)]))}});const timer=setTimeout(()=>{void task.cancelAsync().catch(()=>{});},120000);try{const result=await task.uploadAsync();if(!result||result.status<200||result.status>=300)throw fail('FORM_DIRECT_VIDEO_UPLOAD_FAILED');return;}finally{clearTimeout(timer);}}
 const form=new FormData();form.append('file',dataUrl);form.append('api_key',ticket.apiKey);form.append('signature',ticket.signature);for(const key of Object.keys(p))form.append(key,String(p[key]));
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),120000);
 try{const res=await fetch('https://api.cloudinary.com/v1_1/'+ticket.cloudName+'/video/upload',{method:'POST',body:form,signal:ctrl.signal});if(!res.ok)throw fail('FORM_DIRECT_VIDEO_UPLOAD_FAILED');}finally{clearTimeout(timer);}
}
// Only files created by this adapter may be discarded or transferred.
const downloaded=new WeakSet<object>();
export function isDownloadedVideo(value:DirectVideoFile){return downloaded.has(value)&&directFileBytes(value)===value.bytes;}
export function discardDownloadedVideo(value:DraftMediaData){if(typeof value==='string'||!value||!downloaded.has(value))return;downloaded.delete(value);try{const f=new File(value.source as string);if(f.exists)f.delete();}catch{/* app-private cache, best effort */}}
export async function downloadDirectVideo(ticket:any):Promise<DraftMediaData>{
 const url=cleanUrl(ticket?.url),bytes=ticket?.bytes;
 if(!Number.isSafeInteger(bytes)||bytes<=2*1024*1024||bytes>MAX)throw fail('INVALID_FORM_RESPONSE');
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),120000);
 let file:File|undefined,created=false,complete=false;
 try{
  const res=await streamFetch(url,{signal:ctrl.signal,redirect:'error'});
  if(!res.ok||res.redirected||res.url&&!res.url.startsWith('https://api.cloudinary.com/'))throw fail('FORM_DIRECT_VIDEO_DOWNLOAD_FAILED');
  const declared=res.headers.get('content-length');if(declared!==null&&(!res.headers.get('content-encoding')||res.headers.get('content-encoding')==='identity')&&(!/^\d+$/.test(declared)||Number(declared)!==bytes))throw fail('FORM_DIRECT_VIDEO_IDENTITY');
  const reader=res.body?.getReader();if(!reader)throw fail('FORM_DIRECT_VIDEO_DOWNLOAD_FAILED');
  try{
   file=new File(Paths.cache,'fb-moment-private-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+'.mp4');file.create({overwrite:false});created=true;
   const writer=file.writableStream().getWriter();let size=0;
   try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>bytes)throw fail('FORM_DIRECT_VIDEO_IDENTITY');await writer.write(part.value);}if(size!==bytes)throw fail('FORM_DIRECT_VIDEO_IDENTITY');await writer.close();}catch(e){await writer.abort().catch(()=>{});throw e;}finally{writer.releaseLock();}
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  if(!file.exists||file.size!==bytes)throw fail('FORM_DIRECT_VIDEO_IDENTITY');
  const value=Object.freeze({kind:'direct-file' as const,bytes,source:file.uri});downloaded.add(value);complete=true;return value;
 }finally{clearTimeout(timer);if(created&&!complete&&file)try{if(file.exists)file.delete();}catch{/* partial cache file */}}
}
