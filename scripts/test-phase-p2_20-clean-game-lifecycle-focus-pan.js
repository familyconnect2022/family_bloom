const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let pass = 0;
let fail = 0;
function check(label, ok) {
  if (ok) { pass += 1; console.log(`PASS ${String(pass + fail).padStart(2, '0')} - ${label}`); }
  else { fail += 1; console.error(`FAIL -- ${label}`); }
}
function syntax(rel) {
  const out = ts.transpileModule(read(rel), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    reportDiagnostics: true,
    fileName: rel,
  });
  return !(out.diagnostics || []).some((d) => d.category === ts.DiagnosticCategory.Error);
}

console.log('\nP2.20 — clean finished-game lifecycle + 85% Focus + native pan boundary\n');

const chessContext = read('src/context/ChessRealtimeContext.tsx');
const bridge = read('src/components/system/BoardGameSessionBridge.tsx');
const globalUi = read('src/components/chess/ChessGlobalUiHost.tsx');
const lobby = read('src/app/(chess)/chess-lobby.tsx');
const chessRoute = read('src/app/(chess)/chess-game/[gameId].tsx');
const xiangqiRoute = read('src/app/(xiangqi)/xiangqi-preview.tsx');
const xiangqiBootstrap = read('src/services/xiangqi/xiangqiSessionBootstrap.ts');
const homeGames = read('src/app/(home)/(games)/home-games.tsx');
const chessSurface = read('src/components/chess/ChessSurfaceHost.tsx');
const xiangqiSurface = read('src/components/xiangqi/XiangqiSurfaceHost.tsx');
const focus = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const webGames = read('src/web/games/WebRealtimeGames.tsx');
const pkg = JSON.parse(read('package.json'));
const cleanApply = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const preCopy = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

// 1) Finished game receipts can never become active presentation owners again.
check('Chess root auto-route listens only to activeGameId', globalUi.includes('const gameId = realtime.activeGameId;') && !globalUi.includes('activeGameId ?? realtime.pendingResultGameId'));
check('Chess lobby cannot resurrect result and no longer competes for active-game navigation', !lobby.includes('pendingResultGameId') && lobby.includes('ChessGlobalUiHost is the single navigation owner') && !lobby.includes('const gameId = lobby.activeGameId;'));
check('Xiangqi route never redirects to Chess or consumes Chess realtime state', !xiangqiRoute.includes('useChessRealtime') && !xiangqiRoute.includes('/chess-game') && xiangqiRoute.includes('resolveOrCreateXiangqiSession'));
check('Successor Game Hub has no finished-result cleanup path because terminal teardown already ran', !homeGames.includes('pendingResultGameId') && !homeGames.includes('acknowledgeResult') && homeGames.includes('beginLocalBoardGameReservation("chess"'));
check('Chess route does not use pendingResultGameId as authoritative id', chessRoute.includes('const authoritativeChessId = chess.activeGameId;') && !chessRoute.includes('activeGameId ?? chess.pendingResultGameId'));
check('Chess route sends stale non-active routes back to Game Hub', chessRoute.includes('router.replace("/home-games" as never)'));
check('Session bridge never claims pendingResultGameId', bridge.includes('const chessGameId = chess.activeGameId;') && !bridge.includes('const chessGameId = chess.activeGameId ?? chess.pendingResultGameId'));
check('Successor bridge never lets finished result retain a realtime lease', !bridge.includes('pendingResultGameId'));

// 2) Recovery treats finished_unseen as a receipt, not a resumable room.
const chessFinishedAt = chessContext.indexOf('recovery.data.kind === "finished_unseen"');
const chessFinishedTail = chessFinishedAt >= 0 ? chessContext.slice(chessFinishedAt, chessContext.indexOf('} else {', chessFinishedAt)) : '';
check('Chess finished_unseen is ACKed without gameJoin', chessFinishedAt >= 0 && chessFinishedTail.includes('CHESS_EVENTS.gameResultAck') && !chessFinishedTail.includes('CHESS_EVENTS.gameJoin'));
check('Chess finished_unseen normalizes recovery to none', chessFinishedTail.includes('setRecoveryKind("none")'));
const xqFinishedAt = xiangqiBootstrap.indexOf('recovered.data.kind === "finished_unseen"');
const xqFinishedTail = xqFinishedAt >= 0 ? xiangqiBootstrap.slice(xqFinishedAt, xiangqiBootstrap.indexOf('if (getPendingBoardGameReservation()', xqFinishedAt)) : '';
check('Xiangqi finished_unseen is ACKed instead of joined', xqFinishedAt >= 0 && xqFinishedTail.includes('XIANGQI_EVENTS.gameResultAck') && !xqFinishedTail.includes('XIANGQI_EVENTS.gameJoin'));
check('Xiangqi stale-result branch deletes local lease then falls through to fresh creation', xqFinishedTail.includes('discardStaleLocalXiangqiSession()') && xqFinishedTail.includes('gameResultAck') && xiangqiBootstrap.indexOf('XIANGQI_EVENTS.testBotInvite', xqFinishedAt) > xqFinishedAt);
const webChessRecoverAt = webGames.indexOf('const result = await net.emitAck<any>(CHESS_EVENTS.sessionRecover');
const webChessRecoverTail = webChessRecoverAt >= 0 ? webGames.slice(webChessRecoverAt, webGames.indexOf('useEffect(() => { if (net.connected', webChessRecoverAt)) : '';
check('Web Chess ACKs finished receipt without joining old room', webChessRecoverTail.includes('result.data.kind === "finished_unseen"') && webChessRecoverTail.includes('CHESS_EVENTS.gameResultAck') && webChessRecoverTail.indexOf('CHESS_EVENTS.gameJoin') > webChessRecoverTail.indexOf('result.data.kind !== "active"'));
const webXqRecoverAt = webGames.indexOf('const r = await net.emitAck<any>(XIANGQI_EVENTS.sessionRecover');
const webXqRecoverTail = webXqRecoverAt >= 0 ? webGames.slice(webXqRecoverAt, webGames.indexOf('useEffect(() => { if (net.connected', webXqRecoverAt)) : '';
check('Web Xiangqi ACKs finished receipt without joining old room', webXqRecoverTail.includes('r.data.kind === "finished_unseen"') && webXqRecoverTail.includes('XIANGQI_EVENTS.gameResultAck') && webXqRecoverTail.indexOf('XIANGQI_EVENTS.gameJoin') > webXqRecoverTail.indexOf('r.data.kind !== "active"'));

// 3) No technical warm-session language is shown after game finish.
check('Chess result copy no longer says board stays warm', !chessSurface.includes('Bàn cờ vẫn được giữ warm'));
check('Chess command route no longer says moving warm board into screen', !chessRoute.includes('Đang đưa bàn Cờ vua vào màn hình'));
check('Xiangqi command route no longer says checking session', !xiangqiRoute.includes('Đang kiểm tra phiên Cờ tướng'));
check('Xiangqi detachment hard-resets retained local result state', xiangqiSurface.includes('if (surface.gameId) return;') && xiangqiSurface.includes('serverStateRef.current = null;') && xiangqiSurface.includes('setServerState(null);') && xiangqiSurface.includes('setPremove(null);') && xiangqiSurface.includes('setRoundPhase("preparing")'));

// 4) Focus presentation is exactly window-based 85% and pan owns the native Modal boundary.
check('Focus target ratio is exactly 85%', focus.includes('const FOCUS_OVERLAY_SCREEN_RATIO = 0.85;'));
check('Focus reads physical window dimensions', focus.includes('useWindowDimensions()'));
check('Focus geometry centers width at 85% of window', focus.includes('windowWidth * FOCUS_OVERLAY_SCREEN_RATIO') && focus.includes('x: (windowWidth - focusWidth) / 2'));
check('Focus geometry centers height at 85% of window', focus.includes('windowHeight * FOCUS_OVERLAY_SCREEN_RATIO') && focus.includes('y: (windowHeight - focusHeight) / 2'));
check('Focus Modal uses a valid successor input path', (focus.includes('PanResponder.create({') && !focus.includes('unstable_forceActive')) || (focus.includes('Gesture.Simultaneous(focusPanGesture, focusPinchGesture)') && /GestureHandlerRootView[\s\S]{0,180}unstable_forceActive/.test(focus)));
check('Focus background no longer installs full-screen Pressable responders', focus.includes('surfaceMode === "standard" ? (\n                <Pressable style={StyleSheet.absoluteFill}'));
check('Focus still uses UI-thread Pan gesture', focus.includes('const panGesture = useMemo(() => Gesture.Pan()') && focus.includes('applyFocusPanDelta('));
check('Focus still uses simultaneous pinch + pan camera gestures', focus.includes('Gesture.Simultaneous(panGesture, pinchGesture)'));

for (const rel of [
  'src/context/ChessRealtimeContext.tsx',
  'src/components/system/BoardGameSessionBridge.tsx',
  'src/components/chess/ChessGlobalUiHost.tsx',
  'src/app/(chess)/chess-lobby.tsx',
  'src/app/(chess)/chess-game/[gameId].tsx',
  'src/app/(xiangqi)/xiangqi-preview.tsx',
  'src/app/(home)/(games)/home-games.tsx',
  'src/services/xiangqi/xiangqiSessionBootstrap.ts',
  'src/components/chess/ChessSurfaceHost.tsx',
  'src/components/xiangqi/XiangqiSurfaceHost.tsx',
  'src/components/familyGraph/FamilyGraphPrototype.tsx',
  'src/web/games/WebRealtimeGames.tsx',
]) check(`syntax ${rel}`, syntax(rel));

// Runtime proof: finishing a claimed game must clear lease + rail + surface id.
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'react') return { useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot() };
  return originalLoad.apply(this, arguments);
};
const previousTs = require.extensions['.ts'];
require.extensions['.ts'] = function compileTs(mod, filename) {
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: filename,
  }).outputText;
  mod._compile(js, filename);
};
try {
  const active = require(path.join(root, 'src/services/games/activeBoardGameSessionStore.ts'));
  const rail = require(path.join(root, 'src/services/presentation/bloomSurfaceRailStore.ts'));
  const chessStore = require(path.join(root, 'src/services/chess/chessSurfaceStore.ts'));
  const xiangqiStore = require(path.join(root, 'src/services/xiangqi/xiangqiSurfaceStore.ts'));
  const coordinator = require(path.join(root, 'src/services/presentation/boardGamePresentationCoordinator.ts'));

  active.resetActiveBoardGameSession(); rail.resetBloomSurfaceRail(); chessStore.resetChessSurfaceSession(); xiangqiStore.resetXiangqiSurfaceSession();
  coordinator.claimAndPresentBoardGame({ kind: 'chess', gameId: 'finished-chess', familyId: 'f1', source: 'server', presentation: 'full' });
  coordinator.finishClaimedBoardGame('chess', 'finished-chess');
  check('runtime Chess finish clears active lease', active.getActiveBoardGameSession() === null);
  check('runtime Chess finish clears rail identity', rail.getBloomSurfaceRailState().gameId === null && rail.getBloomSurfaceRailState().visibleSurface === null);
  check('runtime Chess finish clears surface gameId', chessStore.getChessSurfaceState().gameId === null && chessStore.getChessSurfaceState().mode === 'hidden');

  coordinator.claimAndPresentBoardGame({ kind: 'xiangqi', gameId: 'finished-xq', familyId: 'f1', source: 'server', presentation: 'full' });
  coordinator.finishClaimedBoardGame('xiangqi', 'finished-xq');
  check('runtime Xiangqi finish clears active lease', active.getActiveBoardGameSession() === null);
  check('runtime Xiangqi finish clears surface gameId', xiangqiStore.getXiangqiSurfaceState().gameId === null && xiangqiStore.getXiangqiSurfaceState().mode === 'hidden');
} finally {
  Module._load = originalLoad;
  if (previousTs) require.extensions['.ts'] = previousTs;
  else delete require.extensions['.ts'];
}

check('package registers P2.20 gate', pkg.scripts?.['phaseP2_20:check'] === 'node ./scripts/test-phase-p2_20-clean-game-lifecycle-focus-pan.js');
check('copy-over updater runs P2.20 gate', cleanApply.includes('test-phase-p2_20-clean-game-lifecycle-focus-pan.js'));
check('pre-copy cleanup identifies P2.20 or terminal-first successor release', /Performance Architecture P2\.(?:20|21|22|23|24|25|26|27)/.test(preCopy));
check('Debug Android build runs P2.20 gate', debugBat.includes('phaseP2_20:check'));
check('Release Android build runs P2.20 gate', releaseBat.includes('phaseP2_20:check'));

console.log(`\nFamily Bloom P2.20: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
