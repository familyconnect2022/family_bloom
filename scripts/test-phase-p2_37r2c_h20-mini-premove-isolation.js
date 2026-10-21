#!/usr/bin/env node
'use strict';
/** H20 narrow regression: native Mini ticker isolation + premove stability.
 * These checks are executable JS controller simulations and source contracts.
 * They do not claim Gradle/APK compilation or device FPS.
 */
const fs=require('fs'),path=require('path'),vm=require('vm');
let ts;
try { ts = require('typescript'); }
catch { try { ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript'); }
  catch { console.error('Missing TypeScript: run npm install before H20 verification'); process.exit(1); }
}
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const controller=read('src/services/games/nativeChessGameplayController.ts');
const native=read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt');
const xiangqi=read('src/services/games/boardGamePresentationBridge.ts');
let passed=0,failed=0;
function check(value,label){if(value){passed++;console.log('PASS '+label)}else{failed++;console.error('FAIL '+label)}}
const snapshot={
  gameId:'H20-replay',familyId:'family',status:'active',
  fen:'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
  turn:'b',ply:1,revision:2,whiteUid:'me',blackUid:'bot',testBotUid:'bot',
  whiteRemainingMs:590000,blackRemainingMs:590000,serverNowMs:100000,
};
class ChessMock{
 constructor(fen){this.value=fen || snapshot.fen}
 fen(){return this.value}
 turn(){return this.value.split(' ')[1]}
 get(s){
  if(s==='d2')return {color:'w',type:'p'};
  if(s==='e7')return {color:'b',type:'p'};
  return null;
 }
 moves({square}={}){
  if(square==='d2')return [{from:'d2',to:'d4',color:'w',piece:'p'}];
  if(square==='e7')return [{from:'e7',to:'e5',color:'b',piece:'p'}];
  return [];
 }
 move(m){
  if(m.from==='e7'&&m.to==='e5'){
   this.value='rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2';
   return {color:'b',piece:'p',san:'e5',from:'e7',to:'e5'};
  }
  if(m.from==='d2'&&m.to==='d4'){
   this.value='rnbqkbnr/pppp1ppp/8/4p3/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3 0 2';
   return {color:'w',piece:'p',san:'d4',from:'d2',to:'d4'};
  }
  throw Error('mock illegal');
 }
}
const writes=[],acks=[];
const stubs={
 'react-native':{AppState:{currentState:'active',addEventListener:()=>({remove(){}})}},
  'chess.js':{Chess:ChessMock},
 '@react-native-firebase/auth':{getAuth:()=>({currentUser:{uid:'me'}})},
 '../../types/chess':{CHESS_EVENTS:{gameMove:'move',gameResync:'resync',gameJoin:'join',gameCatchup:'catchup'},CHESS_ERROR_COPY:{},applyChessMoveDelta:(old,d)=>({...old,fen:d.fen,turn:d.turn,ply:d.ply,revision:d.version,status:d.status,lastMove:d.move})},
 '../chess/chessSocketService':{chessSocketService:{emitAck:(event,payload)=>{let resolve;let promise=new Promise(ok=>resolve=ok);acks.push({event,payload,resolve});return promise}}},
 './boardGamePresentationDiagnostics':{emitBoardGamePresentationDiagnostic:()=>{}},
 './boardGameNativeOverlay':{setBoardGameNativeChessState:async state=>{writes.push(state);return {accepted:true}}},
 './boardGamePresentationStore':{markChessResultDismissed:()=>{},closeBoardGamePresentationForGame:()=>{}}
};
const testModule={exports:{}};
vm.runInNewContext(ts.transpileModule(controller,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
 module:testModule,exports:testModule.exports,require:key=>{if(!(key in stubs))throw Error('Missing mock '+key);return stubs[key]},
 console,Date,Math,setTimeout,clearTimeout,
},{timeout:4000});
const api=testModule.exports;
const tick=async()=>{for(let i=0;i<20;i++)await Promise.resolve()};
(async()=>{
 try{
  api.syncNativeChessAuthoritativeState(snapshot);await tick();
  await api.handleNativeChessAction({gameId:snapshot.gameId,action:'square',square:'d2'});
  await api.handleNativeChessAction({gameId:snapshot.gameId,action:'square',square:'d4'});await tick();
  check(writes.at(-1).premoveCount===1,'premove is stored outside React as one queued proposal');
  check(writes.at(-1).queuedPremoveSquares.join(',')==='d2,d4','Native receives premove from/to highlight');
  const beforeCount=acks.length;
  api.syncNativeChessAuthoritativeState({...snapshot,serverNowMs:100100});await tick();
  check(writes.at(-1).premoveCount===1,'same-revision clock-only server snapshot does not clear premove');
  check(acks.length===beforeCount,'clock-only server snapshot never sends/executes a premove');
  // A temporarily paused server snapshot isn't a terminal game result.
  api.syncNativeChessAuthoritativeState({...snapshot,status:'paused',serverNowMs:100200});await tick();
  check(writes.at(-1).premoveCount===1,'temporary paused state preserves locally queued premove');
  api.syncNativeChessAuthoritativeState({...snapshot,status:'active',serverNowMs:100300});await tick();
  check(writes.at(-1).premoveCount===1,'returning to active state preserves queued premove');
  // Malformed opponent packet prompts resync rather than disposing local proposal.
  api.syncNativeChessAuthoritativeMove({gameId:snapshot.gameId,version:3,ply:2,fen:'invalid',turn:'w',status:'active',
    move:{from:'e7',to:'e5',color:'w',piece:'p',san:'e5'}});await tick();
  check(writes.at(-1).premoveCount===1,'invalid opponent packet keeps premove for verified resync');
  check(acks.some(x=>x.event==='catchup'||x.event==='resync'),'bad delta requests authoritative catchup or resync');
  const resyncAck=acks.find(x=>x.event==='catchup'||x.event==='resync');
  resyncAck.resolve({ok:true,data:{mode:'snapshot',state:{...snapshot,
    revision:3,ply:2,turn:'w',fen:'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
    lastMove:{from:'e7',to:'e5',san:'e5'},lastMoveBeforeFen:snapshot.fen,
  }}});
  await tick();
  check(acks.filter(x=>x.event==='move'&&x.payload.from==='d2'&&x.payload.to==='d4').length===1,
    'verified opponent resync executes preserved premove once');
  check(writes.at(-1).movePending===true && writes.at(-1).fen.includes('3PP3'),
    'premove renders one locally validated optimistic move, server still authoritative');
  // Source contract: no repeated React state/setInterval needed for Mini text ticker.
  check(native.includes('miniClockHandler.postDelayed(this, 1_000L)')&&native.includes('if (miniTimeLabel.text.toString() != clockText) miniTimeLabel.text = clockText'),
   'Mini one-second ticker updates its dedicated clock TextView only');
  check(native.includes('if (mode != "mini") miniClockHandler.removeCallbacks(miniTick)')&&native.includes('miniClockHandler.removeCallbacks(miniTick)\n    ensureTransparentHost()'),
   'Mini ticker sleeps in Full, IDLE and app background');
  check(native.includes('chessLastGlyph(s)')&&!native.includes('"✦  CỜ TƯỚNG" else "♟  CỜ VUA"'),
   'Chess Mini derives last moved piece from FEN, not hard-coded game title');
  check(xiangqi.includes('xiangqiMiniSnapshot(state)')&&xiangqi.includes('setFamilyBloomOverlayXiangqiMiniState')&&
    !xiangqi.includes('setInterval('), 'Xiangqi only publishes authoritative snapshots; no JS clock interval');
  check(native.includes('if (mode == "full" && kind == "chess") chessBoard.bind(state)')&&native.includes('else chessBoard.parkForMini(state)'),
   'Mini never re-binds Chess 64-square renderer');
  check(!native.slice(native.indexOf('private val miniTick'),native.indexOf('private val miniTick')+260).includes('chessBoard'),
   'Native Mini ticker cannot directly invoke board renderer');
  api.clearNativeChessSession();
  console.log(`H20 Mini/premove isolation: ${failed?'FAIL':'PASS'} (${passed}/${passed+failed})`);process.exit(failed?1:0);
 }catch(e){console.error(e);process.exit(1)}
})();
