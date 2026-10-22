#!/usr/bin/env node
'use strict';
/** H25R2R4: source preflight is dependency-free; VM scenarios run post install. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const c=read('src/services/games/nativeChessGameplayController.ts');
const x=read('src/services/games/nativeXiangqiGameplayController.ts');
const cb=read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt');
const xb=read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt');
const invite=read('src/components/games/FirebaseBoardInvitationGate.tsx');
let count=0;
function test(desc,condition){assert(condition,desc);console.log('PASS '+desc);++count;}
test('Firebase invitation tap is guarded synchronously before Firestore write',invite.includes('pendingAction.current=true;setBusyAction(') && invite.includes('pendingAction.current) return'));
test('Firebase invitation shows Android spinner for accept/decline/cancel',invite.includes("busyAction==='accept'") && invite.includes("busyAction==='decline'") && invite.includes("busyAction==='cancel'") && invite.includes('ActivityIndicator'));
test('Chess native confirms actions with visible indeterminate spinner, no covered help text',cb.includes('bloomSpinner.isIndeterminate = true') && cb.includes('bloomSpinner.visibility = View.VISIBLE') && cb.includes('text = "" // H25 UX: remove text'));
test('Chess decision is latched in native before JS dispatch',cb.indexOf('localActionInFlight = action') < cb.indexOf('emitGameAction(action)') && cb.includes('localActionInFlight != null'));
test('Chess controller has at most one decision and keeps requestId for retry',c.includes('if (chessDecisionBusy) return') && c.includes('requestId:decision.requestId') && c.includes('previous?.gameId === active.gameId && previous.action === action'));
test('Xiangqi native keeps own action latch and paints a loading spinner',xb.includes('private fun submitDecision(') && xb.includes('if(localActionInFlight != null') && xb.includes('drawDecisionSpinner(') && xb.includes('postInvalidateDelayed(110L'));
test('Xiangqi terminal result closes instantly before background server ACK',x.indexOf('markXiangqiResultDismissed(gameId)') < x.indexOf('void xiangqiSocketService.emitAck(XIANGQI_EVENTS.gameResultAck') && x.includes('XIANGQI_RESULT_ACK_BACKGROUND_FAILED'));
test('Xiangqi controller keeps one server requestId during retry',x.includes('if (xiangqiDecisionBusy) return') && x.includes('requestId:decision.requestId') && x.includes('prior?.gameId === g.gameId && prior.action === action'));
test('Chess/Xiangqi invite and recovery latch before asynchronous Firebase/Socket calls', ['chess','xiangqi'].every(kind=>{const lobby=read('src/app/(home)/(games)/home-'+kind+'.tsx');return lobby.includes('sendingRef.current=toUid;setSendingUid(toUid)') && lobby.includes('recoveringRef.current=true;setRecovering(true)') && lobby.includes('sending={sendingUid===person.uid}') && lobby.includes('ActivityIndicator')}));
test('Shared invite row shows targeted loading instead of a disabled-looking button',read('src/components/games/FamilyBoardGameLobbyVisuals.tsx').includes('sending?<') || (read('src/components/games/FamilyBoardGameLobbyVisuals.tsx').includes('sending ? <ActivityIndicator') && read('src/components/games/FamilyBoardGameLobbyVisuals.tsx').includes('Đang gửi…')));
test('Wire state carries pending/error to both independent native views',read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/NativeChessBoardState.kt').includes('val actionPending: String') && read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/NativeXiangqiBoardState.kt').includes('val actionPending: String'));
if(process.argv.includes('--source-only')){console.log(`H25R2R4 TOUCH PRE-INSTALL ${count}/${count} PASS`);process.exit(0)}
let ts;try{ts=require('typescript')}catch(err){console.error('Requires local TypeScript; run ENSURE_GATE_DEPENDENCIES after updater.');process.exit(1)}
const flush=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
const watchdog=setTimeout(()=>{console.error('[FAIL] action regression hung waiting for an ACK');process.exit(2)},10000);
const setup=(source,mods)=>{
 const exports={};const mod={exports};const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(compiled,{module:mod,exports,require:key=>{if(!(key in mods))throw Error('unmocked '+key);return mods[key]},Date,Math,console,setTimeout,clearTimeout,requestAnimationFrame:fn=>setTimeout(fn,0)},{timeout:5000});
 return mod.exports;
};
(async()=>{
 const initial='8/8/8/8/8/8/8/8 w - - 0 1';
 const active={gameId:'touch-chess',familyId:'family',status:'active',fen:initial,turn:'w',revision:1,ply:0,whiteUid:'me',blackUid:'op',serverNowMs:Date.now(),whiteRemainingMs:180000,blackRemainingMs:180000};
 const chessSent=[],chessPaint=[],chessPending=[];
 class ChessMock{constructor(fen){this.value=fen||initial} fen(){return this.value} turn(){return 'w'} moves(){return []} get(){return undefined}}
 const cc=setup(c,{
  'react-native':{AppState:{currentState:'active',addEventListener:()=>({remove(){}})}},'chess.js':{Chess:ChessMock},
  '@react-native-firebase/auth':{getAuth:()=>({currentUser:{uid:'me'}})},
  '../../types/chess':{CHESS_ERROR_COPY:{},CHESS_EVENTS:{gameResign:'resign',drawOffer:'drawOffer',drawAccept:'drawAccept',drawReject:'drawReject',gameResync:'resync',gameJoin:'join',gameCatchup:'catchup'},applyChessMoveDelta:(s,d)=>({...s,...d})},
  '../chess/chessSocketService':{chessSocketService:{emitAck:(event,payload)=>{chessSent.push({event,payload});if(event==='resync'||event==='catchup')return Promise.resolve({ok:false,errorCode:'RESYNC'});return new Promise(resolve=>chessPending.push(resolve))}}},
  './boardGamePresentationDiagnostics':{emitBoardGamePresentationDiagnostic(){}},
  './boardGameNativeOverlay':{setBoardGameNativeChessState:async p=>{chessPaint.push(p);return {accepted:true}}},
  './boardGamePresentationStore':{markChessResultDismissed(){},closeBoardGamePresentationForGame(){}},
 });
 cc.syncNativeChessAuthoritativeState(active);await flush();
 const ca={gameId:active.gameId,action:'drawOffer'};
 const cp1=cc.handleNativeChessAction(ca),cp2=cc.handleNativeChessAction(ca);await flush();
 test('Chess: two immediate draw taps emit ONE Socket mutation',chessSent.filter(s=>s.event==='drawOffer').length===1);
 test('Chess: native receives pending before ACK',chessPaint.at(-1).actionPending==='drawOffer');
 const firstId=chessSent.find(s=>s.event==='drawOffer').payload.requestId;
 chessPending.shift()({ok:false,errorCode:'ACK_TIMEOUT'});await Promise.all([cp1,cp2]);await flush();
 test('Chess: failed ACK unlocks loading and shows actionable feedback',!chessPaint.at(-1).actionPending && chessPaint.at(-1).actionError.length>0);
 const cp3=cc.handleNativeChessAction(ca);await flush();
 test('Chess: retry preserves idempotent requestId',chessSent.filter(s=>s.event==='drawOffer').at(-1).payload.requestId===firstId);
 chessPending.shift()({ok:true,data:{...active,drawOfferByUid:'me',revision:2}});await cp3;await flush();
 test('Chess: acknowledged command clears spinner',!chessPaint.at(-1).actionPending && chessPaint.at(-1).actionCompleted.includes(firstId));
 cc.clearNativeChessSession();
 const xstate={gameId:'touch-xq',familyId:'family',redUid:'me',blackUid:'op',status:'active',revision:1,
   board:{turn:'red',pieces:[],lastMove:null,moveNumber:1},serverNowMs:Date.now(),createdAt:new Date().toISOString(),
   redRemainingMs:180000,blackRemainingMs:180000,preparationPhase:'play',result:null,finishReason:null,timeControl:{initialMs:180000,incrementMs:2_000}};
 const xqSent=[],xqPaint=[],xqPending=[];
 const xc=setup(x,{
  'react-native':{AppState:{currentState:'active',addEventListener:()=>({remove(){}})}},
  '@react-native-firebase/auth':{getAuth:()=>({currentUser:{uid:'me',displayName:'Me',photoURL:null}})},
  '../xiangqi/xiangqiSocketService':{xiangqiSocketService:{isConnected:()=>true,emitAck:(event,payload)=>{xqSent.push({event,payload});if(event==='xiangqi:game:resync'||event==='xiangqi:game:catchup')return Promise.resolve({ok:false,errorCode:'RESYNC'});return new Promise(resolve=>xqPending.push(resolve))}}},
  '../profile/profileService':{profileService:{get:async()=>null}},
  '../xiangqi/xiangqiLocalRules':{legalForColor:()=>[]},
  '../../types/xiangqiRealtime':{XIANGQI_EVENTS:{gameResign:'resign',gameDrawOffer:'drawOffer',gameDrawAccept:'drawAccept',gameDrawDecline:'drawDecline',gameResync:'xiangqi:game:resync',gameCatchup:'xiangqi:game:catchup'}},
  './boardGameNativeOverlay':{setBoardGameNativeXiangqiState:async p=>{xqPaint.push(p);return {accepted:true}}},
  './boardGamePresentationStore':{closeBoardGamePresentationForGame(){},markXiangqiResultDismissed(){}},
  './boardGamePresentationDiagnostics':{emitBoardGamePresentationDiagnostic(){}},
 });
 xc.syncNativeXiangqiAuthoritativeState(xstate);await flush();
 const xa={gameId:xstate.gameId,action:'resign'};
 const xp1=xc.handleNativeXiangqiAction(xa),xp2=xc.handleNativeXiangqiAction(xa);await flush();
 test('Xiangqi: two immediate resign taps emit ONE Socket mutation',xqSent.filter(s=>s.event==='resign').length===1);
 test('Xiangqi: native receives pending before ACK',xqPaint.at(-1).actionPending==='resign');
 const xid=xqSent.find(s=>s.event==='resign').payload.requestId;
 xqPending.shift()({ok:false,errorCode:'ACK_TIMEOUT'});await Promise.all([xp1,xp2]);await flush();
 test('Xiangqi: failed ACK unlocks and shows error',!xqPaint.at(-1).actionPending && xqPaint.at(-1).actionError.length>0);
 const xp3=xc.handleNativeXiangqiAction(xa);await flush();
 test('Xiangqi: retry uses SAME requestId',xqSent.filter(s=>s.event==='resign').at(-1).payload.requestId===xid);
 xqPending.shift()({ok:true,data:{...xstate,revision:2,status:'finished',result:'black',finishReason:'resignation'}});await xp3;await flush();
 test('Xiangqi: success clears pending and receives server result',!xqPaint.at(-1).actionPending && xqPaint.at(-1).status==='finished');
 xc.clearNativeXiangqiSession(xstate.gameId);
 clearTimeout(watchdog);console.log(`H25R2R4 TOUCH RUNTIME ${count}/${count} PASS`);
})().catch(err=>{console.error(err.stack||err);process.exitCode=1});
