/** Native parity for the Web Preview lease. Explicitly opt-in for test UIDs.
 * This does not invalidate direct Firestore/Storage ID tokens on an old device;
 * production security requires coordinated Firebase Rules + token migration. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createNativeLeaseManager,NativeSessionGateError,type LeaseResponse,type LeaseUser,type NativeLease} from './nativeSingleSessionCore.cjs';

declare const process:{env:Record<string,string|undefined>};
const selectedUids=(process.env.EXPO_PUBLIC_SINGLE_SESSION_TEST_UIDS||'').split(',').map(x=>x.trim()).filter(Boolean);
const enabled=process.env.EXPO_PUBLIC_SINGLE_SESSION_PREVIEW==='1';
const rawEndpoint=(process.env.EXPO_PUBLIC_SINGLE_SESSION_API_URL||'').trim();

function endpoint(){
  let url:URL;
  try{url=new URL(rawEndpoint);}catch{throw new NativeSessionGateError('config','Chưa cấu hình địa chỉ Gateway phiên Android.');}
  if(url.protocol!=='https:'||url.username||url.password||url.hash||url.search||url.pathname!=='/session')
    throw new NativeSessionGateError('config','Gateway phải là URL HTTPS kết thúc bằng /session.');
  return url.toString();
}

async function request(user:LeaseUser,action:'claim'|'check'|'release',token?:string):Promise<LeaseResponse>{
  const url=endpoint();
  const controller=new AbortController();
  let response:Response;
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
    // The deadline includes Firebase getIdToken(), which AbortController alone
    // cannot cancel if a native token refresh stalls without network.
    response=await Promise.race([
      (async()=>{
        const firebaseIdToken=await user.getIdToken();
        return fetch(url,{
          method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${firebaseIdToken}`,'X-Family-Bloom-Client':'android'},
          body:JSON.stringify({action,token}),signal:controller.signal,
        });
      })(),
      new Promise<Response>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Session deadline'));},8000);}),
    ]);
  }catch{
    throw new NativeSessionGateError('unreachable','Không kết nối được dịch vụ phiên. Hãy thử lại khi có mạng.');
  }finally{if(timer)clearTimeout(timer);}
  let body:unknown;
  try{body=await response.json();}catch{body=null;}
  const result=body as Partial<LeaseResponse>|null;
  if(response.status===409||result?.state==='replaced')return {state:'replaced'};
  if(response.status===401||response.status===403)throw new NativeSessionGateError('reauth','Tài khoản không được Gateway xác minh hoặc chưa thuộc nhóm thử nghiệm.');
  if(response.status===404||response.status===503)throw new NativeSessionGateError('config','Gateway chưa sẵn sàng hoặc cấu hình chưa đúng.');
  if(!response.ok||!result||result.state!=='active')throw new NativeSessionGateError('unreachable','Gateway không xác minh được phiên hiện tại.');
  if(action==='claim'&&(typeof result.token!=='string'||result.token.length!==43))
    throw new NativeSessionGateError('unreachable','Gateway không cấp mã phiên hợp lệ.');
  return {state:'active',token:result.token};
}
export const nativeSingleSessionPreview=createNativeLeaseManager({
  selected:(uid:string)=>enabled&&selectedUids.includes(uid),
  storage:AsyncStorage,
  transport:request,
});
export {NativeSessionGateError};
export type {NativeLease};
