export type NativePublishRecord={uid:string;familyId:string;postId:string;digest:string;at:number};
export function sha256(value:string):string;
export function createNativeJournal(store:{getAllKeys:()=>Promise<readonly string[]>;getItem:(k:string)=>Promise<string|null>;setItem:(k:string,v:string)=>Promise<void>;removeItem:(k:string)=>Promise<void>}):{list:(uid:string,fid:string)=>Promise<NativePublishRecord[]>;mark:(post:unknown,at?:number)=>Promise<NativePublishRecord>;clear:(r:NativePublishRecord,confirmed:boolean)=>Promise<boolean>;matches:(r:NativePublishRecord,post:unknown)=>boolean};
