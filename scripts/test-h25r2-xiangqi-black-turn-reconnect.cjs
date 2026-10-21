'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
// Build & Share invokes this AFTER its dependency bootstrap on Windows.
const ts=(()=>{try{return require('typescript');}catch{
  const {execFileSync}=require('child_process');
  return require(path.join(execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim(),'typescript'));
}})();
const root=path.resolve(__dirname,'..');
const controller=fs.readFileSync(path.join(root,'src/services/games/nativeXiangqiGameplayController.ts'),'utf8');
const overlay=fs.readFileSync(path.join(root,'modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt'),'utf8');
const board=fs.readFileSync(path.join(root,'modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt'),'utf8');
let connected=true, catchupResolve;
const sent=[],painted=[];
const auth={currentUser:{uid:'human-black',displayName:'Tester',photoURL:null}};
const service={
  isConnected:()=>connected,
  emitAck:(event,payload)=>{
    sent.push({event,payload});
    if(event==='xiangqi:game:catchup')return new Promise(resolve=>{catchupResolve=resolve;});
    if(event==='xiangqi:game:move')return Promise.resolve({ok:true,data:{clientMoveId:payload.clientMoveId,version:2}});
    return Promise.resolve({ok:true,data:sample});
  },
};
const sample={gameId:'game-black',familyId:'family',redUid:'human-red',blackUid:'human-black',
  status:'active',revision:1,board:{pieces:[
    {id:'b1',color:'black',type:'soldier',col:0,row:3},
    {id:'r1',color:'red',type:'soldier',col:0,row:6},
  ],turn:'black',moveNumber:2,lastMove:null,gameOver:false,inCheck:null,winner:null,finishReason:null},
  redRemainingMs:588000,blackRemainingMs:580000,serverNowMs:Date.now(),createdAt:new Date().toISOString(),
  startedAt:new Date().toISOString(),endedAt:null,preparationPhase:'play',result:null,finishReason:null,
  timeControl:{kind:'clocked',initialMs:600000,incrementMs:0}};
const deps={
  'react-native':{AppState:{currentState:'active',addEventListener:()=>({remove(){}})}},
  '@react-native-firebase/auth':{getAuth:()=>auth},
  '../xiangqi/xiangqiSocketService':{xiangqiSocketService:service},
  '../profile/profileService':{profileService:{get:async()=>null}},
  '../xiangqi/xiangqiLocalRules':{legalForColor:(_b,id,side)=>id==='b1'&&side==='black'?[{col:0,row:4}]:[]},
  '../../types/xiangqiRealtime':{XIANGQI_EVENTS:{gameCatchup:'xiangqi:game:catchup',gameMove:'xiangqi:game:move'}},
  './boardGameNativeOverlay':{setBoardGameNativeXiangqiState:async state=>{painted.push(state);return {accepted:true,cached:false};}},
  './boardGamePresentationStore':{closeBoardGamePresentationForGame(){},markXiangqiResultDismissed(){}},
  './boardGamePresentationDiagnostics':{emitBoardGamePresentationDiagnostic(){}},
};
const transpiled=ts.transpileModule(controller,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}});
assert.deepStrictEqual(transpiled.diagnostics||[],[]);
const mod={exports:{}};
vm.runInNewContext(transpiled.outputText,{exports:mod.exports,require:(name)=>{
  if(!deps[name])throw Error('Unmocked dependency '+name);
  return deps[name];
},Date,console,setTimeout,clearTimeout,requestAnimationFrame:fn=>setTimeout(fn,0)},{filename:'nativeXiangqiGameplayController.cjs'});
const ctrl=mod.exports;
const flush=()=>new Promise(r=>setTimeout(r,1));
(async()=>{
  ctrl.syncNativeXiangqiAuthoritativeState(sample);await flush();
  assert.strictEqual(painted.at(-1).meColor,'black');
  assert.strictEqual(painted.at(-1).orientation,'black');
  assert.strictEqual(painted.at(-1).turn,'black');
  assert.strictEqual(painted.at(-1).canMove,true);
  console.log('PASS black orientation + active input from server turn');
  const ongoing=ctrl.resyncXiangqi(sample.gameId,'foreground'); await flush();
  assert(sent.some(x=>x.event==='xiangqi:game:catchup'),'Catchup should be in flight');
  assert.strictEqual(painted.at(-1).canMove,true);
  await ctrl.handleNativeXiangqiAction({gameId:sample.gameId,action:'square',col:0,row:3,source:'test'});await flush();
  assert.strictEqual(painted.at(-1).selectedPieceId,'b1','Black soldier must be selectable during catchup');
  await ctrl.handleNativeXiangqiAction({gameId:sample.gameId,action:'square',col:0,row:4,source:'test'});
  assert(sent.some(x=>x.event==='xiangqi:game:move'&&x.payload.expectedVersion===1&&x.payload.pieceId==='b1'),'Server-authoritative move with guarded revision');
  console.log('PASS black can select and send validated move while background catchup is pending');
  catchupResolve({ok:true,data:{mode:'unchanged',gameId:sample.gameId,revision:1,redRemainingMs:588000,blackRemainingMs:580000,serverNowMs:Date.now()}});
  await ongoing;await flush();
  assert.strictEqual(painted.at(-1).canMove,true);
  console.log('PASS catchup completes without leaving input locked');
  assert(overlay.includes('chessLayer.visibility = if (chessActive) View.VISIBLE else View.INVISIBLE'));
  assert(overlay.includes('xiangqiLayer.visibility = if (chessActive) View.INVISIBLE else View.VISIBLE'));
  assert(overlay.includes('NATIVE_XIANGQI_SQUARE_TAP'));
  assert(board.includes('onAction("inputBlocked",s.gameId)'));
  assert(board.includes('if(flip)8-colOnBoard else colOnBoard,if(flip)9-rowOnBoard else rowOnBoard'));
  console.log('PASS dormant game cannot absorb touches, native tap telemetry and black coordinate flip');
  connected=false;
  ctrl.setNativeXiangqiTransportConnected(false);await flush();
  assert.strictEqual(painted.at(-1).canMove,false);
  console.log('PASS disconnected transport remains guarded by server sync');
  console.log('H25R2 XIANGQI BLACK INPUT: 5/5 PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
