export type LeaseUser = {uid:string;getIdToken:()=>Promise<string>};
export type NativeLease = {uid:string;token:string};
export type LeaseResponse = {state:'active'|'replaced';token?:string};
export declare class NativeSessionGateError extends Error {
  reason:'replaced'|'reauth'|'unreachable'|'config';
  constructor(reason:'replaced'|'reauth'|'unreachable'|'config',message:string);
}
export declare function createNativeLeaseManager(input:{
  selected:(uid:string)=>boolean;
  storage:{getItem:(key:string)=>Promise<string|null>;setItem:(key:string,value:string)=>Promise<unknown>;removeItem:(key:string)=>Promise<unknown>};
  transport:(user:LeaseUser,action:'claim'|'check'|'release',token?:string)=>Promise<LeaseResponse>;
}):{
  markExplicitLogin:()=>void;
  clearExplicitLogin:()=>void;
  requiresSession:(uid:string)=>boolean;
  activate:(user:LeaseUser)=>Promise<NativeLease|null>;
  check:(user:LeaseUser,lease:NativeLease)=>Promise<'active'|'replaced'>;
  release:(user:LeaseUser,lease:NativeLease|null)=>Promise<void>;
  forget:(lease:NativeLease|null)=>Promise<void>;
};
