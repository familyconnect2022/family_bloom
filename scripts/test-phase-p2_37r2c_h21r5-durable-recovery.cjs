/** Regression: old Render worker is gone, Firestore waiting lock survives. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const perf = require('node:perf_hooks');
const src = fs.readFileSync('server/src/chess/chessGameManager.ts','utf8');
const socket = fs.readFileSync('server/src/socket/socketServer.ts','utf8');
const recoveryUI = fs.readFileSync('src/components/games/ChessSessionRecoveryGate.tsx','utf8');
const controller = fs.readFileSync('src/services/games/nativeChessGameplayController.ts','utf8');
const health = fs.readFileSync('server/src/routes/health.ts','utf8');
const js = ts.transpileModule(src, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
class FakeChess {
 fen(){return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'}
 pgn(){return ''} history(){return []} turn(){return 'w'} isCheck(){return false}
 board(){return Array.from({length:8},()=>Array(8).fill(null))}
 load(){} loadPgn(){} moves(){return []}
}
class DomainError extends Error { constructor(code) {super(code);this.code=code;} }
const exports_ = {};
vm.runInNewContext(js, {
 exports:exports_, require:n=>n==='node:crypto'?require('node:crypto'):n==='node:perf_hooks'?perf:n==='chess.js'?{Chess:FakeChess}:n.endsWith('chessTypes.js')?{ChessDomainError:DomainError}:{},
 Date,Math,Set,Map,Promise,structuredClone,setInterval,setTimeout,clearInterval,clearTimeout,console,performance:perf.performance,
});
const {ChessGameManager} = exports_;
let total=0;
async function test(name,fn) {await fn();console.log('PASS',name);total++}
const store=new Map();const events=[];const locks=new Map();
const persistence={
 createWithLocks:async g=>{store.set(g.id,structuredClone(g));for(const uid of g.playerUids) locks.set(uid,g.id)},
 save:async g=>{store.set(g.id,structuredClone(g))},
 finish:async g=>{store.set(g.id,structuredClone(g));for(const uid of g.playerUids) if(locks.get(uid)===g.id) locks.delete(uid)},
 load:async (_family,id)=>structuredClone(store.get(id)??null),
};
const manager=()=>new ChessGameManager(persistence,e=>events.push(e));
const tc={kind:'clocked',initialMs:600000,incrementMs:0};
(async()=>{
 const m1=manager();const stale=await m1.create('f','human','bot',tc,undefined,{testBotUid:'bot'});
 store.get(stale.gameId).createdAt=new Date(Date.now()-240000).toISOString();
 const m2=manager();const recovered=await m2.recover('f',stale.gameId,'human');
 await test('cold restore expires stale unstarted game',()=>{assert.equal(recovered.status,'cancelled');assert.equal(recovered.finishReason,'abandoned')});
 await test('stale waiting game cannot keep durable active lock',()=>assert.equal(locks.get('human'),undefined));
 await test('expired waiting room is terminal on joining',async()=>{const joined=await m2.join('f',stale.gameId,'human');assert.equal(joined.status,'cancelled')});
 const m3=manager();const away=await m3.create('f','leftHuman','bot2',tc,undefined,{testBotUid:'bot2'});
 const a=await m3.setBoardVisible(away.gameId,'leftHuman',false);
 await test('waiting room absence checkpoint has bounded deadline',()=>{assert(a.awayDeadlineAt<=Date.parse(away.createdAt)+120000+100);assert(store.get(away.gameId).awayBudgetByUid.leftHuman.deadlineEpochMs)});
 store.get(away.gameId).createdAt=new Date(Date.now()-240000).toISOString();
 const m4=manager();const awayRecover=await m4.recover('f',away.gameId,'leftHuman');
 await test('preparing game with recorded departure yields server-authoritative loss',()=>{assert.equal(awayRecover.status,'finished');assert.equal(awayRecover.finishReason,'away_timeout');assert.equal(awayRecover.result,awayRecover.whiteUid==='leftHuman'?'black':'white')});
 await test('preparing absence terminal frees BOTH player locks',()=>{assert(!locks.has('leftHuman'));assert(!locks.has('bot2'))});
 const m5=manager();const again=await m5.create('f','freshHuman','bot3',tc,undefined,{testBotUid:'bot3'});
 const first=await m5.setBoardVisible(again.gameId,'freshHuman',false);
 const repeat=await m5.setBoardVisible(again.gameId,'freshHuman',false);
 await test('duplicate departure does not extend deadline',()=>assert(Math.abs(first.awayDeadlineAt-repeat.awayDeadlineAt)<100));
 await m5.setBoardVisible(again.gameId,'freshHuman',true);
 await test('return before away deadline clears pregame absence',()=>assert(!m5.games.get(again.gameId).boardAwayByUid.has('freshHuman')));
 const resumed=await m5.markBoardReady(again.gameId,'freshHuman','b-ready');
 await test('return before expiry can still prepare board',()=>assert.equal(resumed.preparationPhase,'colors'));
 const expired=await m5.create('f','lateHuman','bot4',tc,undefined,{testBotUid:'bot4'});
 m5.games.get(expired.gameId).game.createdAt=new Date(Date.now()-125000).toISOString();
 await test('READY cannot resurrect a game after immutable preparation deadline',async()=>{
   await assert.rejects(()=>m5.markBoardReady(expired.gameId,'lateHuman','board-late'),e=>e.code==='CHESS_GAME_FINISHED');
   assert.equal(m5.games.get(expired.gameId).game.status,'cancelled');
 });
 await test('every live-lock lookup uses durable reconciliation',()=>{const calls=(socket.match(/await resolveCurrentGameForUid\(/g)||[]).length;assert(calls>=10);assert(socket.includes('await manager.recover(lock.familyId, lock.gameId, uid)'))});
 await test('returned waiting player sends foreground presence to clear absence',()=>assert(recoveryUI.includes('joined.data.status === "waiting"')));
 await test('native watchdog resyncs when waiting deadline elapsed',()=>assert(controller.includes('watchWaitingDeadline(state)')&&controller.includes('waiting-deadline-expired')));
 await test('Render health fingerprint distinguishes deployed fix',()=>assert(health.includes('h21r5-durable-preparation-recovery')));
 console.log(`H21R5 durable cold-recovery checks ${total}/${total} PASS`);
})().catch(err=>{console.error('FAIL H21R5',err);process.exitCode=1});
