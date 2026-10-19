#!/usr/bin/env node
'use strict';
/** Executable network-recovery controller tests with mock chess.js/native/socket.
 * This does not claim Android device FPS, Gradle compilation or Render deploy.
 */
const fs=require('fs'),path=require('path'),vm=require('vm');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=read('src/services/games/nativeChessGameplayController.ts');
const native=read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt');
const nativeState=read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/NativeChessBoardState.kt');
const server=read('server/src/chess/chessGameManager.ts');
const bridge=read('src/services/games/boardGamePresentationBridge.ts');
const INITIAL='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const WHITE='rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
const BLACK='rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2';
const make=(fen,turn,ply,revision,color='w')=>({gameId:'test-H18-'+color,familyId:'family',fen,turn,ply,revision,status:'active',whiteUid:color==='w'?'me':'bot',blackUid:color==='b'?'me':'bot',testBotUid:'bot',whiteRemainingMs:600000,blackRemainingMs:600000,serverNowMs:123,lastMove:null});
const move1={from:'e2',to:'e4',san:'e4'};
const move2={from:'e7',to:'e5',san:'e5'};
let passed=0,failed=0;
function check(condition,desc){if(condition){passed++;console.log('PASS '+desc)}else{failed++;console.error('FAIL '+desc)}}
async function tick(){for(let i=0;i<18;i++)await Promise.resolve()}
function harness(color='w'){
 const writes=[],acks=[],diagnostics=[];let uid='me';
 class ChessMock{
  constructor(fen=INITIAL){if(![INITIAL,WHITE,BLACK].includes(fen))throw Error('BAD_FEN');this.value=fen}
  fen(){return this.value}
  turn(){return this.value.split(' ')[1]}
  get(sq){if(this.value===INITIAL&&sq==='e2')return{color:'w',type:'p'};if(this.value===WHITE&&sq==='e7')return{color:'b',type:'p'};return null}
  moves({square}={}){if(this.value===INITIAL&&square==='e2')return[{...move1,color:'w',piece:'p'}];if(this.value===WHITE&&square==='e7')return[{...move2,color:'b',piece:'p'}];return []}
  move(m){if(this.value===INITIAL&&m.from==='e2'&&m.to==='e4'){this.value=WHITE;return{...move1,color:'w',piece:'p'}}if(this.value===WHITE&&m.from==='e7'&&m.to==='e5'){this.value=BLACK;return{...move2,color:'b',piece:'p'}}throw Error('ILLEGAL')}
 }
 const module={exports:{}};
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const stubs={
  'chess.js':{Chess:ChessMock},
  '@react-native-firebase/auth':{getAuth:()=>({currentUser:{uid}})},
  '../../types/chess':{CHESS_EVENTS:{gameMove:'move',gameResync:'resync',gameJoin:'join'},CHESS_ERROR_COPY:{},applyChessMoveDelta:(old,d)=>({...old,revision:d.version,ply:d.ply,turn:d.turn,fen:d.fen,status:d.status,lastMove:d.move})},
  '../chess/chessSocketService':{chessSocketService:{emitAck:(event,payload)=>{let resolve;const p=new Promise(done=>resolve=done);acks.push({event,payload,resolve});return p}}},
  './boardGamePresentationDiagnostics':{emitBoardGamePresentationDiagnostic:(...args)=>diagnostics.push(args)},
  './boardGameNativeOverlay':{setBoardGameNativeChessState:async v=>{writes.push(v);return{accepted:true}}},
  './boardGamePresentationStore':{markChessResultDismissed:()=>{},closeBoardGamePresentationForGame:()=>{}},
 };
 vm.runInNewContext(code,{module,exports:module.exports,require:key=>{if(!(key in stubs))throw Error('Missing mock '+key);return stubs[key]},console,setTimeout,clearTimeout,Date,Math},{timeout:4000});
 return{api:module.exports,writes,acks,diagnostics,setUid:v=>uid=v};
}
(async()=>{try{
 const offline=harness();offline.api.syncNativeChessAuthoritativeState(make(INITIAL,'w',0,1));await tick();
 offline.api.setNativeChessTransportConnected(false);await tick();
 await offline.api.handleNativeChessAction({gameId:'test-H18-w',action:'square',square:'e2'});
 await offline.api.handleNativeChessAction({gameId:'test-H18-w',action:'square',square:'e4'});await tick();
 check(offline.acks.length===0 && offline.writes.at(-1).fen===WHITE &&
   offline.writes.at(-1).status==='syncing' && offline.writes.at(-1).movePending,
   'Offline client validates one move and keeps optimistic pixels without sending');
 await offline.api.handleNativeChessAction({gameId:'test-H18-w',action:'square',square:'e2'});await tick();
 check(offline.acks.length===0 && offline.writes.at(-1).movePending,
   'Offline pending intent locks additional taps');
 offline.api.setNativeChessTransportConnected(true);await tick();
 check(offline.acks.length===1 && offline.acks[0].event==='join' &&
   offline.acks[0].payload.familyId==='family', 'Reconnect rejoins authoritative Socket.IO game room');
 offline.acks[0].resolve({ok:true,data:make(INITIAL,'w',0,1)});await tick();
 check(offline.acks.length===2 && offline.acks[1].event==='move' &&
   offline.acks[1].payload.from==='e2' && offline.acks[1].payload.to==='e4' &&
   offline.acks[1].payload.expectedVersion===1,
   'Unchanged authoritative FEN revalidates and sends queued offline move once');
 const firstId=offline.acks[1].payload.clientMoveId;
 offline.api.syncNativeChessAuthoritativeMove({gameId:'test-H18-w',version:2,ply:1,clientMoveId:firstId,
   turn:'b',fen:WHITE,status:'active',move:{...move1,color:'w',piece:'p',flags:'b'}});await tick();
 check(offline.writes.at(-1).fen===WHITE && !offline.writes.at(-1).optimisticMoveId &&
   !offline.writes.at(-1).movePending, 'Matching server delta commits without moving piece twice');
 offline.acks[1].resolve({ok:true,data:{}});await tick();
 offline.api.clearNativeChessSession();

 const already=harness();already.api.syncNativeChessAuthoritativeState(make(INITIAL,'w',0,1));await tick();
 already.api.setNativeChessTransportConnected(false);await tick();
 await already.api.handleNativeChessAction({gameId:'test-H18-w',action:'square',square:'e2'});
 await already.api.handleNativeChessAction({gameId:'test-H18-w',action:'square',square:'e4'});await tick();
 already.api.setNativeChessTransportConnected(true);await tick();
 already.acks[0].resolve({ok:true,data:{...make(WHITE,'b',1,2),lastMove:move1,lastMoveBeforeFen:INITIAL}});await tick();
 check(already.acks.length===1&&already.writes.at(-1).fen===WHITE&&
   !already.writes.at(-1).movePending&&already.writes.at(-1).motionFromFen==null,
   'Server already committed original offline move: no duplicate send or animation');
 already.api.clearNativeChessSession();

 const stale=harness();stale.api.syncNativeChessAuthoritativeState(make(INITIAL,'w',0,1));await tick();
 stale.api.setNativeChessTransportConnected(false);await tick();
 await stale.api.handleNativeChessAction({gameId:'test-H18-w',action:'square',square:'e2'});
 await stale.api.handleNativeChessAction({gameId:'test-H18-w',action:'square',square:'e4'});await tick();
 stale.api.setNativeChessTransportConnected(true);await tick();
 stale.acks[0].resolve({ok:true,data:{...make(BLACK,'w',2,4),lastMove:{...move2,san:'Nonsense'},lastMoveBeforeFen:INITIAL}});await tick();
 check(stale.acks.length===1 && stale.writes.at(-1).fen===BLACK &&
   stale.writes.at(-1).waitingMessage.includes('chọn lại') && !stale.writes.at(-1).movePending,
   'When server position advanced unexpectedly, drop speculative move and notify player');
 stale.api.clearNativeChessSession();

 const twoPly=harness();twoPly.api.syncNativeChessAuthoritativeState(make(INITIAL,'w',0,1));await tick();
 twoPly.api.setNativeChessTransportConnected(false);await tick();
 await twoPly.api.handleNativeChessAction({gameId:'test-H18-w',action:'square',square:'e2'});
 await twoPly.api.handleNativeChessAction({gameId:'test-H18-w',action:'square',square:'e4'});await tick();
 twoPly.api.setNativeChessTransportConnected(true);await tick();
 twoPly.acks[0].resolve({ok:true,data:{...make(BLACK,'w',2,3),lastMove:move2,lastMoveBeforeFen:WHITE}});await tick();
 check(twoPly.acks.length===1 && twoPly.writes.at(-1).fen===BLACK &&
   !twoPly.writes.at(-1).movePending && !twoPly.writes.at(-1).waitingMessage.includes('chọn lại'),
   'Queued move followed by Bot reply is recognized as committed using verified predecessor FEN');
 twoPly.api.clearNativeChessSession();

 const black=harness('b');black.api.syncNativeChessAuthoritativeState(make(WHITE,'b',1,2,'b'));await tick();
 black.api.setNativeChessTransportConnected(false);await tick();
 await black.api.handleNativeChessAction({gameId:'test-H18-b',action:'square',square:'e7'});
 await black.api.handleNativeChessAction({gameId:'test-H18-b',action:'square',square:'e5'});await tick();
 check(black.writes.at(-1).fen===BLACK&&black.writes.at(-1).orientation==='b'&&black.acks.length===0,
   'Black offline move uses authenticated side, not flipped board coordinates');
 black.api.setNativeChessTransportConnected(true);await tick();
 black.acks[0].resolve({ok:true,data:make(WHITE,'b',1,2,'b')});await tick();
 check(black.acks.length===2&&black.acks[1].payload.from==='e7'&&
   black.acks[1].payload.to==='e5', 'Black offline intent resubmits after verified reconnect');
 black.api.clearNativeChessSession();

 const gate=read('src/components/games/ChessSessionRecoveryGate.tsx');
 const layout=read('src/app/_layout.tsx');
 check(gate.includes('CHESS_EVENTS.sessionRecover')&&gate.indexOf('await confirm(')<gate.indexOf('CHESS_EVENTS.gameJoin') &&
   layout.includes('<ChessSessionRecoveryGate'), 'Root-owned recovery asks consent BEFORE joining/painting active match');
 check(gate.includes('cancelLabel: "Để sau"') && !gate.includes('gameResign'),
   'Deferring recovery leaves server match running, without resign');
 check(native.includes('fun ensureRecoveredGeometry()')&&native.includes('paintedCells.clear()')&&
  read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt').includes('chessBoard.ensureRecoveredGeometry()'),
  'Cold-start Full measures decor geometry and redraws cached native cells safely');
 check(native.includes('current.status !in setOf("active", "syncing")')&&
  native.includes('holder.isEnabled = current.status in setOf("active", "syncing")'),
  'One offline tap permitted by native only when JS grants canMove');
 check(source.includes('board.fen() !== intent.predictedFen') &&
  source.includes('intent.clientMoveId') && source.includes('state.fen !== intent.baseFen'),
  'Buffered move protects FEN integrity and idempotent replay');
}catch(err){failed++;console.error('FAIL H19 executable scenarios:',err.stack||err)}
console.log(`H19 recovery/offline: ${failed?'FAIL':'PASS'} (${passed}/${passed+failed})`);process.exitCode=failed?1:0;
})();
