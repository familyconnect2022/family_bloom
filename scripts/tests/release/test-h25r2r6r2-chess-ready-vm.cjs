#!/usr/bin/env node
'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
// Dynamic isolated real ChessGameManager lifecycle test. No Firebase credentials.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
let ts;
try {
  // This regression runs after the root dependency bootstrap in all build paths.
  ts=require('typescript');
} catch (error) {
  console.error('[CHESS READY VM] TypeScript is missing from the project root.');
  console.error('Run Family_Bloom_ENSURE_GATE_DEPENDENCIES.bat / npm install --include=dev before this runtime gate.');
  process.exit(1);
}
class FakeChess {
  fen(){return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'}
  pgn(){return ''}
  turn(){return 'w'}
  history(){return []}
  isCheck(){return false}
  isCheckmate(){return false}
  isStalemate(){return false}
  isInsufficientMaterial(){return false}
  isThreefoldRepetition(){return false}
  isDraw(){return false}
  moves(){return []}
  board(){return Array.from({length:8},()=>Array(8).fill(null))}
}
class DomainError extends Error {constructor(code,msg){super(msg||code);this.code=code}}
const source=fs.readFileSync(path.join(__legacyScriptsDir,'../server/src/chess/chessGameManager.ts'),'utf8');
const out=ts.transpileModule(source,{fileName:'chessGameManager.ts',reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
assert.equal(out.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error).length??0,0);
const managerExports={};
vm.runInNewContext(out.outputText,{
 exports:managerExports,require:n=>n==='node:crypto'?require('node:crypto'):n==='node:perf_hooks'?require('node:perf_hooks'):
   n==='chess.js'?{Chess:FakeChess}:n.endsWith('chessTypes.js')?{ChessDomainError:DomainError}:{},
 performance:require('node:perf_hooks').performance,console,Date,Math,Array,Set,Map,Promise,structuredClone,
 setTimeout,clearTimeout,setInterval:()=>({unref(){}}),
});
const stored=new Map();
const persistence={
 async createWithLocks(game){stored.set(game.id,structuredClone(game))},
 async save(game){stored.set(game.id,structuredClone(game))},
 async finish(game){stored.set(game.id,structuredClone(game))},
 async load(_,id){return structuredClone(stored.get(id)||null)},
};
const manager=new managerExports.ChessGameManager(persistence,()=>{});
const tc={kind:'clocked',initialMs:300000,incrementMs:0};
let pass=0;
const check=(name,fn)=>{fn();console.log(`[CHESS READY PASS ${++pass}] ${name}`)};
(async()=>{
 const g=await manager.create('family','humanA','humanB',tc,'test-create');
 check('new human match has hidden colors and no startedAt',()=>{assert.equal(g.status,'waiting');assert.equal(g.preparationPhase,'board');assert.equal(g.whiteUid,'');assert.equal(g.blackUid,'');assert.equal(g.startedAt,null)});
 await assert.rejects(()=>manager.markReady(g.gameId,'humanA','too-early'),e=>e.code==='CHESS_SERVER_RECOVERING');
 check('a client cannot send playReady before both boards ready',()=>{});
 const stage1=await manager.markBoardReady(g.gameId,'humanA','board-a');
 check('first board-ready does not reveal colors',()=>{assert.equal(stage1.preparationPhase,'board');assert.equal(stage1.status,'waiting');assert.equal(stage1.whiteUid,'')});
 const colors=await manager.markBoardReady(g.gameId,'humanB','board-b');
 check('second board-ready reveals exactly one locked pair',()=>{assert.equal(colors.preparationPhase,'colors');assert([g.gameId,colors.gameId].every(x=>x===g.gameId));assert(colors.whiteUid&&colors.blackUid&&colors.whiteUid!==colors.blackUid);assert.equal(colors.startedAt,null)});
 const first=await manager.markReady(g.gameId,'humanA','ready-a');
 check('one playReady cannot start server clock',()=>{assert.equal(first.status,'waiting');assert.equal(first.startedAt,null);assert.equal(stored.get(g.gameId).readyUids.length,1)});
 const active=await manager.markReady(g.gameId,'humanB','ready-b');
 check('both playReady start exactly once',()=>{assert.equal(active.status,'active');assert(active.startedAt);assert.equal(stored.get(g.gameId).status,'active');assert.equal(active.whiteRemainingMs!==null,true)});
 const again=await manager.markReady(g.gameId,'humanA','ready-repeat');
 check('ready repeats cannot restart a clock or game',()=>{assert.equal(again.startedAt,active.startedAt);assert.equal(again.revision,active.revision)});
 const bot=await manager.create('family','humanC','botC',tc,'test-bot',{testBotUid:'botC'});
 check('Bloom Bot gets only its own board/play ready until human is ready',()=>{assert.equal(bot.preparationPhase,'board');assert.equal(bot.status,'waiting')});
 const botColors=await manager.markBoardReady(bot.gameId,'humanC','board-human');
 check('Bot board enters colors only after real human board-ready',()=>assert.equal(botColors.preparationPhase,'colors'));
 const botActive=await manager.markReady(bot.gameId,'humanC','ready-human');
 check('Bot turn starts only after real human playReady',()=>assert.equal(botActive.status,'active'));
 console.log(`CHESS GAME MANAGER TWO-STAGE DYNAMIC: ${pass}/${pass} PASS`);
})().catch(e=>{console.error('CHESS READY VM FAIL',e);process.exitCode=1});
