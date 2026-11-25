const MAX=16*1024*1024;
const fail=(code:string)=>Object.assign(Error(code),{code});
const cleanUrl=(value:unknown)=>{if(typeof value!=='string'||!/^https:\/\/api\.cloudinary\.com\//.test(value)||value.length>4096)throw fail('INVALID_FORM_RESPONSE');return value;};
export async function uploadDirectVideo(ticket:any,dataUrl:string){
 const p=ticket?.params;
 if(!/^[A-Za-z0-9_-]{1,100}$/.test(ticket?.cloudName??'')||typeof ticket?.apiKey!=='string'||!(/^[a-f0-9]{40}$|^[a-f0-9]{64}$/i.test(ticket?.signature??''))||!p||Object.keys(p).sort().join(',')!=='allowed_formats,overwrite,public_id,timestamp,type'||!/^family_bloom\/form_private\/[a-f0-9]{64}$/.test(p.public_id)||p.type!=='authenticated'||p.overwrite!=='false'||p.allowed_formats!=='mp4'||!Number.isSafeInteger(p.timestamp))throw fail('INVALID_FORM_RESPONSE');
 const form=new FormData();form.append('file',dataUrl);form.append('api_key',ticket.apiKey);form.append('signature',ticket.signature);for(const key of Object.keys(p))form.append(key,String(p[key]));
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),120000);
 try{const res=await fetch('https://api.cloudinary.com/v1_1/'+ticket.cloudName+'/video/upload',{method:'POST',body:form,signal:ctrl.signal});if(!res.ok)throw fail('FORM_DIRECT_VIDEO_UPLOAD_FAILED');}finally{clearTimeout(timer);}
}
export async function downloadDirectVideo(ticket:any):Promise<string>{
 const url=cleanUrl(ticket?.url),bytes=ticket?.bytes;
 if(!Number.isSafeInteger(bytes)||bytes<=2*1024*1024||bytes>MAX)throw fail('INVALID_FORM_RESPONSE');
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),120000);
 try{const res=await fetch(url,{signal:ctrl.signal,redirect:'error'});if(!res.ok||res.url&&!res.url.startsWith('https://api.cloudinary.com/'))throw fail('FORM_DIRECT_VIDEO_DOWNLOAD_FAILED');const blob=await res.blob();if(blob.size!==bytes)throw fail('FORM_DIRECT_VIDEO_IDENTITY');return await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(fail('FORM_DIRECT_VIDEO_DOWNLOAD_FAILED'));reader.onload=()=>{const value=reader.result;if(typeof value!=='string'||!/^data:[^,]*;base64,/.test(value))return reject(fail('FORM_DIRECT_VIDEO_DOWNLOAD_FAILED'));resolve('data:video/mp4;base64,'+value.split(',')[1]);};reader.readAsDataURL(blob);});}finally{clearTimeout(timer);}
}
