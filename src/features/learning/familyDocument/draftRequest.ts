import {getAuth} from '@react-native-firebase/auth';
import {ENV} from '../../../config/env';
const actions=new Set(['listArticles','articleCoverOptions','articleStatus','publishArticle','readArticle','readArticleMedia','withdrawArticle','list','get','acquire','renew','release','stage','commit','read','uploadMedia','readMedia','listTrash','remove','restoreTrash','listFormDrafts','getFormDraft','saveFormDraft','trashFormDraft','restoreFormDraft','stageFormImage','readFormImage','saveFormImages','stageFormMedia','readFormMedia','saveFormMedia','prepareDirectFormVideo','confirmDirectFormVideo']);
export async function nativeDraftRequest(uid:string,familyId:string,body:Record<string,unknown>,signal:AbortSignal){
 const user=getAuth().currentUser,base=ENV.momentMediaApiUrl.trim().replace(/\/+$/,'');
 if(!user||user.uid!==uid)throw Object.assign(Error('AUTH_CHANGED'),{code:'AUTH_CHANGED'});
 if(!/^https:\/\/[^/?#]+$/.test(base)||!actions.has(String(body.action)))throw Object.assign(Error('INVALID_DRAFT_REQUEST'),{code:'INVALID_DRAFT_REQUEST'});
 let authTimer:ReturnType<typeof setTimeout>|undefined;const token=await Promise.race([user.getIdToken(),new Promise<never>((_,reject)=>{authTimer=setTimeout(()=>reject(Object.assign(Error('AUTH_TIMEOUT'),{code:'AUTH_TIMEOUT'})),15000);})]).finally(()=>{if(authTimer)clearTimeout(authTimer);});if(getAuth().currentUser?.uid!==uid)throw Object.assign(Error('AUTH_CHANGED'),{code:'AUTH_CHANGED'});if(signal.aborted)throw Object.assign(Error('DRAFT_REQUEST_ABORTED'),{code:'REQUEST_TIMEOUT'});
 const response=await fetch(base+'/api/editor/draft',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({...body,familyId}),signal}).catch(e=>{throw Object.assign(Error(signal.aborted?'REQUEST_TIMEOUT':'NETWORK_ERROR'),{code:signal.aborted?'REQUEST_TIMEOUT':'NETWORK_ERROR'});});
 const value=await response.json().catch(()=>{throw Object.assign(Error('INVALID_RESPONSE'),{code:'INVALID_RESPONSE'});});if(getAuth().currentUser?.uid!==uid)throw Object.assign(Error('AUTH_CHANGED'),{code:'AUTH_CHANGED'});if(signal.aborted)throw Object.assign(Error('DRAFT_REQUEST_ABORTED'),{code:'REQUEST_TIMEOUT'});
 if(!response.ok||value?.ok!==true){const code=typeof value?.code==='string'&&/^[A-Z][A-Z0-9_]{2,63}$/.test(value.code)?value.code:'SYNC_HTTP_ERROR';throw Object.assign(Error(code),{code});}return value;
}

export function nativeArticleRequest(uid:string,familyId:string){return async(body:Record<string,unknown>)=>{const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),35000);try{return await nativeDraftRequest(uid,familyId,body,ctrl.signal);}finally{clearTimeout(timer);}};}
