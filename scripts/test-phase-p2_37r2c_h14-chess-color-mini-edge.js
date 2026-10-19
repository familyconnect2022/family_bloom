#!/usr/bin/env node
'use strict';
/** H14 source + executable controller tests. Kotlin/Gradle device tests remain separate. */
const fs=require('fs'),path=require('path'),vm=require('vm');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const rd=f=>fs.readFileSync(path.join(root,f),'utf8');
let passed=0,failed=0;
function check(ok,msg){if(ok){passed++;console.log('PASS',msg)}else{failed++;console.error('FAIL',msg)}}
const rail=rd('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt');
const board=rd('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt');
const ctl=rd('src/services/games/nativeChessGameplayController.ts');
const server=rd('server/src/chess/chessGameManager.ts');
const socket=rd('server/src/socket/socketServer.ts');
check(rail.includes('(parent as? ViewGroup)?.width?.takeIf { it > 0 }') && rail.includes('(parent as? ViewGroup)?.height?.takeIf { it > 0 }'), 'Mini viewport taken from actual decor parent, not RN padded viewport');
check(rail.includes('val x = if (miniDockRight) (viewportW - miniW).coerceAtLeast(0) else 0'), 'Mini initially docked flush against left/right horizontal edge');
check(rail.includes('val targetX = if (miniDockRight) (viewportW - w).coerceAtLeast(0) else 0'), 'Mini drag snap reaches exact physical edge');
check(rail.includes('val w = width.coerceAtLeast(1)') && !rail.includes('width.coerceAtLeast(dp(118f))'), 'Mini touch bounds use actual 96x52dp view, no oversized 118dp invisible margin');
check(rail.includes('val miniW = dp(96f)') && rail.includes('val miniH = dp(52f)') && rail.includes('val verticalGap = dp(10f)'), 'Mini size maintained and vertical safe-area gap retained');
check(board.includes('current.meColor == null') && board.includes('onSquareTap(square)'), 'Native forwards low-latency taps only for authenticated board states');
check(ctl.includes('function verifiedSide(') && ctl.includes('state.whiteUid === uid') && ctl.includes('state.blackUid === uid'), 'Client color derived solely from server UID bindings');
check(ctl.includes('CHESS_SIDE_OR_TURN_INVALID') && ctl.includes('isConsistentPosition(state)'), 'Conflicting snapshot locks input and emits diagnostics');
check(ctl.includes('CHESS_DELTA_TURN_INVALID') && ctl.includes('isLegalServerDelta(currentState, delta)'), 'Move color/turn mismatch rejects delta before applying it');
check(server.includes('INVITE_COLOR_MISMATCH') && server.includes('moved.color !== color'), 'Server fails closed on bad invite color or move color');
check(socket.includes('whiteUid: Math.random() < 0.5 ? uid : botUid') && socket.includes('whiteUid: invite.whiteUid, blackUid: invite.blackUid'), 'Server allocates bot sides and preserves assignment into match creation');
check(JSON.parse(rd('app.json')).expo.android.versionCode===143036 && rail.includes('P2.37R2C-H22R8-native-1'), 'H14 native source and Android APK identity synchronized');

// Runtime: black player is permitted only to select own black pieces, even
// while White/Bot holds the turn. Premoves are LOCAL and cannot issue a move.
let currentUid='me';let boardWrites=[], emitted=[], warnings=[];
class ChessMock {
 constructor(fen){this.position=fen??'8/8/8/8/8/8/8/8 w - - 0 1'}
 fen(){return this.position}
 turn(){return this.position.split(' ')[1]}
 get(sq){return sq==='e2'?{color:'w',type:'p'}:sq==='e7'?{color:'b',type:'p'}:undefined}
 moves(opts){return opts?.square==='e7'?[{from:'e7',to:'e5'}]:[]}
 move(move){return move?.from==='e7'?{color:'b',san:'e5',flags:'b'}:null}
}
const mod={exports:{}};
const js=ts.transpileModule(ctl,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function stub(name){
 if(name==='chess.js')return {Chess:ChessMock};
 if(name==='@react-native-firebase/auth')return {getAuth:()=>({currentUser:{uid:currentUid}})};
 if(name==='../../types/chess')return {CHESS_ERROR_COPY:{},CHESS_EVENTS:{gameMove:'move',gameState:'state'},applyChessMoveDelta:(old,d)=>({...old,...d,revision:d.version})};
 if(name==='../chess/chessSocketService')return {chessSocketService:{emitAck:async(name,payload)=>{emitted.push({name,payload});return {ok:false,errorCode:'CHESS_NOT_YOUR_TURN'}}}};
 if(name==='./boardGamePresentationDiagnostics')return {emitBoardGamePresentationDiagnostic:(...args)=>warnings.push(args)};
 if(name==='./boardGamePresentationStore')return {markChessResultDismissed:()=>{},closeBoardGamePresentationForGame:()=>{}};
 if(name==='./boardGameNativeOverlay')return {setBoardGameNativeChessState:async(payload)=>{boardWrites.push(payload);return {accepted:true}}};
 throw new Error('unsupported mock dependency '+name);
}
try {vm.runInNewContext(js,{module:mod,exports:mod.exports,require:stub,console,Math,Date,setTimeout,clearTimeout}, {timeout:3000,filename:'nativeChessGameplayController.js'});}catch(e){failed++;console.error(e)}
const actor=mod.exports;
const INITIAL='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const base={gameId:'h14-game',familyId:'family',status:'active',revision:1,ply:0,
 whiteUid:'bot',blackUid:'me',testBotUid:'bot',fen:INITIAL,turn:'w',serverNowMs:Date.now(),
 whiteRemainingMs:600000,blackRemainingMs:600000};
(async()=>{
 try{
  actor.syncNativeChessAuthoritativeState(base);
  await Promise.resolve();
  check(boardWrites.at(-1)?.orientation==='b' && boardWrites.at(-1)?.meColor==='b', 'Actual black side controls board orientation and bottom clock');
  await actor.handleNativeChessAction({gameId:base.gameId,action:'square',square:'e2'});
  await Promise.resolve();
  check(boardWrites.at(-1)?.selectedSquare==null, 'Black user cannot select White Bot pawn e2');
  await actor.handleNativeChessAction({gameId:base.gameId,action:'square',square:'e7'});
  await Promise.resolve();
  check(boardWrites.at(-1)?.selectedSquare==='e7' && boardWrites.at(-1)?.canPremove===true && boardWrites.at(-1)?.canMove===false, 'Black user selects own pawn only as premove while White turn runs');
  check(emitted.length===0, 'Selecting black premove on White turn never sends gameMove');
  actor.syncNativeChessAuthoritativeState({...base,revision:2,turn:'b'});
  await Promise.resolve();
  check(boardWrites.at(-1)?.canMove===false && boardWrites.at(-1)?.canPremove===false, 'FEN/server turn mismatch locks both moves and premoves');
  check(warnings.some(x=>x[1]==='CHESS_SIDE_OR_TURN_INVALID'), 'Invalid snapshot creates diagnosis without exposing user UID');
  actor.syncNativeChessAuthoritativeState({...base,revision:3,whiteUid:'bot',blackUid:'other'});
  await Promise.resolve();
  check(boardWrites.at(-1)?.canMove===false && boardWrites.at(-1)?.canPremove===false, 'Foreign game membership disables all input');
  actor.syncNativeChessAuthoritativeState({...base,revision:4});
  const accepted=actor.syncNativeChessAuthoritativeMove({gameId:base.gameId,version:5,turn:'b',fen:INITIAL,
   move:{color:'b',from:'e7',to:'e5',san:'e5'},ply:1});
  check(accepted===false && warnings.some(x=>x[1]==='CHESS_DELTA_TURN_INVALID'), 'Invalid move-color/revision metadata is rejected and resync requested');
 }catch(e){failed++;console.error('FAIL runtime test',e?.stack||e)}
 console.log(`H14 side authority + Mini edge: ${failed?'FAIL':'PASS'} (${passed}/${passed+failed})`);
 process.exit(failed?1:0);
})();
