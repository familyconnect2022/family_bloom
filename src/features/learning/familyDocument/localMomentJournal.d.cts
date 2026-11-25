import type {MomentDraftFields} from './momentFormDraft.cjs';
export type LocalMomentRecord={schema:1;scope:string;version:string;savedAt:number;fields:MomentDraftFields;images:string[]};
export type LocalMomentStore={read:(scope:string)=>Promise<LocalMomentRecord|null>;compareAndSet:(scope:string,expected:string|null,value:LocalMomentRecord|null)=>Promise<boolean>};
export function createLocalMomentJournal(store:LocalMomentStore,uid:string,familyId:string,newId:()=>string,now?:()=>number,allowVideo?:boolean):{read:()=>Promise<LocalMomentRecord|null>;save:(fields:MomentDraftFields,images:string[],expected:string|null)=>Promise<LocalMomentRecord>;clear:(expected:string)=>Promise<void>};
