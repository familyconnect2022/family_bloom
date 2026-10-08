const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function ok(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`PASS ${String(passed).padStart(2, '0')} - ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL -- ${name}${detail ? `: ${detail}` : ''}`);
  }
}
function has(text, regex) { return regex.test(text); }
function syntax(rel) {
  const source = read(rel);
  const out = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
    reportDiagnostics: true,
    fileName: path.basename(rel),
  });
  return (out.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
}

const hintTiming = read('src/components/games/hintTiming.ts');
const hintLayer = read('src/components/chess/v2/HintLayer.tsx');
const chessPiece = read('src/components/chess/v2/ChessPiece.tsx');
const interaction = read('src/components/chess/v2/InteractionLayer.tsx');
const chessBoard = read('src/components/chess/ChessBoard.tsx');
const chessScreen = read('src/app/(chess)/chess-game/[gameId].tsx');
const chessSurfaceHost = read('src/components/chess/ChessSurfaceHost.tsx');
const phase17_9a9 = read('package.json').includes('phase17_9a9:check');
const modal = read('src/components/chess/BloomGameBottomModal.tsx');
const xiangqiBoard = read('src/components/xiangqi/XiangqiGameBoard.tsx');
const xiangqiPiece = read('src/components/xiangqi/XiangqiPiece.tsx');
const xiangqiScreen = read('src/app/(xiangqi)/xiangqi-preview.tsx');
const lobbyHook = read('src/hooks/chess/useChessLobby.ts');
const realtime = read('src/context/ChessRealtimeContext.tsx');
const homeGames = read('src/app/(home)/(games)/home-games.tsx');
const serverSocket = read('server/src/socket/socketServer.ts');
const xiangqiFx = read('src/components/xiangqi/XiangqiBattleEffects.tsx');
const perf = read('src/services/games/gameRuntimePerf.ts');
const victoryConfetti = read('src/components/chess/ChessVictoryConfetti.tsx');
const chessGameHook = read('src/hooks/chess/useChessGame.ts');
const preCopy = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const postCopy = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

// Runtime-test the actual TypeScript scheduler rather than just checking strings.
const compiled = ts.transpileModule(hintTiming, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;
const sandbox = { exports: {}, module: { exports: {} }, require, console };
sandbox.exports = sandbox.module.exports;
vm.runInNewContext(compiled, sandbox, { filename: 'hintTiming.js' });
const { buildParallelHintDelays, HINT_REVEAL_BUDGET_MS, HINT_POP_MS } = sandbox.module.exports;
const source = { col: 4, row: 4 };
const rookTargets = [
  { col: 4, row: 3 }, { col: 4, row: 2 }, { col: 4, row: 1 },
  { col: 4, row: 5 }, { col: 4, row: 6 },
  { col: 3, row: 4 }, { col: 2, row: 4 },
  { col: 5, row: 4 }, { col: 6, row: 4 },
];
const rookDelays = buildParallelHintDelays(source, rookTargets);
const d = (c, r) => rookDelays.get(`${c}:${r}`);
const maxDelay = Math.max(...Array.from(rookDelays.values()));
const jumpTargets = [
  { col: 2, row: 3 }, { col: 2, row: 5 }, { col: 3, row: 2 },
  { col: 3, row: 6 }, { col: 5, row: 2 }, { col: 6, row: 3 },
];
const jumpDelays = buildParallelHintDelays(source, jumpTargets);

ok('Hint global reveal budget remains bounded at or below 200 ms', HINT_REVEAL_BUDGET_MS > 0 && HINT_REVEAL_BUDGET_MS <= 200);
ok('Hint pop duration leaves stagger room inside global budget', HINT_POP_MS > 0 && HINT_POP_MS < HINT_REVEAL_BUDGET_MS);
ok('Rook four rays start concurrently at t=0', d(4,3) === 0 && d(4,5) === 0 && d(3,4) === 0 && d(5,4) === 0);
ok('Whole rook hint set finishes inside configured global budget', maxDelay + HINT_POP_MS <= HINT_REVEAL_BUDGET_MS, `${maxDelay}+${HINT_POP_MS}`);
ok('Jump/non-ray hints also finish inside configured global budget', Math.max(...Array.from(jumpDelays.values())) + HINT_POP_MS <= HINT_REVEAL_BUDGET_MS);
ok('Scheduler groups linear moves by normalized ray', has(hintTiming, /ray:\$\{sign\(dx\)\}:\$\{sign\(dy\)\}/));

ok('Chess hint layer uses fixed 32-slot pool', has(hintLayer, /MAX_HINT_SLOTS\s*=\s*32/) && has(hintLayer, /Array\.from\(\{ length: MAX_HINT_SLOTS \}/));
ok('Chess quiet/capture hints share parallel scheduler', has(hintLayer, /buildParallelHintDelays\(source, scheduled\)/) && has(hintLayer, /captureMode/));
ok('Xiangqi hint layer uses fixed 20-slot pool', has(xiangqiBoard, /MAX_XIANGQI_HINT_SLOTS\s*=\s*20/) && has(xiangqiBoard, /Array\.from\(\{ length: MAX_XIANGQI_HINT_SLOTS \}/));
ok('Xiangqi quiet/capture hints share parallel scheduler', has(xiangqiBoard, /buildParallelHintDelays\(source, scheduled\)/) && has(xiangqiBoard, /captureMode/));
ok('Old Xiangqi index*28ms stagger is gone', !has(xiangqiBoard, /index\s*\*\s*28|28\s*\*\s*index/));

ok('Chess piece nodes own no Pan/Tap gesture under tap-only policy', !has(chessPiece, /Gesture\.(Pan|Tap)\(/) && !has(chessPiece, /GestureDetector/));
ok('Chess piece nodes cannot steal board taps', has(chessPiece, /pointerEvents="none"/) && has(chessBoard, /<InteractionLayer/));
ok('Board owns the single Chess tap recognizer', has(interaction, /Gesture\.Tap\(\)/) && has(interaction, /maxDistance\(14\)/) && !has(interaction, /ChessBoardTapGestureContext/));
ok('ChessBoard has no piece drag/drop path', !has(chessBoard, /onDragStart|onDragCancel|onDrop|positionToSquare|"drag"/));
ok('Tap-only still supports one local premove', has(chessBoard, /queuePremove/) && has(chessBoard, /"premove"/) && has(chessBoard, /premoveRef/));

ok('Chess readiness requires layout + controllers + assets', has(chessBoard, /layoutReadyRef/) && has(chessBoard, /controllersRef\.current\.size < initialPieces\.length/) && has(chessBoard, /assetReadyIdsRef\.current\.size < initialPieces\.length/));
ok('Chess readiness waits two painted frames', has(chessBoard, /requestAnimationFrame\(\(\) => requestAnimationFrame\(/));
ok('Persistent Chess surface gates entry on real board readiness', has(chessSurfaceHost, /const \[warmReady, setWarmReady\]/) && has(chessSurfaceHost, /onBoardReady=\{handleBoardReady\}/));
ok('Chess ready shield has no old 360/1020 synthetic readiness timers', !has(chessScreen, /setTimeout\([^\n]*360|setTimeout\([^\n]*1020/));
ok('Xiangqi readiness is epoch-aware and reports after two frames', has(xiangqiBoard, /readyEpoch/) && has(xiangqiBoard, /requestAnimationFrame\(\(\) => requestAnimationFrame\(/) && has(xiangqiBoard, /onReady\(\)/));
ok('Xiangqi piece assets report onLoadEnd', has(xiangqiPiece, /onLoadEnd/) && has(xiangqiPiece, /onAssetReady/));
ok('Xiangqi screen gates entry on real boardReady', has(xiangqiScreen, /const \[boardReady, setBoardReady\]/) && has(xiangqiScreen, /readyEpoch=\{roundEpoch\}/) && has(xiangqiScreen, /onReady=\{handleBoardReady\}/));
ok('Ready flows never hold stale preparation over active play', (phase17_9a9 ? (has(chessSurfaceHost, /first interactive\/uncovered frame/) && !has(chessSurfaceHost, /setEntryPhase\("ready"\)/)) : has(chessSurfaceHost, /setTimeout\(\(\) => setEntryPhase\("playing"\), 560\)/)) && has(xiangqiScreen, /setTimeout\(\(\) => setRoundPhase\("playing"\), 620\)/));

ok('Bloom game modal no longer creates RN Modal/window', !has(modal, /from \"react-native\"[\s\S]{0,160}\bModal\b/) && !has(modal, /<Modal\b/) && has(modal, /StyleSheet\.absoluteFillObject/));
ok('Bloom game modal supports keepMounted API but hidden input stays blocked', has(modal, /keepMounted/) && has(modal, /pointerEvents=\{visible \? "auto" : "none"\}/));
ok('Game ready/promotion sheets no longer keep hidden elevated native layers mounted', !has(chessScreen, /\bkeepMounted\b/) && !has(xiangqiScreen, /\bkeepMounted\b/));
ok('Bottom modal uses deterministic UI-thread timing instead of spring overshoot', has(modal, /useLayoutEffect/) && has(modal, /withTiming/) && !has(modal, /withSpring/));

ok('Chess lobby join is allowed to prove readiness', !has(lobbyHook, /realtime\.connection\s*!==\s*["']ready["']/) && has(lobbyHook, /realtime\.enterLobby\(\)/));
ok('Realtime context remembers desired lobby across reconnects', has(realtime, /lobbyWantedRef/) && has(realtime, /CHESS_EVENTS\.lobbyJoin/));
ok('Late appJoin cannot blindly downgrade an already-ready socket', has(realtime, /alreadyReady/) && has(realtime, /if \(!alreadyReady\) (?:setConnection|updateConnection)\("connecting"\)/));
ok('Successful lobbyJoin repairs connection state to ready', has(realtime, /connectionRef\.current\s*=\s*"ready"/) && has(realtime, /(?:setConnection|updateConnection)\("ready"\)/));
ok('Socket connect itself makes UI readiness monotonic before late appJoin ACK', has(realtime, /Socket\.IO `connect` is the earliest trustworthy proof/) && has(realtime, /connectionRef\.current = "ready"/));

ok('Chess game card has a guaranteed-visible PNG chess piece icon', has(homeGames, /accessibilityLabel="Quân Mã cờ vua"/) && has(homeGames, /pieces-png-default\/bn\.png/) && has(homeGames, /chessPieceIcon/));
ok('Chess test bot cadence is 1000 ms', has(serverSocket, /TEST_BOT_MOVE_DELAY_MS\s*=\s*1_000/));
ok('Xiangqi bot cadence is 1000 ms', has(xiangqiScreen, /XIANGQI_BOT_MOVE_DELAY_MS\s*=\s*1_000/));

ok('Xiangqi clock ticks only in isolated XiangqiClockValue text node', has(xiangqiScreen, /function XiangqiClockValue/) && has(xiangqiScreen, /setInterval\(\(\) => setNow\(Date\.now\(\)\), 500\)/));
ok('Xiangqi parent uses one expiry timeout, not per-second board state updates', has(xiangqiScreen, /remaining \+ 25/) && !has(xiangqiScreen, /setInterval\([\s\S]{0,200}setClockMs/));

ok('Chess battle FX is retired from the hot path', !has(chessSurfaceHost, /ChessBattleEffects|boardFxLayer|boardFxClip/));
ok('Xiangqi battle FX keeps reusable native nodes instead of nulling after each FX', !has(xiangqiFx, /setVisibleEvent\(null\)/));
ok('Victory confetti loops on Reanimated UI thread until result closes', has(victoryConfetti, /withRepeat/) && has(victoryConfetti, /-1/) && has(victoryConfetti, /cancelAnimation\(progress\)/) && !has(victoryConfetti, /setInterval/));
ok('Chess and Xiangqi victory surfaces preserve Bloom pink treatment', has(chessSurfaceHost, /backgroundColor: COLORS.primary/) && has(xiangqiScreen, /hero: "#D56591"/));
ok('Game perf probe is explicit opt-in and exposes diagnostics only when enabled', has(perf, /let enabled=false/) && has(perf, /setEnabled/) && has(perf, /isEnabled/) && has(perf, /if\(!enabled\)return/) && has(perf, /__FAMILY_BLOOM_GAME_PERF__/) && !has(perf, /console\./));
ok('Chess game-specific listener ownership moved out of UI hook', !has(chessGameHook, /chessSocketService/) && !has(chessGameHook, /CHESS_EVENTS/) && has(realtime, /chessSocketService\.on\("state"/) && has(realtime, /chessSocketService\.on\("move"/));
ok('Chess and Xiangqi boards wire the perf probe', has(chessBoard, /gameRuntimePerf\.markRender\("chess"\)/) && has(xiangqiBoard, /gameRuntimePerf\.markRender\("xiangqi"\)/));
ok('Victory surface remains Bloom-styled in both games', has(chessSurfaceHost, /resultButton/) && has(xiangqiScreen, /hero: "#D56591"/));
ok('Victory confetti loops on UI thread until result closes/rematch starts', has(victoryConfetti, /withRepeat\(/) && has(victoryConfetti, /-1,/) && has(chessSurfaceHost, /<ChessVictoryConfetti active=\{didWin\}/) && has(xiangqiScreen, /didWin && game\.gameOver && resultRevealReady/));
ok('Copy-over scripts preserve the current Chess aggregate regression gate', has(postCopy, /chess:current-check/));
ok('Android Debug and Release builds run the current Chess aggregate gate', has(debugBat, /chess:current-check/) && has(releaseBat, /chess:current-check/));

const syntaxFiles = [
  'src/components/games/hintTiming.ts',
  'src/components/chess/v2/HintLayer.tsx',
  'src/components/chess/v2/ChessPiece.tsx',
  'src/components/chess/v2/InteractionLayer.tsx',
  'src/components/chess/v2/PieceLayer.tsx',
  'src/components/chess/ChessBoard.tsx',
  'src/components/chess/BloomGameBottomModal.tsx',
  'src/components/xiangqi/XiangqiGameBoard.tsx',
  'src/components/xiangqi/XiangqiPiece.tsx',
  'src/app/(chess)/chess-game/[gameId].tsx',
  'src/app/(xiangqi)/xiangqi-preview.tsx',
  'src/hooks/chess/useChessLobby.ts',
  'src/context/ChessRealtimeContext.tsx',
  'src/app/(home)/(games)/home-games.tsx',
  'src/components/chess/ChessVictoryConfetti.tsx',
  'src/components/xiangqi/XiangqiBattleEffects.tsx',
  'src/services/games/gameRuntimePerf.ts',
  'src/hooks/chess/useChessGame.ts',
  'server/src/socket/socketServer.ts',
];
const syntaxErrors = syntaxFiles.flatMap(rel => syntax(rel).map(diag => `${rel}: ${ts.flattenDiagnosticMessageText(diag.messageText, ' ')}`));
ok(`Changed hot-path TypeScript/TSX syntax (${syntaxFiles.length} files)`, syntaxErrors.length === 0, syntaxErrors.slice(0, 3).join(' | '));

console.log(`\nPhase 16B15 smoothness gate: ${passed}/${passed + failed} PASS`);
if (failed) process.exit(1);
