#!/usr/bin/env node
'use strict';
/** H17 executable controller scenarios (mocked Socket/Native; NOT an APK test).
 * Usage: node scripts/test-phase-p2_37r2c_h17-chess-optimistic-authority.js
 */
const fs = require('fs'), path = require('path'), vm = require('vm'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const INITIAL = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const WHITE = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
const BLACK = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2';
const source = read('src/services/games/nativeChessGameplayController.ts');
const view = read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt');
const rail = read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt');
const nativeState = read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/NativeChessBoardState.kt');
let passed = 0, failed = 0;
function check(ok, why) { console.log((ok ? 'PASS ' : 'FAIL ') + why); ok ? passed++ : failed++; }
function makeChessHarness(uid='me') {
  let uidNow = uid;
  const writes = [], sent = [], deferred = [], diagnostics = [];
  class ChessMock {
    constructor(fen=INITIAL) { this.value = fen; }
    fen() { return this.value; }
    turn() { return this.value.split(' ')[1]; }
    get(sq) {
      if (this.value === INITIAL && sq === 'e2') return {color:'w', type:'p'};
      if ((this.value === WHITE || this.value.split(' ')[0] === WHITE.split(' ')[0]) && sq === 'e7') return {color:'b',type:'p'};
      if (this.value === BLACK && sq === 'e4') return {color:'w',type:'p'};
      return undefined;
    }
    moves({square}={}) {
      if (this.value === INITIAL && square === 'e2') return [{from:'e2',to:'e4',san:'e4',color:'w',piece:'p'}];
      if (this.value === WHITE && square === 'e7') return [{from:'e7',to:'e5',san:'e5',color:'b',piece:'p'}];
      return [];
    }
    move(m) {
      if (this.value === INITIAL && m.from === 'e2' && m.to === 'e4') {
        this.value = WHITE; return {from:'e2',to:'e4',san:'e4',color:'w',piece:'p',flags:'b'};
      }
      if (this.value === WHITE && m.from === 'e7' && m.to === 'e5') {
        this.value = BLACK; return {from:'e7',to:'e5',san:'e5',color:'b',piece:'p',flags:'b'};
      }
      return null;
    }
  }
  const mod = {exports:{}};
  const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const stub = key => {
    if (key==='chess.js') return {Chess:ChessMock};
    if (key==='@react-native-firebase/auth') return {getAuth:()=>({currentUser:{uid:uidNow}})};
    if (key==='../../types/chess') return {CHESS_ERROR_COPY:{},CHESS_EVENTS:{gameMove:'move',gameResync:'resync'},
      applyChessMoveDelta:(old,d)=>({...old,fen:d.fen,turn:d.turn,revision:d.version,ply:d.ply,status:d.status,lastMove:d.move})};
    if (key==='../chess/chessSocketService') return {chessSocketService:{emitAck:(event,payload)=>{
      sent.push({event,payload});
      if (event==='resync') return Promise.resolve({ok:false,errorCode:'RESYNC_NOT_MOCKED'});
      return new Promise(resolve=>deferred.push({resolve,event,payload}));
    }}};
    if (key==='./boardGamePresentationDiagnostics') return {emitBoardGamePresentationDiagnostic:(...args)=>diagnostics.push(args)};
    if (key==='./boardGameNativeOverlay') return {setBoardGameNativeChessState:async(s)=>{writes.push(s);return {accepted:true}}};
    if (key==='./boardGamePresentationStore') return {markChessResultDismissed:()=>{},closeBoardGamePresentationForGame:()=>{}};
    throw Error('unknown mock '+key);
  };
  vm.runInNewContext(js,{module:mod,exports:mod.exports,require:stub,console,Math,Date,setTimeout,clearTimeout},{timeout:5000});
  return {api:mod.exports,writes,sent,deferred,diagnostics,setUid:v=>uidNow=v};
}
const base=(fen,turn,ply,rev,mine='w')=>({gameId:'H17-smoke-'+mine,familyId:'family',
  status:'active',fen,turn,ply,revision:rev,whiteUid:mine==='w'?'me':'bot',blackUid:mine==='b'?'me':'bot',testBotUid:'bot',
  whiteRemainingMs:600000,blackRemainingMs:600000,serverNowMs:1234});
const flush=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};
(async()=>{
try {
  const h=makeChessHarness();const s=base(INITIAL,'w',0,1);
  h.api.syncNativeChessAuthoritativeState(s);await flush();
  await h.api.handleNativeChessAction({gameId:s.gameId,action:'square',square:'e2'});
  await h.api.handleNativeChessAction({gameId:s.gameId,action:'square',square:'e4'});
  await flush();
  const visual=h.writes.at(-1);
  check(visual.fen===WHITE && visual.optimisticMoveId && visual.lastFrom==='e2' && visual.lastTo==='e4', 'White legal tap renders local chess.js predicted FEN before Socket ACK');
  check(visual.revision===1 && visual.ply===0 && visual.turn==='w' && visual.movePending, 'Optimistic paint never changes authoritative revision, ply or clock side');
  check(h.sent.length===1 && h.sent[0].payload.expectedVersion===1 && h.sent[0].payload.from==='e2' && h.sent[0].payload.to==='e4', 'Server still receives exactly one correctly versioned move intent');
  check(visual.canMove===false && visual.meColor==='w', 'Input is locked while own move waits for authority');
  const expectedMoveId=h.sent[0].payload.clientMoveId;
  const valid={gameId:s.gameId,version:2,ply:1,clientMoveId:expectedMoveId,turn:'b',fen:WHITE,status:'active',
    move:{from:'e2',to:'e4',san:'e4',color:'w',piece:'p',flags:'b'}};
  check(h.api.syncNativeChessAuthoritativeMove(valid)===true, 'Matching canonical server move is accepted');
  await flush();
  const confirm=h.writes.at(-1);
  check(confirm.fen===visual.fen && confirm.optimisticMoveId===null && confirm.revision===2 && confirm.turn==='b', 'Server confirmation leaves identical rendered FEN and advances metadata once');
  check(confirm.soundToken===visual.soundToken, 'Matching server move does not replay local movement sound');
  h.deferred[0].resolve({ok:true,data:{}});await flush();
  check(h.writes.at(-1).fen===WHITE, 'Late ACK cannot rewind confirmed board');
  h.api.clearNativeChessSession();

  const r=makeChessHarness();const rs=base(INITIAL,'w',0,1);
  r.api.syncNativeChessAuthoritativeState(rs);await flush();
  await r.api.handleNativeChessAction({gameId:rs.gameId,action:'square',square:'e2'});
  await r.api.handleNativeChessAction({gameId:rs.gameId,action:'square',square:'e4'});await flush();
  check(r.writes.at(-1).fen===WHITE,'Rejected-move scenario starts with immediate optimistic frame');
  r.deferred[0].resolve({ok:false,errorCode:'CHESS_ILLEGAL_MOVE'});await flush();
  check(r.writes.at(-1).fen===INITIAL && r.writes.at(-1).optimisticMoveId===null && r.writes.at(-1).canMove, 'Server rejection rolls back speculative paint and re-enables input');
  check(r.sent.length===1,'Rejected intent cannot send a duplicate Socket move');
  r.api.clearNativeChessSession();

  const b=makeChessHarness();const bs=base(WHITE,'b',1,4,'b');
  b.api.syncNativeChessAuthoritativeState(bs);await flush();
  await b.api.handleNativeChessAction({gameId:bs.gameId,action:'square',square:'e2'});
  check(b.writes.at(-1).selectedSquare===null && b.sent.length===0,'Black player cannot select a White square');
  await b.api.handleNativeChessAction({gameId:bs.gameId,action:'square',square:'e7'});
  await b.api.handleNativeChessAction({gameId:bs.gameId,action:'square',square:'e5'});await flush();
  check(b.writes.at(-1).fen===BLACK && b.writes.at(-1).orientation==='b' && b.writes.at(-1).lastFrom==='e7', 'Black legal tap has immediate correctly oriented speculative motion');
  check(b.writes.at(-1).revision===4 && b.writes.at(-1).ply===1 && b.sent[0].payload.expectedVersion===4, 'Black-side speculative paint retains server revision and UID authority');
  b.deferred[0].resolve({ok:false,errorCode:'CHESS_ILLEGAL_MOVE'});await flush();
  check(b.writes.at(-1).fen===WHITE,'Black-side server rejection restores FEN without changing orientation');
  b.api.clearNativeChessSession();

  const k=makeChessHarness();const ks=base(INITIAL,'w',0,1);
  k.api.syncNativeChessAuthoritativeState(ks);await flush();
  await k.api.handleNativeChessAction({gameId:ks.gameId,action:'square',square:'e2'});
  await k.api.handleNativeChessAction({gameId:ks.gameId,action:'square',square:'e4'});await flush();
  k.api.syncNativeChessAuthoritativeState({...ks,revision:2,ply:1,fen:WHITE,turn:'b'});await flush();
  check(k.writes.at(-1).fen===WHITE && k.writes.at(-1).optimisticMoveId===null, 'Canonical snapshot-only confirmation also avoids a second movement');
  k.deferred[0].resolve({ok:false,errorCode:'CHESS_STATE_CONFLICT'});await flush();
  check(k.writes.at(-1).fen===WHITE,'Late rejection for completed revision cannot roll back canonical snapshot');
  k.api.clearNativeChessSession();

  check(source.includes('fen: showOptimistic ? optimisticFen! : state.fen') &&
    source.includes('isLegalServerDelta(currentState, delta)') && source.includes('pendingBaseRevision === state.revision'),
    'Optimistic render is guarded and server deltas still pass legal move reconstruction');
  check(view.includes('val optimistic = next.optimisticMoveId != null') && view.includes('previous.optimisticMoveId != null') &&
    view.includes('if (optimistic) previous.revision + 1 else next.revision'), 'Native motion accepts one locally predicted ply independently from authoritative revision');
  check(view.includes('previous.fen != next.fen') && view.includes('if (motion.isNotEmpty()) startPieceMotion(motion)'),
    'Matching server confirmation cannot replay native animation when FEN is unchanged');
  check(view.includes('next.renderSequence < (state?.renderSequence ?: 0)') &&
    rail.includes('state.renderSequence < (latestChessState?.renderSequence ?: 0)') && nativeState.includes('renderSequence'),
    'Older JS->Kotlin bind cannot overwrite a newer preview/confirmation');
  check(read('server/src/chess/chessGameManager.ts').includes('sourcePiece.color !== color'), 'Server color and legal move defense preserved');
  check(read('app.json').includes('"versionCode": 143032') && rail.includes('P2.37R2C-H22-native-1'), 'H17 APK identity prevents stale H16 native install');
} catch (error) {failed++;console.error('FAIL H17 runtime',error?.stack||error);}
console.log(`H17 client-first server-authoritative Chess: ${failed?'FAIL':'PASS'} (${passed}/${passed+failed})`);
process.exitCode=failed?1:0;
})();
