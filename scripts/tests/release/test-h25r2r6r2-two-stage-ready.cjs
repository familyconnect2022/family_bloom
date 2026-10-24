// H25R2R6R2 test: guards against server skipping Stage 1 for human games.
'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__legacyScriptsDir,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
let total=0;
function test(name,fn){fn();console.log(`[H25R2R6R2 PASS ${++total}] ${name}`);}
const chess=read('server/src/chess/chessGameManager.ts');
const xiangqi=read('server/src/xiangqi/xiangqiGameManager.ts');
const clientChess=read('src/services/games/nativeChessGameplayController.ts');
const clientXiangqi=read('src/services/games/nativeXiangqiGameplayController.ts');
const nativeXiangqi=read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt');
const health=read('server/src/routes/health.ts');
for(const [name,code,colors] of [['chess',chess,'whiteUid,blackUid'],['xiangqi',xiangqi,'redUid,blackUid']]) {
  test(`${name}: game created at board stage`,()=>assert(code.includes('preparationPhase: "board"')));
  test(`${name}: do not pre-certify human players`,()=>{assert(!code.includes(`new Set(bot ? [bot] : [${colors}])`));assert(!code.includes(`new Set(options?.testBotUid ? [options.testBotUid] : [${colors}])`));});
  test(`${name}: only native signals transition into colors`,()=>{assert(code.includes('r.boardReadyUids.add(uid)'));assert(/r\.boardReadyUids\.has\(r\.game\./.test(code));assert(code.includes('r.game.preparationPhase = "colors"'));});
  test(`${name}: clock starts only after both READY`,()=>{assert(code.includes('r.readyUids.add(uid)'));assert(code.includes('r.turnStartedMono = r.game.timeControl.kind === "clocked"'));});
  test(`${name}: READY before colors rejected`,()=>assert(code.includes('r.game.preparationPhase !== "colors"')));
}
test('chess client native assets gate stays mandatory',()=>assert(clientChess.includes('boardAssetsReadyForGame === state.gameId')));
test('xiangqi client native assets gate stays mandatory',()=>assert(clientXiangqi.includes('nativeAssetsReady === g.gameId')));
test('xiangqi native events can replay after timeout only while board is waiting',()=>{assert(nativeXiangqi.includes('lastAssetsReadyEmitAt'));assert(nativeXiangqi.includes('s.status=="waiting"'));assert(nativeXiangqi.includes('loaded.size==audioMap.size'));assert(nativeXiangqi.includes('5000L'));});
test('health carries fresh unique deploy marker',()=>assert(health.includes('h25r2r6r2-two-stage-human-ready')));
console.log(`H25R2R6R2 TWO-STAGE READY REGRESSION: ${total}/${total} PASS`);
