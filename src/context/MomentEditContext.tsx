import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {getAuth} from '@react-native-firebase/auth';
import {useAuth} from './AuthContext';
import {useBloomTaskToast} from '../hooks/ui/useBloomTaskToast';
import {mediaService} from '../services/media/mediaService';
import {momentsService} from '../services/moments/momentsService';
import {momentUploadErrorMessage} from '../services/media/momentUploadError';
import {recordMomentUploadFailure} from '../services/media/momentUploadDiagnostic';
import {momentUploadToastStore} from '../services/moments/momentUploadToastStore';
import type {MediaFile} from '../types';
import type {MomentMedia,MomentPost} from '../types/moments';
type Uploaded={fileId:string;assetId:string;media:MomentMedia;metadataSynced:boolean};
export type MomentEditInput={post:MomentPost;uid:string;familyId:string;caption:string;richBody:string|null;existing:MomentMedia[];files:MediaFile[];personIds:string[];audience:'self'|'family'|'persons';notify:boolean;uploaded:Uploaded[]};
type EditTask={input:MomentEditInput;status:'running'|'failed';uploaded:Uploaded[];error?:string;progress:number};
type ContextValue={task:EditTask|null;startEdit:(input:MomentEditInput)=>boolean;retryEdit:()=>void;discardEdit:()=>void};
const Context=createContext<ContextValue|null>(null);
export const useMomentEdit=()=>{const v=useContext(Context);if(!v)throw Error('MOMENT_EDIT_PROVIDER_MISSING');return v;};
const scopeKey=(uid:string,familyId:string)=>JSON.stringify([uid,familyId]);
export function MomentEditProvider({children}:{children:React.ReactNode}){
 const {user,activeFamilyId}=useAuth();const scope=scopeKey(user?.uid||'',activeFamilyId||'');
 const currentScope=useRef(scope);currentScope.current=scope;
 const tasks=useRef(new Map<string,EditTask>()),running=useRef(false);
 const [snapshot,setSnapshot]=useState<EditTask|null>(null);
 const {finishTask,failTask}=useBloomTaskToast();
 useEffect(()=>{setSnapshot(tasks.current.get(scope)??null);const toast=momentUploadToastStore.getSnapshot();if(toast?.operation==='edit')momentUploadToastStore.clear(toast.localId);},[scope]);
 const store=useCallback((key:string,task:EditTask|null)=>{if(task)tasks.current.set(key,task);else tasks.current.delete(key);if(currentScope.current===key)setSnapshot(task);},[]);
 const run=useCallback(async(input:MomentEditInput)=>{
  const key=scopeKey(input.uid,input.familyId),uploaded=new Map(input.uploaded.map(x=>[x.fileId,x]));
  const guard=()=>{if(currentScope.current!==key||getAuth().currentUser?.uid!==input.uid)throw Error('AUTH_CHANGED');};
  const localId='edit-'+input.post.id;let stage:'upload'|'publish'='upload';let lastProgress=-1;
  const report=(percent:number,file?:MediaFile)=>{const value=Math.max(0,Math.min(100,Math.round(percent)));if(currentScope.current!==key||value===lastProgress)return;lastProgress=value;momentUploadToastStore.set({localId,operation:'edit',status:stage==='publish'?'publishing':'uploading',progress:value,thumbnailUri:file?.uri,video:file?.type==='video'});};
  const saveCheckpoint=(item:Uploaded)=>{uploaded.set(item.fileId,item);store(key,{input,status:'running',uploaded:[...uploaded.values()],progress:Math.round(uploaded.size/Math.max(1,input.files.length)*100)});};
  try{
   guard();report(0,input.files[0]);
   for(let i=0;i<input.files.length;i++){
    guard();const file=input.files[i];if(uploaded.has(file.id))continue;
    try{
     const result=await mediaService.uploadManaged(file,{ownerUid:input.uid,familyId:input.familyId,purpose:'moment',entityType:'moment',entityId:input.post.id,category:'moments'},p=>report((i+p/100)/Math.max(1,input.files.length)*100,file));
     saveCheckpoint({fileId:file.id,assetId:result.asset.id,metadataSynced:true,media:{id:result.asset.id,type:file.type,secureUrl:result.result.secureUrl,publicId:result.result.publicId,thumbnailUrl:result.result.thumbnailUrl||undefined,width:file.width??undefined,height:file.height??undefined,duration:file.duration??undefined}});
    }catch(error){
     const checkpoint=(error as {managedUploadCheckpoint?:{asset:{id:string};result:{secureUrl:string;publicId:string;thumbnailUrl?:string|null}}}|null)?.managedUploadCheckpoint;
     if(!checkpoint)throw error;
     saveCheckpoint({fileId:file.id,assetId:checkpoint.asset.id,metadataSynced:false,media:{id:checkpoint.asset.id,type:file.type,secureUrl:checkpoint.result.secureUrl,publicId:checkpoint.result.publicId,thumbnailUrl:checkpoint.result.thumbnailUrl||undefined,width:file.width??undefined,height:file.height??undefined,duration:file.duration??undefined}});
    }
   }
   for(const item of uploaded.values()){guard();if(!item.metadataSynced){await mediaService.setUploaded(item.assetId,{secureUrl:item.media.secureUrl,publicId:item.media.publicId,thumbnailUrl:item.media.thumbnailUrl||'',resourceType:item.media.type});saveCheckpoint({...item,metadataSynced:true});}}
   const added=input.files.map(file=>uploaded.get(file.id));if(added.some(x=>!x||!x.metadataSynced))throw Error('FILE_NOT_READY');
   const complete=added.filter((x):x is Uploaded=>!!x);const oldIds=new Set(input.post.mediaAssetIds||[]);
   const nextIds=[...input.existing.map(x=>x.id).filter(x=>oldIds.has(x)),...complete.map(x=>x.assetId)];
   guard();stage='publish';lastProgress=-1;report(100);
   await momentsService.updateOwnPost(input.familyId,input.post.id,{caption:input.caption,richBody:input.richBody,media:[...input.existing,...complete.map(x=>x.media)],personIds:input.audience==='persons'?input.personIds:[],timelineAudience:input.audience,notifyFamily:input.audience==='family'&&input.notify},nextIds,input.post);
   store(key,null);if(currentScope.current===key)finishTask({title:'Đã cập nhật kỷ niệm',message:'Những thay đổi của bạn đã được lưu.'});
  }catch(error){
   const message=(error as {code?:string})?.code==='PUBLISH_EDIT_CONFLICT'?'Kỷ niệm đã được sửa ở thiết bị khác. Bloom không ghi đè nội dung mới.':momentUploadErrorMessage(error,stage);
   recordMomentUploadFailure(error,stage);
   store(key,{input,status:'failed',uploaded:[...uploaded.values()],progress:Math.max(0,lastProgress),error:message});
   if(currentScope.current===key)failTask(error,{title:'Chưa cập nhật được kỷ niệm',message});
  }finally{momentUploadToastStore.clear(localId);running.current=false;}
 },[store,finishTask,failTask]);
 const startEdit=useCallback((input:MomentEditInput)=>{
  const key=scopeKey(input.uid,input.familyId);if(currentScope.current!==key||running.current||tasks.current.has(key)||momentUploadToastStore.getSnapshot())return false;
  if(input.post.familyId!==input.familyId||input.post.authorUid!==input.uid||input.existing.length+input.files.length>10)return false;
  running.current=true;const copy={...input,files:input.files.map(x=>({...x})),existing:input.existing.map(x=>({...x})),personIds:[...input.personIds],uploaded:[...input.uploaded]};
  store(key,{input:copy,status:'running',uploaded:copy.uploaded,progress:0});void run(copy);return true;
 },[run,store]);
 const retryEdit=useCallback(()=>{const task=tasks.current.get(currentScope.current);if(!task||task.status!=='failed'||running.current||momentUploadToastStore.getSnapshot())return;running.current=true;const input={...task.input,uploaded:task.uploaded};store(currentScope.current,{...task,input,status:'running',error:undefined});void run(input);},[run,store]);
 // Never delete uploaded assets here: the previous server commit may be uncertain.
 const discardEdit=useCallback(()=>{if(tasks.current.get(currentScope.current)?.status==='failed')store(currentScope.current,null);},[store]);
 const value=useMemo(()=>({task:snapshot&&scopeKey(snapshot.input.uid,snapshot.input.familyId)===scope?snapshot:null,startEdit,retryEdit,discardEdit}),[scope,snapshot,startEdit,retryEdit,discardEdit]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
