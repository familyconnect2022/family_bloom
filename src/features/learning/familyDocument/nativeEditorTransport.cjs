'use strict';
const upload='uploadLocalArticleMedia';
const validId=id=>typeof id==='string'&&/^[a-f0-9]{32}$/.test(id);
const code=e=>typeof e?.code==='string'&&/^[A-Z][A-Z0-9_]{2,63}$/.test(e.code)?e.code:'SYNC_FAILED';
function createNativeEditorTransport({request,authorize,active,reply,setTimer=setTimeout,clearTimer=clearTimeout}){
 const flights=new Map();
 function cancel(){for(const f of flights.values()){clearTimer(f.timer);f.controller.abort();}flights.clear();}
 function receive(id,body){
  if(!validId(id)||!body||typeof body!=='object'||Array.isArray(body)||!active()||flights.has(id))return false;
  const action=body.action;if(typeof action!=='string')return false;
  if(flights.size>=2||flights.size&&(action!==upload||[...flights.values()].some(f=>f.action!==upload))){reply(id,false,'SESSION_BUSY');return false;}
  const controller=new AbortController(),f={controller,action,timer:null};flights.set(id,f);
  const finish=(ok,value)=>{if(flights.get(id)!==f)return;flights.delete(id);clearTimer(f.timer);if(active())reply(id,ok,value);};
  f.timer=setTimer(()=>{controller.abort();finish(false,'REQUEST_TIMEOUT');},action===upload?95000:60000);
  void Promise.resolve().then(async()=>{
   if(!active()||controller.signal.aborted)throw Object.assign(Error('AUTH_CHANGED'),{code:'AUTH_CHANGED'});
   if(action==='nativeAuthorizePublication'){await authorize();return {ok:true};}
   if(['publishLocalArticle','publishArticle','withdrawArticle','setLearningPenName','commit','remove'].includes(action))await authorize();
   if(!active()||controller.signal.aborted)throw Object.assign(Error('AUTH_CHANGED'),{code:'AUTH_CHANGED'});
   return request(body,controller.signal);
  }).then(v=>finish(true,v),e=>finish(false,code(e)));
  return true;
 }
 return {receive,cancel};
}
module.exports={createNativeEditorTransport};
