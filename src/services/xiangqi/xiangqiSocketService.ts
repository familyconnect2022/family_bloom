import { getAuth } from "@react-native-firebase/auth";
import { io, type Socket } from "socket.io-client";
import { ENV } from "../../config/env";
import { XIANGQI_EVENTS, type XiangqiAck, type XiangqiMoveDelta, type XiangqiRealtimeState } from "../../types/xiangqiRealtime";
class XiangqiSocketService{
 private socket:Socket|null=null;private connecting:Promise<Socket>|null=null;
 private stateListeners=new Set<(s:XiangqiRealtimeState)=>void>();private moveListeners=new Set<(d:XiangqiMoveDelta)=>void>();private connectedListeners=new Set<()=>void>();private disconnectedListeners=new Set<()=>void>();
 async prewake(){if(!ENV.chessSocketUrl)throw new Error("XIANGQI_SOCKET_URL_MISSING");const c=new AbortController();const t=setTimeout(()=>c.abort(),65000);try{const r=await fetch(`${ENV.chessSocketUrl.replace(/\/$/,"")}/health`,{signal:c.signal});if(!r.ok)throw new Error(`XIANGQI_HEALTH_HTTP_${r.status}`);return await r.json().catch(()=>({ok:true}));}finally{clearTimeout(t);}}
 async connect(){if(this.socket?.connected)return this.socket;if(this.connecting)return this.connecting;const task=this.connectInternal();this.connecting=task;try{return await task;}finally{if(this.connecting===task)this.connecting=null;}}
 private async connectInternal(){if(!ENV.chessSocketUrl)throw new Error("XIANGQI_SOCKET_URL_MISSING");const user=getAuth().currentUser;if(!user)throw new Error("XIANGQI_UNAUTHORIZED");const token=await user.getIdToken(false);if(!this.socket){this.socket=io(ENV.chessSocketUrl,{autoConnect:false,transports:["websocket","polling"],auth:{token},reconnection:true,reconnectionAttempts:Infinity,reconnectionDelay:600,reconnectionDelayMax:4000,retries:2,ackTimeout:12000});this.socket.on("connect",()=>this.connectedListeners.forEach(fn=>fn()));this.socket.on("disconnect",()=>this.disconnectedListeners.forEach(fn=>fn()));this.socket.on(XIANGQI_EVENTS.gameState,(s:XiangqiRealtimeState)=>this.stateListeners.forEach(fn=>fn(s)));this.socket.on(XIANGQI_EVENTS.gameMoveApplied,(d:XiangqiMoveDelta)=>this.moveListeners.forEach(fn=>fn(d)));this.socket.io.on("reconnect_attempt",async()=>{const u=getAuth().currentUser;if(u&&this.socket)this.socket.auth={token:await u.getIdToken(false)};});}else this.socket.auth={token};const s=this.socket;if(!s.connected)s.connect();await new Promise<void>((resolve,reject)=>{if(s.connected)return resolve();const done=()=>{clearTimeout(timer);s.off("connect",done);resolve();};const timer=setTimeout(()=>{s.off("connect",done);reject(new Error("XIANGQI_CONNECT_TIMEOUT"));},70000);s.once("connect",done);});return s;}
 onState(fn:(s:XiangqiRealtimeState)=>void){this.stateListeners.add(fn);return()=>this.stateListeners.delete(fn);}
 onMove(fn:(d:XiangqiMoveDelta)=>void){this.moveListeners.add(fn);return()=>this.moveListeners.delete(fn);}
 onConnected(fn:()=>void){this.connectedListeners.add(fn);return()=>this.connectedListeners.delete(fn);}
 onDisconnected(fn:()=>void){this.disconnectedListeners.add(fn);return()=>this.disconnectedListeners.delete(fn);}
 async emitAck<T=undefined>(event:string,payload:unknown,timeout=12000):Promise<XiangqiAck<T>>{try{const s=await this.connect();return await new Promise(resolve=>s.timeout(timeout).emit(event,payload,(error:Error|null,response:XiangqiAck<T>)=>resolve(error?{ok:false,errorCode:"XIANGQI_SERVER_RECOVERING",message:error.message} as XiangqiAck<T>:response)));}catch(e){return {ok:false,errorCode:"XIANGQI_SERVER_RECOVERING",message:e instanceof Error?e.message:String(e)} as XiangqiAck<T>;}}
 emitBestEffort(event:string,payload:unknown){if(this.socket?.connected)this.socket.emit(event,payload,()=>undefined);}
 isConnected(){return !!this.socket?.connected;}
}
export const xiangqiSocketService=new XiangqiSocketService();
