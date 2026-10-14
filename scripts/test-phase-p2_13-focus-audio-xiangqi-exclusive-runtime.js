const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
let pass = 0, fail = 0;
function check(name, ok) {
  if (ok) { pass += 1; console.log(`PASS ${String(pass).padStart(2, '0')} - ${name}`); }
  else { fail += 1; console.error(`FAIL -- ${name}`); }
}
function syntax(rel) {
  const out = ts.transpileModule(read(rel), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    reportDiagnostics: true,
    fileName: rel,
  });
  return !(out.diagnostics || []).some((d) => d.category === ts.DiagnosticCategory.Error);
}

const sceneBuilder = read('src/components/familyGraph/familyGraphSceneBuilder.ts');
const graphPrototype = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const graphRoute = read('src/app/(family)/(graph)/family-graph.tsx');
const chessBoard = read('src/components/chess/ChessBoard.tsx');
const chessHost = read('src/components/chess/ChessSurfaceHost.tsx');
const chessAudio = read('src/components/chess/useChessSoundscape.ts');
const xiangqiHost = read('src/components/xiangqi/XiangqiSurfaceHost.tsx');
const xiangqiRoute = read('src/app/(xiangqi)/xiangqi-preview.tsx');
const surfaceStack = read('src/components/system/BloomSurfaceStack.tsx');
const hintTiming = read('src/components/games/hintTiming.ts');
const chessPersist = read('server/src/chess/chessPersistenceService.ts');
const xiangqiPersist = read('server/src/xiangqi/xiangqiPersistenceService.ts');
const chessSocket = read('server/src/socket/socketServer.ts');
const xiangqiSocket = read('server/src/xiangqi/xiangqiSocket.ts');
const chessRealtime = read('src/context/ChessRealtimeContext.tsx');
const cleanBat = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const preBat = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

// Focus BSH hot revisit.
check('BSH has snapshot-identity renderer-ready hot cache', sceneBuilder.includes('new WeakMap<FamilyGraphSnapshot') && sceneBuilder.includes('peekFamilyGraphRenderScene'));
check('sync BSH facade remembers completed scenes', sceneBuilder.includes('rememberFamilyGraphRenderScene(snapshot, options, buildFamilyGraphScene'));
{
  const interruptible = sceneBuilder.slice(sceneBuilder.indexOf('export const buildFamilyGraphRenderSceneInterruptible'), sceneBuilder.indexOf('export const buildFamilyGraphRenderSceneInterruptible') + 2600);
  check('interruptible BSH bypasses scheduling yields on hot revisit', interruptible.indexOf('const hot = peekFamilyGraphRenderScene(snapshot, options);') >= 0 && interruptible.indexOf('const hot = peekFamilyGraphRenderScene(snapshot, options);') < interruptible.indexOf('await yieldFamilyGraphBuild();'));
}
check('Focus route exposes zero-work cache peek', graphRoute.includes('getCachedFocusBranchVisual') && graphRoute.includes('peekFamilyGraphRenderScene(snapshot'));
check('Focus Modal opens shell before hydration while retained same-person Scene stays instant', graphPrototype.includes('shell-first Focus') && graphPrototype.includes('focusOverlay?.personId === personId && focusOverlay.visual'));
check('Focus branch switch has no artificial 74ms timer gate', graphPrototype.includes('branch switch is shell-first') && !graphPrototype.includes('}, 74);'));

// Chess exact supplied audio + low-latency exactly-once move timing.
check('optimistic local legal move starts sound without server RTT', chessBoard.includes('onMoveStarted?.(applied') && chessBoard.includes('clientMoveId'));
check('authoritative move reuses clientMoveId for dedupe', chessBoard.includes('onMoveStarted?.(delta.move, !!delta.checkSquare, delta.clientMoveId)'));
check('persistent host dedupes move ids', chessHost.includes('acceptedMoveSoundIdsRef') && chessHost.includes('seen.has(eventId)'));
const suppliedBoard = ['move-self','move-opponent','capture','move-check','castle','promote','premove','illegal','tenseconds','game-start','game-end'];
check('all 11 exact supplied MP3 assets are present', suppliedBoard.every((name) => exists(`assets/audio/board-game/${name}.mp3`)));
check('retired generated Chess WAV bank is absent', !exists('assets/audio/chess'));
check('Chess soundscape uses only supplied board vocabulary', chessAudio.includes('useBoardGameSoundscape') && !chessAudio.includes('CHESS_SOURCES'));
check('Chess terminal audio stays inside supplied terminal cue', chessAudio.includes('playWin: board.playGameEnd') && chessAudio.includes('playLoss: board.playGameEnd') && chessAudio.includes('playTimeout: board.playGameEnd'));

// Xiangqi persistent Chess-parity runtime + no battle FX + faster hints.
check('Xiangqi has process-persistent surface store/host', exists('src/services/xiangqi/xiangqiSurfaceStore.ts') && exists('src/components/xiangqi/XiangqiSurfaceHost.tsx'));
check('root game plane owns Xiangqi persistent host', surfaceStack.includes('<XiangqiSurfaceHost occludedByHigherSurface={policy.gamesOccluded} />'));
check('Xiangqi route is controller-only and owns no board', xiangqiRoute.includes('showXiangqiSurfaceFull("route", ownerId)') && !xiangqiRoute.includes('<XiangqiGameBoard'));
check('Xiangqi board stays mounted after first prepare', xiangqiHost.includes('if (!surface.prepared) return null') && (xiangqiHost.includes('surface.mode === "full"') || xiangqiHost.includes('isBoardGameSurfacePresented(surface.presentationReady, surface.mode)')));
check('Xiangqi battle FX source is physically removed', !exists('src/components/xiangqi/XiangqiBattleEffects.tsx') && !xiangqiHost.includes('XiangqiBattleEffects'));
const revealMatch = hintTiming.match(/HINT_REVEAL_BUDGET_MS\s*=\s*(\d+)/);
const popMatch = hintTiming.match(/HINT_POP_MS\s*=\s*(\d+)/);
check('hint reveal budget is now 60ms or faster', !!revealMatch && Number(revealMatch[1]) <= 60);
check('hint pop fits inside faster reveal budget', !!revealMatch && !!popMatch && Number(popMatch[1]) < Number(revealMatch[1]));

// One durable active board game per uid across Chess + Xiangqi.
check('Chess and Xiangqi share one durable uid lock collection', chessPersist.includes('chessActiveUsers/${uid}') && xiangqiPersist.includes('chessActiveUsers/${uid}'));
check('both game creators atomically reject an existing uid lock', chessPersist.includes('if (w.exists || b.exists)') && xiangqiPersist.includes('if(rs.exists||bs.exists)'));
check('lock records identify gameKind', chessPersist.includes('gameKind: "chess"') && xiangqiPersist.includes('gameKind:"xiangqi"'));
check('Chess recovery exposes active Xiangqi instead of creating Chess', chessSocket.includes('kind: "busy_other_game"') && chessSocket.includes('gameKind: "xiangqi"'));
check('Xiangqi recovery exposes active Chess instead of creating Xiangqi', xiangqiSocket.includes('kind:"busy_other_game"') && xiangqiSocket.includes('gameKind:"chess"'));
check('Chess client tracks other active board game', chessRealtime.includes('busyOtherGame') && chessRealtime.includes('recovery.data.kind === "busy_other_game"'));
check('Xiangqi client returns same-family user to active Chess', xiangqiHost.includes('recovered.data.kind === "busy_other_game"') && xiangqiHost.includes('showChessSurfaceFull(recovered.data.gameId)'));

// Copy-over/build guardrails.
check('copy-over cleanup removes retired Xiangqi FX file', preBat.includes('XiangqiBattleEffects.tsx') || cleanBat.includes('XiangqiBattleEffects.tsx'));
check('copy-over updater runs P2.13 gate', cleanBat.includes('test-phase-p2_13-focus-audio-xiangqi-exclusive-runtime.js'));
check('Debug build runs P2.13 gate', debugBat.includes('phaseP2_13:check'));
check('Release build runs P2.13 gate', releaseBat.includes('phaseP2_13:check'));
check('package exposes P2.13 regression command', read('package.json').includes('phaseP2_13:check'));

for (const file of [
  'src/components/familyGraph/familyGraphSceneBuilder.ts',
  'src/components/familyGraph/FamilyGraphPrototype.tsx',
  'src/app/(family)/(graph)/family-graph.tsx',
  'src/components/chess/useChessSoundscape.ts',
  'src/components/chess/ChessBoard.tsx',
  'src/components/chess/ChessSurfaceHost.tsx',
  'src/context/ChessRealtimeContext.tsx',
  'src/services/xiangqi/xiangqiSurfaceStore.ts',
  'src/components/xiangqi/XiangqiSurfaceHost.tsx',
  'src/app/(xiangqi)/xiangqi-preview.tsx',
  'server/src/socket/socketServer.ts',
  'server/src/xiangqi/xiangqiSocket.ts',
]) check(`syntax ${file}`, syntax(file));

console.log(`\nFamily Bloom P2.13 Focus/Audio/Xiangqi Exclusive Runtime: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
