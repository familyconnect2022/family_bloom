import AsyncStorage from '@react-native-async-storage/async-storage';
import {normalizeRecent,rememberRecentArticle,forgetRecent,updateRecentCover,type RecentArticle} from './recentArticles.cjs';
export type {RecentArticle} from './recentArticles.cjs';
const flights=new Map<string,Promise<unknown>>();
// Serialize the read/modify/write transaction per authenticated UID and house.
function access<T>(uid:string,familyId:string,fn:(store:{getItem(key:string):string|null;setItem(key:string,value:string):void})=>Promise<T>|T):Promise<T>{
 const k='bloom:learning:recent:v1:'+encodeURIComponent(uid)+':'+encodeURIComponent(familyId),old=flights.get(k)||Promise.resolve();
 const job=old.catch(()=>{}).then(async()=>{let value=await AsyncStorage.getItem(k);let changed=false;const store={getItem:(key:string)=>key===k?value:null,setItem:(key:string,v:string)=>{if(key!==k)throw Error('RECENT_SCOPE');value=v;changed=true;}};const result=await fn(store);if(changed&&value!==null)await AsyncStorage.setItem(k,value);return result;});
 flights.set(k,job);void job.finally(()=>{if(flights.get(k)===job)flights.delete(k);}).catch(()=>{});return job;
}
export const readNativeRecent=(uid:string,fid:string)=>access(uid,fid,s=>normalizeRecent(s,uid,fid)).catch(()=>[] as RecentArticle[]);
export const rememberNativeRecent=(uid:string,fid:string,a:Pick<RecentArticle,'articleId'|'articleRevision'|'title'|'coverMediaId'|'authorName'>,community:boolean)=>access(uid,fid,s=>rememberRecentArticle(s,uid,fid,a,community)).catch(()=>{});
export const forgetNativeRecent=(uid:string,fid:string,id:string)=>access(uid,fid,s=>forgetRecent(s,uid,fid,id)).catch(()=>{});
export const updateNativeRecentCover=(uid:string,fid:string,item:RecentArticle,cover:string|null)=>access(uid,fid,s=>updateRecentCover(s,uid,fid,item,cover)).catch(()=>{});
