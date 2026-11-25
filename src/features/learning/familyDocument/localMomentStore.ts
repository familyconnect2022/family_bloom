import AsyncStorage from '@react-native-async-storage/async-storage';
import {Directory,File,Paths} from 'expo-file-system';
import type {LocalMomentRecord,LocalMomentStore} from './localMomentJournal.cjs';
// Durable app-private documents, not cache. Pointer flip after writing the inactive slot.
// Two slots per scope bound storage even if a process dies before cleanup.
const queue=new Map<string,Promise<unknown>>();
function serial<T>(scope:string,fn:()=>Promise<T>):Promise<T>{const task=(queue.get(scope)??Promise.resolve()).catch(()=>{}).then(fn);queue.set(scope,task);void task.finally(()=>{if(queue.get(scope)===task)queue.delete(scope);}).catch(()=>{});return task;}
const pointerKey=(scope:string)=>'family-bloom:local-moment:v1:'+scope;
function file(scope:string,slot:string){const dir=new Directory(Paths.document,'family-bloom-local-moment-v1');dir.create({idempotent:true,intermediates:true});const encoded=Array.from(scope).map(c=>c.codePointAt(0)!.toString(16)+'-').join('');if(encoded.length>1500)throw Error('LOCAL_DRAFT_SCOPE');const folder=new Directory(dir,...encoded.match(/.{1,120}/g)!);folder.create({idempotent:true,intermediates:true});return new File(folder,slot+'.json');}
async function readPointer(scope:string){const slot=await AsyncStorage.getItem(pointerKey(scope));if(slot!==null&&slot!=='a'&&slot!=='b')throw Error('LOCAL_DRAFT_INVALID');return slot;}
async function readRecord(scope:string,slot:string|null):Promise<LocalMomentRecord|null>{if(!slot)return null;const f=file(scope,slot);if(!f.exists||!f.size||f.size>30*1024*1024)throw Error('LOCAL_DRAFT_INVALID');return JSON.parse(await f.text()) as LocalMomentRecord;}
function remove(scope:string,slot:string){const f=file(scope,slot);if(f.exists)f.delete();}
export const localMomentStore:LocalMomentStore={read:scope=>serial(scope,async()=>{const slot=await readPointer(scope);if(!slot){remove(scope,'a');remove(scope,'b');return null;}return readRecord(scope,slot);}),compareAndSet:(scope,expected,value)=>serial(scope,async()=>{const old=await readPointer(scope),record=await readRecord(scope,old);if((record?.version??null)!==expected)return false;if(value===null){await AsyncStorage.removeItem(pointerKey(scope));remove(scope,'a');remove(scope,'b');return true;}const next=old==='a'?'b':'a';const f=file(scope,next);f.create({overwrite:true});const wire=JSON.stringify(value);f.write(wire);if(await f.text()!==wire)throw Error('LOCAL_DRAFT_STORAGE');await AsyncStorage.setItem(pointerKey(scope),next);if(old)try{remove(scope,old);}catch{/* previous slot overwritten at next save */}return true;})};
