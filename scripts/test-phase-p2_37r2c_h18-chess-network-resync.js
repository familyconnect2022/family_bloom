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
 // One missing server ply can be validated from the cached authoritative FEN.
 const h=harness();h.api.syncNativeChessAuthoritativeState(make(INITIAL,'w',0,1));await tick();
 h.api.syncNativeChessAuthoritativeState({...make(WHITE,'b',1,2),lastMove:move1});await tick();
 check(h.writes.at(-1).motionFromFen===INITIAL,'Single missed ply recovers last animation only after chess.js verification');
 check(h.writes.at(-1).fen===WHITE&&h.writes.at(-1).revision===2,'Visual recovery keeps authoritative FEN/revision');
 h.api.clearNativeChessSession();
 // With multiple missed turns, a proven predecessor from the server is required.
 const m=harness();m.api.syncNativeChessAuthoritativeState(make(INITIAL,'w',0,1));await tick();
 m.api.syncNativeChessAuthoritativeState({...make(BLACK,'w',2,5),lastMove:move2,lastMoveBeforeFen:WHITE});await tick();
 check(m.writes.at(-1).motionFromFen===WHITE&&m.writes.at(-1).fen===BLACK,'Multi-ply gap animates verified last bot move from server-provided predecessor');
 check(m.writes.at(-1).status==='active','Resync snapshot does not interrupt confirmed active game');
 m.api.clearNativeChessSession();
 const n=harness();n.api.syncNativeChessAuthoritativeState(make(INITIAL,'w',0,1));await tick();
 n.api.syncNativeChessAuthoritativeState({...make(BLACK,'w',2,5),lastMove:move2});await tick();
 check(n.writes.at(-1).motionFromFen==null&&n.writes.at(-1).fen===BLACK,'Older server without predecessor falls back to safe FEN snap, no invented animation');
 n.api.clearNativeChessSession();
 const f=harness();f.api.syncNativeChessAuthoritativeState(make(INITIAL,'w',0,1));await tick();
 f.api.syncNativeChessAuthoritativeState({...make(BLACK,'w',2,5),lastMove:{...move2,san:'Nonsense'},lastMoveBeforeFen:WHITE});await tick();
 check(f.writes.at(-1).motionFromFen==null,'Inconsistent SAN/FEN refuses unsafe last-move animation');
 f.api.clearNativeChessSession();
 // Contradictory same-revision packets are ignored and repaired via resync.
 const c=harness();c.api.syncNativeChessAuthoritativeState(make(INITIAL,'w',0,1));await tick();
 c.api.syncNativeChessAuthoritativeState(make(WHITE,'b',1,1));await tick();
 check(c.writes.at(-1).fen===INITIAL&&c.acks.length===1&&c.acks[0].event==='resync','Same-revision different FEN cannot flash the board; one resync requested');
 c.api.syncNativeChessAuthoritativeState(make(WHITE,'b',1,1));await tick();
 check(c.acks.length===1,'Duplicate contradictory packets do not create resync storm');
 c.acks[0].resolve({ok:true,data:{...make(INITIAL,'w',0,1)}});await tick();
 check(c.writes.at(-1).fen===INITIAL,'Canonical resync ACK preserves the last verified board');
 c.api.clearNativeChessSession();
 // Socket disconnect cannot erase current FEN or open a full-screen overlay.
 const d=harness();d.api.syncNativeChessAuthoritativeState(make(INITIAL,'w',0,1));await tick();
 d.api.setNativeChessTransportConnected(false);await tick();
 check(d.writes.at(-1).fen===INITIAL&&d.writes.at(-1).status==='syncing'&&d.writes.at(-1).canMove,'Disconnect keeps FEN and permits one locally legal move while syncing');
 d.api.setNativeChessTransportConnected(true);await tick();
 check(d.acks.length===1&&d.acks[0].event==='join','Reconnect joins the socket room and obtains authoritative full FEN');
 check(d.writes.at(-1).fen===INITIAL&&d.writes.at(-1).status==='syncing','Reconnect keeps previous pixels while waiting for resync ACK');
 d.acks[0].resolve({ok:true,data:{...make(WHITE,'b',1,2),lastMove:move1,lastMoveBeforeFen:INITIAL}});await tick();
 check(d.writes.at(-1).fen===WHITE&&d.writes.at(-1).motionFromFen===INITIAL&&d.writes.at(-1).status==='active','After valid reconnect ACK last legal move animates and input is unlocked');
 d.api.clearNativeChessSession();
 // A pending local visual move remains stable across a disconnect; the server
 // confirmation must not replay that same animation on recovery.
 const o=harness();o.api.syncNativeChessAuthoritativeState(make(INITIAL,'w',0,1));await tick();
 await o.api.handleNativeChessAction({gameId:'test-H18-w',action:'square',square:'e2'});
 await o.api.handleNativeChessAction({gameId:'test-H18-w',action:'square',square:'e4'});await tick();
 check(o.writes.at(-1).fen===WHITE&&!!o.writes.at(-1).optimisticMoveId,'Local move previews immediately before network shift');
 o.api.setNativeChessTransportConnected(false);await tick();
 check(o.writes.at(-1).fen===WHITE&&o.writes.at(-1).status==='syncing','Disconnect does not roll back pending optimistic board');
 o.api.setNativeChessTransportConnected(true);await tick();
 o.acks.find(a=>a.event==='join').resolve({ok:true,data:{...make(WHITE,'b',1,2),lastMove:move1,lastMoveBeforeFen:INITIAL}});await tick();
 check(o.writes.at(-1).fen===WHITE&&o.writes.at(-1).motionFromFen==null&&!o.writes.at(-1).optimisticMoveId,'ACK after a local preview does not animate the piece twice');
 o.api.clearNativeChessSession();
 // In-flight resync from previous socket epoch can never override a newer one.
 const e=harness();e.api.syncNativeChessAuthoritativeState(make(INITIAL,'w',0,1));await tick();
 e.api.setNativeChessTransportConnected(false);e.api.setNativeChessTransportConnected(true);await tick();
 e.api.setNativeChessTransportConnected(false);e.api.setNativeChessTransportConnected(true);await tick();
 check(e.acks.length===2,'Second socket epoch is not blocked by stale resync request');
 e.acks[1].resolve({ok:true,data:{...make(WHITE,'b',1,2),lastMove:move1,lastMoveBeforeFen:INITIAL}});await tick();
 e.acks[0].resolve({ok:true,data:make(INITIAL,'w',0,1)});await tick();
 check(e.writes.at(-1).fen===WHITE&&e.writes.at(-1).revision===2,'Old socket resync response cannot rewind the newer position');
 e.api.clearNativeChessSession();
 // Official black color remains UID/turn-authorized during recovery.
 const b=harness('b');b.api.syncNativeChessAuthoritativeState(make(WHITE,'b',1,2,'b'));await tick();
 b.api.syncNativeChessAuthoritativeState({...make(BLACK,'w',2,3,'b'),lastMove:move2,lastMoveBeforeFen:WHITE});await tick();
 check(b.writes.at(-1).orientation==='b'&&b.writes.at(-1).motionFromFen===WHITE,'Black player orientation and last move survive verified recovery');
 b.api.clearNativeChessSession();
 check(!native.includes('current.status == "syncing" -> "syncing:'),'Native syncing no longer opens covering full-screen Bloom dialog');
 check(native.includes('recoveryBefore.split')&&native.includes('lastBoardPaintKey')&&nativeState.includes('val motionFromFen'),'Native can animate verified last ply and skips 64-cell redraws on clocks');
 check(server.includes('lastMoveBeforeFen')&&server.includes('recentHistory[recentHistory.length - 1].before'),'Render snapshot supplies actual predecessor FEN from chess.js history');
 check(bridge.includes('setNativeChessTransportConnected(false)')&&bridge.includes('setNativeChessTransportConnected(true)'),'Transport listener lifecycle connects the native board to network recovery');
 check(read('src/types/chess.ts').includes('lastMoveBeforeFen?: string | null')&&read('modules/family-bloom-overlay/index.ts').includes('motionFromFen?: string | null'),'Client and Native optional backward-compatible recovery fields wired');
 check(read('app.json').includes('"versionCode": 143039')&&read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt').includes('P2.37R2C-H25-native-1'),'Native APK identity is current H19, not stale H18');
}catch(err){failed++;console.error('FAIL H18 executable scenarios:',err.stack||err)}
console.log(`H18 Chess network recovery: ${failed?'FAIL':'PASS'} (${passed}/${passed+failed})`);process.exitCode=failed?1:0;
})();
