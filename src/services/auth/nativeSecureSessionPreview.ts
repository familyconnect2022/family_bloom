/** Firebase Rules-bound session V2 for an explicit Android Preview tester UID.
 * NOT active in the normal APK; requires backend, client and isolated Rules
 * migration to be approved and tested together. */
import {getAuth,signInWithCustomToken,type User} from '@react-native-firebase/auth';
import {NativeSessionGateError} from './nativeSingleSessionPreview';
declare const process:{env:Record<string,string|undefined>};

export type SecureSession={uid:string;sid:string};
const enabled=process.env.EXPO_PUBLIC_SESSION_ENFORCED_V2==='1'&&process.env.EXPO_PUBLIC_SINGLE_SESSION_PREVIEW==='1';
const selected=(process.env.EXPO_PUBLIC_SINGLE_SESSION_TEST_UIDS||'').split(',').map(x=>x.trim()).filter(Boolean);
const rawEndpoint=(process.env.EXPO_PUBLIC_SINGLE_SESSION_API_URL||'').trim();
let explicitIntent=false;
function endpoint(){
  let url:URL;
  try{url=new URL(rawEndpoint);}catch{throw new NativeSessionGateError('config','Thiếu cấu hình HTTPS Gateway bảo mật.');}
  if(url.protocol!=='https:'||url.username||url.password||url.hash||url.search||url.pathname!=='/session')
    throw new NativeSessionGateError('config','Gateway V2 phải là đường dẫn HTTPS /session.');
  return url.toString();
}
type ResponseV2={state:'active'|'replaced'|'reauth-required';customToken?:string};
async function request(user:User,action:'secure-claim'|'secure-check'|'secure-release'):Promise<ResponseV2>{
  const url=endpoint(),controller=new AbortController();
  let timer:ReturnType<typeof setTimeout>|undefined;
  let response:Response;
  try{
    response=await Promise.race([
      (async()=>{
        const idToken=await user.getIdToken();
        return fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${idToken}`,'X-Family-Bloom-Client':'android'},
          body:JSON.stringify({action}),signal:controller.signal});
      })(),
      new Promise<Response>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Deadline'));},8000);}),
    ]);
  }catch{throw new NativeSessionGateError('unreachable','Không xác minh được phiên bảo mật.');}
  finally{if(timer)clearTimeout(timer);}
  let body:any={};try{body=await response.json();}catch{}
  if(response.status===409||body?.state==='replaced')return {state:'replaced'};
  if(body?.state==='reauth-required')return {state:'reauth-required'};
  if(response.status===403&&body?.error==='Secure preview disabled')throw new NativeSessionGateError('config','Gateway V2 chưa được bật trên Preview.');
  if(!response.ok||body?.state!=='active')throw new NativeSessionGateError(response.status===401?'reauth':'unreachable','Không có quyền xác minh phiên bảo mật.');
  if(action==='secure-claim'&&(typeof body.customToken!=='string'||body.customToken.length<100))
    throw new NativeSessionGateError('unreachable','Gateway không cấp custom token hợp lệ.');
  return {state:'active',customToken:body.customToken};
}
async function sidOf(user:User){
  const claims=(await user.getIdTokenResult()).claims as Record<string,unknown>;
  const sid=claims.fbSessionSid;
  return claims.fbSessionVersion===2&&typeof sid==='string'&&/^[A-Za-z0-9_-]{43}$/.test(sid)?sid:null;
}
export const nativeSecureSessionPreview={
  requiresSession(uid:string){return enabled&&selected.includes(uid);},
  markExplicitLogin(){explicitIntent=true;},
  clearExplicitLogin(){explicitIntent=false;},
  async activate(user:User):Promise<SecureSession|null>{
    const explicit=explicitIntent;explicitIntent=false;
    if(!this.requiresSession(user.uid))return null;
    if(explicit){
      const claim=await request(user,'secure-claim');
      if(claim.state!=='active'||!claim.customToken)throw new NativeSessionGateError('reauth','Cần đăng nhập mới bằng Google hoặc OTP.');
      const result=await signInWithCustomToken(getAuth(),claim.customToken);
      if(result.user.uid!==user.uid)throw new NativeSessionGateError('reauth','Firebase trả về tài khoản không khớp.');
      user=result.user;
    }
    const sid=await sidOf(user);
    if(!sid)throw new NativeSessionGateError('reauth','Thiếu chứng thực phiên, cần đăng nhập lại.');
    const lease={uid:user.uid,sid};
    if(await this.check(user,lease)!=='active')throw new NativeSessionGateError('replaced','Phiên đã bị thay thế trên thiết bị khác.');
    return lease;
  },
  async check(user:User,lease:SecureSession):Promise<'active'|'replaced'>{
    if(user.uid!==lease.uid||await sidOf(user)!==lease.sid)return 'replaced';
    return (await request(user,'secure-check')).state==='active'?'active':'replaced';
  },
  async release(user:User,lease:SecureSession|null):Promise<void>{
    if(!lease)return;
    try{if(user.uid===lease.uid&&await sidOf(user)===lease.sid)await request(user,'secure-release');}
    catch{/* Local sign-out must finish if network is offline. */}
  },
};
