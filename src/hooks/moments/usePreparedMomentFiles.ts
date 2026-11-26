import {useCallback,useEffect,useRef,useState} from 'react';
import {File} from 'expo-file-system';
import type {MediaFile} from '../../types';
type State='ready'|'preparing'|'error';
/** Keep the synchronous file snapshot and readiness gate together, independent of image previews. */
export function usePreparedMomentFiles(){
 const [files,setList]=useState<MediaFile[]>([]),[status,setStatus]=useState<State>('ready');
 const current=useRef<MediaFile[]>([]),state=useRef<State>('ready'),epoch=useRef(0);
 useEffect(()=>()=>{epoch.current++;},[]);
 const setFiles=useCallback((value:MediaFile[]|((old:MediaFile[])=>MediaFile[]))=>{
  const next=typeof value==='function'?value(current.current):value;
  const turn=++epoch.current;current.current=[...next];setList(current.current);
  const update=(v:State)=>{if(turn===epoch.current){state.current=v;setStatus(v);}};
  if(!next.length){update('ready');return;}
  update('preparing');
  void Promise.all(next.map(async item=>{
   if(!item.uri||!item.mimeType)throw Error('FILE_NOT_READY');
   const file=new File(item.uri);if(!file.exists||file.size<=0)throw Error('FILE_NOT_READY');
   const bytes=await file.slice(0,1).arrayBuffer();if(bytes.byteLength!==1)throw Error('FILE_NOT_READY');
  })).then(()=>update('ready'),()=>update('error'));
 },[]);
 const getReadyFiles=useCallback(()=>state.current==='ready'?[...current.current]:null,[]);
 return {files,setFiles,status,getReadyFiles};
}
