const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let passed = 0, failed = 0;
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const has = (text, regex) => regex.test(text);
function ok(name, condition, detail = '') {
  if (condition) { passed += 1; console.log(`PASS ${String(passed).padStart(2, '0')} - ${name}`); }
  else { failed += 1; console.error(`FAIL -- ${name}${detail ? `: ${detail}` : ''}`); }
}
function syntax(rel) {
  const source = read(rel);
  const out = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    reportDiagnostics: true,
    fileName: path.basename(rel),
  });
  return (out.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
}

const deferred = read('src/hooks/games/useDeferredGameSurface.ts');
const snapshotCache = read('src/services/chess/chessGameSnapshotCache.ts');
const chessScreen = read('src/app/(chess)/chess-game/[gameId].tsx');
const xiangqiScreen = read('src/app/(xiangqi)/xiangqi-preview.tsx');
const modal = read('src/components/chess/BloomGameBottomModal.tsx');
const chessGameHook = read('src/hooks/chess/useChessGame.ts');
const realtime = read('src/context/ChessRealtimeContext.tsx');
const homeGames = read('src/app/(home)/(games)/home-games.tsx');
const perf = read('src/services/games/gameRuntimePerf.ts');
const chessPieceLayer = read('src/components/chess/v2/PieceLayer.tsx');
const chessPiece = read('src/components/chess/v2/ChessPiece.tsx');
const xiangqiBoard = read('src/components/xiangqi/XiangqiGameBoard.tsx');
const xiangqiPiece = read('src/components/xiangqi/XiangqiPiece.tsx');
const packageJson = read('package.json');
const postCopy = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const preCopy = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const currentGate = read('scripts/test-chess-current-build-gates.js');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

ok('Heavy game surface starts unmounted', has(deferred, /useState\(false\)/));
ok('Heavy game surface mounts only after navigation interactions', has(deferred, /InteractionManager\.runAfterInteractions\(commit\)/));
ok('Heavy surface has bounded entry fallback', has(deferred, /enterFallbackMs\s*=\s*420/) && has(deferred, /setTimeout\(commit, enterFallbackMs\)/));
ok('Heavy surface releases immediately on route blur', has(deferred, /if \(!focused\)[\s\S]{0,260}setMounted\(false\)/));
ok('Blur teardown is not deferred onto destination screen', has(deferred, /do not defer this teardown with InteractionManager/) && !has(deferred, /releaseFallbackMs/));
ok('Deferred callbacks are generation guarded', has(deferred, /generationRef/) && has(deferred, /generationRef\.current !== generation/));

ok('Snapshot cache is non-reactive and bounded', has(snapshotCache, /new Map<string, ChessGameState>/) && has(snapshotCache, /MAX_SNAPSHOTS\s*=\s*8/));
ok('Global realtime caches authoritative snapshots before navigation', has(realtime, /cacheChessGameSnapshot\(next\)/));
ok('Chess route reads cached authoritative snapshot synchronously', has(chessScreen, /getCachedChessGameSnapshot\(gameId \|\| null\)/));
ok('Chess game hook accepts authoritative initial snapshot', has(chessGameHook, /initialState: ChessGameState \| null = null/) && has(chessGameHook, /seededInitialState/));
ok('Seeded Chess route skips blank loading state', has(chessGameHook, /useState\(!seededInitialState\)/) && has(chessGameHook, /commitSnapshot\(seed, "seed"\)/));
ok('Local Chess hook refreshes snapshot cache', has(chessGameHook, /cacheChessGameSnapshot\(next\)/));
ok('Chess fallback loading state is a designed hero shell', has(chessScreen, /Bàn cờ đang về đúng vị trí/) && has(chessScreen, /loadingCard/));

ok('Render health probe is off the socket critical path', has(realtime, /const healthPromise = chessSocketService\.prewake\(\)\.catch/) && has(realtime, /await chessSocketService\.connect\(\)/));
ok('Socket transport marks UI ready before late appJoin ACK', has(realtime, /await chessSocketService\.connect\(\);[\s\S]{0,140}updateConnection\("ready"\)/));
ok('Recovering appJoin keeps a healthy connected socket ready', has(realtime, /joined\.errorCode === "CHESS_SERVER_RECOVERING"/) && has(realtime, /updateConnection\("ready"\)/));
ok('appJoin capability remains server-authoritative when reported', has(realtime, /appJoinBotReported/) && has(realtime, /setTestBotEnabled\(botEnabled\)/));
ok('Missing appJoin capability falls back to noncritical health result', has(realtime, /void healthPromise\.then/) && has(realtime, /source: "health"/));
ok('Lobby join can independently repair readiness', has(realtime, /const enterLobby = useCallback/) && has(realtime, /if \(response\.ok\)[\s\S]{0,180}updateConnection\("ready"\)/));
ok('Lobby capability also falls back to noncritical health probe', has(realtime, /lobbyBotReported/) && has(realtime, /chessSocketService\.prewake\(\)\.then/));

ok('Chess binds heavy board surface to route focus', has(chessScreen, /useDeferredGameSurface\(screenFocused\)/) && has(chessScreen, /const boardSurfaceVisible = heavySurfaceMounted/));
ok('Xiangqi binds heavy board surface to route focus', has(xiangqiScreen, /useDeferredGameSurface\(screenFocused\)/) && has(xiangqiScreen, /const boardSurfaceVisible = heavySurfaceMounted/));
ok('Chess physically unmounts native board while heavy surface is absent', has(chessScreen, /boardSurfaceVisible \? \(/) && has(chessScreen, /<ChessBoard/));
ok('Xiangqi physically unmounts native board while heavy surface is absent', has(xiangqiScreen, /boardSurfaceVisible \? \(/) && has(xiangqiScreen, /<XiangqiGameBoard/));
ok('Opt-in perf probe can record native surface retention without running by default', has(perf, /surfaceMounted:boolean/) && has(perf, /markSurface/) && has(perf, /let enabled=false/));
ok('Chess and Xiangqi report native surface lifecycle', has(chessScreen, /markSurface\("chess", heavySurfaceMounted\)/) && has(xiangqiScreen, /markSurface\("xiangqi", heavySurfaceMounted\)/));

ok('Ready sheet supports static first presentation', has(modal, /staticFirstPresentation\?: boolean/) && has(modal, /staticFirstPresentation && firstPresentation/));
ok('Static first presentation avoids entrance animation during route transition', has(modal, /backdropOpacity\.value = 1/) && has(modal, /translateY\.value = 0/) && has(modal, /scale\.value = 1/));
ok('Ready sheet can be parked immediately when route is blurred', has(modal, /suspended\?: boolean/) && has(modal, /if \(suspended\)/));
ok('Chess entry sheet uses static first presentation and blur suspension', has(chessScreen, /staticFirstPresentation/) && has(chessScreen, /suspended=\{!screenFocused\}/));
ok('Xiangqi entry sheet uses static first presentation and blur suspension', has(xiangqiScreen, /staticFirstPresentation/) && has(xiangqiScreen, /suspended=\{!screenFocused\}/));
ok('Xiangqi modal only advances to Ready after real board readiness', has(xiangqiScreen, /if \(!boardReady\)[\s\S]{0,140}setRoundPhase\("preparing"\)/) && has(xiangqiScreen, /setRoundPhase\("ready"\)/));
ok('Chess modal only advances to Ready after real board readiness', has(chessScreen, /if \(!boardReady\)[\s\S]{0,140}setEntryPhase\("preparing"\)/) && has(chessScreen, /setEntryPhase\("ready"\)/));
ok('Xiangqi already-playing round does not replay ready ceremony', has(xiangqiScreen, /if \(roundPhase === "playing"\) return undefined/));

ok('Chess launcher uses a high-contrast real black knight asset', has(homeGames, /accessibilityLabel="Quân Mã cờ vua"/) && has(homeGames, /pieces-png-default\/bn\.png/) && has(homeGames, /chessPieceIcon/));
ok('Chess launcher avoids the washed-out white king asset', !has(homeGames, /pieces-png-default\/wk\.png/));
ok('Chess first route render starts focus-active so preparing shield can paint immediately', has(chessScreen, /useState\(true\)/));
ok('Xiangqi first route render starts focus-active so preparing shield can paint immediately', has(xiangqiScreen, /useState\(true\)/));
ok('Chess piece nodes are staged across multiple paint frames', has(chessPieceLayer, /renderCount/) && has(chessPieceLayer, /Math\.min\(8, pieces\.length\)/) && has(chessPieceLayer, /Math\.min\(18, pieces\.length\)/) && has(chessPieceLayer, /Math\.min\(26, pieces\.length\)/));
ok('Xiangqi piece nodes are staged across multiple paint frames', has(xiangqiBoard, /pieceRenderCount/) && has(xiangqiBoard, /Math\.min\(8, initialCount\)/) && has(xiangqiBoard, /Math\.min\(18, initialCount\)/) && has(xiangqiBoard, /Math\.min\(26, initialCount\)/));
ok('Chess and Xiangqi piece art use expo-image memory cache', has(chessPiece, /from "expo-image"/) && has(chessPiece, /cachePolicy="memory"/) && has(xiangqiPiece, /from "expo-image"/) && has(xiangqiPiece, /cachePolicy="memory"/));

ok('Phase 16B16 package script exists', has(packageJson, /"phase16b16:check"\s*:\s*"node \.\/scripts\/test-phase16b16-game-entry-lifecycle-recovery\.js"/));
ok('Post-copy updater runs Phase 16B16 through current Chess aggregate once', has(postCopy, /chess:current-check/) && !has(postCopy, /npm run phase16b16:check/) && has(postCopy, /Phase 16B\.(16|17|18)/));
ok('Pre-copy script identifies Phase 16B16', has(preCopy, /Phase 16B\.(16|17|18)/));
ok('Pre-copy removes obsolete Phase 16B15 asset warmup file', has(preCopy, /gameAssetWarmup\.ts/));
ok('Current Chess aggregate includes Phase 16B16', has(currentGate, /test-phase16b16-game-entry-lifecycle-recovery\.js/));
ok('Android Debug and Release preserve Phase 16B16 through current aggregate without duplicate direct calls', has(debugBat, /chess:current-check/) && has(releaseBat, /chess:current-check/) && !has(debugBat, /phase16b16:check/) && !has(releaseBat, /phase16b16:check/));

const syntaxFiles = [
  'src/hooks/games/useDeferredGameSurface.ts',
  'src/services/chess/chessGameSnapshotCache.ts',
  'src/services/games/gameRuntimePerf.ts',
  'src/components/chess/BloomGameBottomModal.tsx',
  'src/context/ChessRealtimeContext.tsx',
  'src/hooks/chess/useChessGame.ts',
  'src/app/(chess)/chess-game/[gameId].tsx',
  'src/app/(xiangqi)/xiangqi-preview.tsx',
  'src/app/(home)/(games)/home-games.tsx',
  'src/components/chess/v2/PieceLayer.tsx',
  'src/components/chess/v2/ChessPiece.tsx',
  'src/components/xiangqi/XiangqiGameBoard.tsx',
  'src/components/xiangqi/XiangqiPiece.tsx',
];
const syntaxErrors = syntaxFiles.flatMap(rel => syntax(rel).map(diag => `${rel}: ${ts.flattenDiagnosticMessageText(diag.messageText, ' ')}`));
ok(`Phase 16B16 changed TypeScript/TSX syntax (${syntaxFiles.length} files)`, syntaxErrors.length === 0, syntaxErrors.slice(0, 5).join(' | '));

console.log(`\nPhase 16B16 entry/lifecycle recovery gate: ${passed}/${passed + failed} PASS`);
if (failed) process.exit(1);
