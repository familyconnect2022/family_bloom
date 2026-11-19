'use strict';
/** Pure, dependency-injected Android preview lease state machine.
 * The Firebase-ID-token transport and device storage live in the native adapter.
 * This is a cooperative UI gate, NOT a replacement for Firebase Rules. */
class NativeSessionGateError extends Error {
  constructor(reason,message){super(message);this.name='NativeSessionGateError';this.reason=reason;}
}
const validLease=token=>typeof token==='string'&&/^[A-Za-z0-9_-]{43}$/.test(token);
function createNativeLeaseManager({selected,storage,transport}){
  let loginIntent=false;
  const key=uid=>`fb:native-sas-preview:v1:${uid}`;
  function markExplicitLogin(){loginIntent=true;}
  function clearExplicitLogin(){loginIntent=false;}
  function requiresSession(uid){return selected(uid);}
  async function forget(lease){
    if(!lease)return;
    try{if(await storage.getItem(key(lease.uid))===lease.token)await storage.removeItem(key(lease.uid));}
    catch{/* Sign-out must never depend on local storage availability. */}
  }
  async function check(user,lease){
    if(!lease||lease.uid!==user.uid||!validLease(lease.token))return 'replaced';
    const result=await transport(user,'check',lease.token);
    if(result.state!=='active'&&result.state!=='replaced')throw new NativeSessionGateError('unreachable','Dịch vụ trả về trạng thái phiên không hợp lệ.');
    return result.state;
  }
  async function activate(user){
    const explicit=loginIntent;
    loginIntent=false;
    if(!requiresSession(user.uid))return null;
    let stored;
    try{stored=await storage.getItem(key(user.uid));}
    catch{throw new NativeSessionGateError('config','Không đọc được bộ nhớ phiên bảo vệ trên thiết bị.');}
    if(explicit){
      const output=await transport(user,'claim');
      if(output.state!=='active'||!validLease(output.token))throw new NativeSessionGateError('unreachable','Không nhận được mã phiên hợp lệ.');
      try{await storage.setItem(key(user.uid),output.token);}
      catch{throw new NativeSessionGateError('config','Không lưu được phiên. Hãy kiểm tra bộ nhớ thiết bị.');}
      return {uid:user.uid,token:output.token};
    }
    if(!validLease(stored))throw new NativeSessionGateError('reauth','Cần đăng nhập lại để kích hoạt bảo vệ phiên.');
    const lease={uid:user.uid,token:stored};
    const state=await check(user,lease);
    if(state==='replaced'){
      await forget(lease);
      throw new NativeSessionGateError('replaced','Tài khoản này đã đăng nhập trên thiết bị hoặc trình duyệt khác.');
    }
    return lease;
  }
  async function release(user,lease){
    if(!lease)return;
    try{await transport(user,'release',lease.token);}catch{/* Local logout still succeeds offline. */}
    finally{await forget(lease);}
  }
  return {markExplicitLogin,clearExplicitLogin,requiresSession,activate,check,release,forget};
}
module.exports={createNativeLeaseManager,NativeSessionGateError,validLease};
