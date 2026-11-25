import {getAuth} from '@react-native-firebase/auth';
import {ENV} from '../../../config/env';
const actions=new Set(['list','get','acquire','renew','release','stage','commit','read','uploadMedia','readMedia','listTrash','remove','restoreTrash','listFormDrafts','getFormDraft','saveFormDraft','trashFormDraft','restoreFormDraft','stageFormImage','readFormImage','saveFormImages','stageFormMedia','readFormMedia','saveFormMedia','prepareDirectFormVideo','confirmDirectFormVideo']);
export async function nativeDraftRequest(uid:string,familyId:string,body:Record<string,unknown>,signal:AbortSignal){
 const user=getAuth().currentUser,base=ENV.momentMediaApiUrl.trim().replace(/\/+$/,'');
 if(!user||user.uid!==uid)throw Object.assign(Error('AUTH_CHANGED'),{code:'AUTH_CHANGED'});
 if(!/^https:\/\/[^/?#]+$/.test(base)||!actions.has(String(body.action)))throw Object.assign(Error('INVALID_DRAFT_REQUEST'),{code:'INVALID_DRAFT_REQUEST'});
 const token=await user.getIdToken();if(getAuth().currentUser?.uid!==uid)throw Object.assign(Error('AUTH_CHANGED'),{code:'AUTH_CHANGED'});if(signal.aborted)throw Object.assign(Error('DRAFT_REQUEST_ABORTED'),{code:'DRAFT_REQUEST_ABORTED'});
 const response=await fetch(base+'/api/editor/draft',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({...body,familyId}),signal});
 const value=await response.json();if(getAuth().currentUser?.uid!==uid)throw Object.assign(Error('AUTH_CHANGED'),{code:'AUTH_CHANGED'});if(signal.aborted)throw Object.assign(Error('DRAFT_REQUEST_ABORTED'),{code:'DRAFT_REQUEST_ABORTED'});
 if(!response.ok||value?.ok!==true){const code=typeof value?.code==='string'&&/^[A-Z][A-Z0-9_]{2,63}$/.test(value.code)?value.code:'SYNC_HTTP_ERROR';throw Object.assign(Error(code),{code});}return value;
}
