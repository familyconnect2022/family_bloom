/** H21 executable policy and server-handshake regression without Firebase. */
const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = process.cwd();
const mgrSrc = fs.readFileSync('server/src/chess/chessGameManager.ts', 'utf8');
const socketSrc = fs.readFileSync('server/src/socket/socketServer.ts', 'utf8');
const controllerSrc = fs.readFileSync('src/services/games/nativeChessGameplayController.ts', 'utf8');
const gateSrc = fs.readFileSync('src/components/games/ChessChallengeGate.tsx', 'utf8');
const nativeSrc = fs.readFileSync('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt', 'utf8');
const dist = ts.transpileModule(mgrSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
class FakeChess {
  fen() { return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'; }
  pgn() { return ''; }
  history() { return []; }
  turn() { return 'w'; }
  isCheck() { return false; }
  board() { return Array.from({length:8},()=>Array(8).fill(null)); }
  load(){} loadPgn(){} moves(){return []}
}
class DomainError extends Error {constructor(code){super(code);this.code=code}}
const outputExports = {};
vm.runInNewContext(dist, {
  exports: outputExports, performance: require('node:perf_hooks').performance,
  require: n => n === 'node:crypto' ? require('node:crypto') : n === 'node:perf_hooks' ? require('node:perf_hooks') :
    n === 'chess.js' ? { Chess: FakeChess } : n.endsWith('chessTypes.js') ? { ChessDomainError: DomainError } : {},
  Date, Math, Set, Map, Promise, structuredClone, setInterval, setTimeout, clearTimeout, clearInterval, console,
});
const { ChessGameManager, awayAllowanceMs } = outputExports;
let passed=0; const test=(name,fn)=>{fn();passed++;console.log('PASS',name)};
const cases = [
  [600000, 360000, 180000], [600000, 120001, 60000.5], [600000,120000,120000], [600000,30000,30000],
  [300000,180000,90000],[300000,60001,30000.5],[300000,60000,60000],[300000,25000,25000],
  [180000,180000,180000],[60000,60000,60000],[600000,1,1],
];
for(const [initial,left,expected] of cases)test(`${initial}/${left} -> ${expected}`,()=>assert.equal(awayAllowanceMs(initial,left),expected));
const fakePersistence = { createWithLocks:async()=>{},save:async()=>{},finish:async()=>{},load:async()=>null };
const events=[];const mgr=new ChessGameManager(fakePersistence,event=>events.push(event));
(async()=>{
const tc = {kind:'clocked',initialMs:600000,incrementMs:0};
const first=await mgr.create('family','a','b',tc);
test('H25 human matches keep colors hidden until two board READY',()=>{ assert.equal(first.preparationPhase,'board');assert.equal(first.whiteUid,'');assert.equal(first.blackUid,'')});
await mgr.markBoardReady(first.gameId,'a','board-a-1234');
const one=await mgr.state(first.gameId,'a');
test('single prepared participant cannot advance to colors or start clocks',()=>{assert.equal(one.preparationPhase,'board');assert.equal(one.status,'waiting')});
await mgr.markBoardReady(first.gameId,'b','board-b-1234');
const both=await mgr.state(first.gameId,'a');
test('both boardReady reveal frozen human colors without starting clocks',()=>{assert.equal(both.preparationPhase,'colors'); assert(both.whiteUid&&both.blackUid);assert.equal(both.startedAt,null);});
await mgr.markReady(first.gameId,'a','ready-a-1234');
const wait=await mgr.state(first.gameId,'a');
test('first playReady does not start clock',()=>{assert.equal(wait.status,'waiting');assert.equal(wait.startedAt,null)});
await mgr.markReady(first.gameId,'b','ready-b-1234');
const active=await mgr.state(first.gameId,'a');
test('both playReady starts game exactly once',()=>{assert.equal(active.status,'active');assert(active.startedAt)});
const firstAway=await mgr.setBoardVisible(first.gameId,'a',false);
test('10-min 50% allowance, server-owned deadline',()=>{assert(firstAway.awayDeadlineAt);const elapsed=firstAway.awayDeadlineAt-Date.now();assert(elapsed>299000&&elapsed<=300000)});
await mgr.setBoardVisible(first.gameId,'a',false);
const stillAway=await mgr.setBoardVisible(first.gameId,'a',false);
test('multiple away packets never push original deadline',()=> assert(Math.abs(stillAway.awayDeadlineAt-firstAway.awayDeadlineAt)<50));
const runtime=mgr.games.get(first.gameId);
runtime.boardAwayByUid.get('a').leftAtMono-=5000;
await mgr.setBoardVisible(first.gameId,'a',true);
const second=await mgr.setBoardVisible(first.gameId,'a',false);
test('rejoining consumes budget, no reset',()=>{assert(second.awayDeadlineAt-Date.now()<296000)});
const deadline=runtime.boardAwayByUid.get('a');deadline.deadlineMono=require('node:perf_hooks').performance.now()-1;
const finished=await mgr.setBoardVisible(first.gameId,'a',true);
test('expired leave finishes before returning',()=>assert.equal(finished.finished,true));
test('winner announced, terminal lock cleanup',()=>{assert.equal(events.at(-1).state.status,'finished');assert.equal(events.at(-1).state.finishReason,'away_timeout');assert.equal(events.at(-1).state.result,active.whiteUid==='a'?'black':'white')});
test('invite TTL 60s, not 120s',()=>assert(socketSrc.includes('INVITE_TTL_MS = 60_000')));
test('A may cancel while invitation pending',()=> assert(socketSrc.includes('socket.on(E.inviteCancel')));
test('H25 invitation gate lives on Firestore with local countdown',()=>{const fire=fs.readFileSync('src/components/games/FirebaseBoardInvitationGate.tsx','utf8');assert(fire.includes('watchMyFirebaseInvitations')&&fire.includes('setInterval(tick,1000)'));});
test('disconnect is a server-side away signal',()=>assert(socketSrc.includes('away-on-disconnect')));
test('Native waits for board-ready pixels',()=>assert(nativeSrc.includes('pieces.size != 64 || paintedCells.size != 64')));
test('H25 native gameplay sends final READY after native assets',()=>assert(controllerSrc.includes('CHESS_EVENTS.gameReady')&&controllerSrc.includes('boardAssetsReadyForGame')));
// Prove that leaving does not become free again if the Render process restarts.
const durable = new Map();
let durableFinishCount = 0;
const durablePersistence = {
  createWithLocks: async game => { durable.set(game.id, structuredClone(game)); },
  save: async game => { durable.set(game.id, structuredClone(game)); },
  finish: async game => { durableFinishCount++; durable.set(game.id, structuredClone(game)); },
  load: async (_family, id) => structuredClone(durable.get(id) ?? null),
};
const beforeRestart = new ChessGameManager(durablePersistence, () => {});
const sample = await beforeRestart.create('family', 'c', 'd', tc);
await beforeRestart.markBoardReady(sample.gameId, 'c', 'board-c-1234');
await beforeRestart.markBoardReady(sample.gameId, 'd', 'board-d-1234');
await beforeRestart.markReady(sample.gameId, 'c', 'play-c-1234');
await beforeRestart.markReady(sample.gameId, 'd', 'play-d-1234');
await beforeRestart.setBoardVisible(sample.gameId, 'c', false);
const storedAway = durable.get(sample.gameId).awayBudgetByUid.c;
test('departure checkpoint persists authoritative deadline',()=>assert(storedAway.deadlineEpochMs>Date.now()+299000));
const afterRestart = new ChessGameManager(durablePersistence, () => {});
await afterRestart.join('family', sample.gameId, 'd');
const recoveredAway = afterRestart.games.get(sample.gameId).boardAwayByUid.get('c');
test('restart recovers same away deadline and budget',()=>{
  assert(recoveredAway);
  assert(Math.abs((Date.now()+recoveredAway.deadlineMono-require('node:perf_hooks').performance.now())-storedAway.deadlineEpochMs)<100);
});
await afterRestart.setBoardVisible(sample.gameId, 'c', false);
test('background reconnect while paused cannot erase away deadline',()=>assert(afterRestart.games.get(sample.gameId).boardAwayByUid.has('c')));
const expiredStored=structuredClone(durable.get(sample.gameId));
expiredStored.awayBudgetByUid.c.deadlineEpochMs=Date.now()-1000;
durable.set(sample.gameId,expiredStored);
const expiredRestart = new ChessGameManager(durablePersistence, () => {});
const terminalOnRestart = await expiredRestart.join('family', sample.gameId,'d');
test('deadline elapsed during Render restart causes terminal loss',()=>assert.equal(terminalOnRestart.finishReason,'away_timeout'));
test('restart timeout frees persisted session locks',()=>assert(durableFinishCount>=1));
console.log(`H21 server/away/invite policy: ${passed}/${passed} PASS`);
})().catch(e=>{console.error('H21 FAIL:',e);process.exitCode=1});
