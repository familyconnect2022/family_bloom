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

console.log('\nP2.21 — terminal-first board teardown + independent result + dedicated Focus camera\n');

const activeStore = read('src/services/games/activeBoardGameSessionStore.ts');
const coordinator = read('src/services/presentation/boardGamePresentationCoordinator.ts');
const resultStore = read('src/services/games/boardGameTerminalResultStore.ts');
const resultHost = read('src/components/system/BoardGameTerminalResultHost.tsx');
const stack = read('src/components/system/BloomSurfaceStack.tsx');
const bridge = read('src/components/system/BoardGameSessionBridge.tsx');
const chessContext = read('src/context/ChessRealtimeContext.tsx');
const chessSurface = read('src/components/chess/ChessSurfaceHost.tsx');
const xiangqiSurface = read('src/components/xiangqi/XiangqiSurfaceHost.tsx');
const xiangqiRoute = read('src/app/(xiangqi)/xiangqi-preview.tsx');
const focus = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const focusCamera = read('src/components/familyGraph/familyGraphFocusCamera.ts');
const pkg = JSON.parse(read('package.json'));
const cleanApply = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const preCopy = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
const buildShareBat = read('Family_Bloom_BUILD_APK_AND_SHARE.bat');

// Terminal identity / tombstone contract.
check('active game store has bounded terminal tombstones', activeStore.includes('TERMINAL_TOMBSTONE_LIMIT = 64'));
check('claim rejects a terminal game id', activeStore.includes('terminalTombstoneSet.has(terminalKey(input.kind, gameId))'));
check('terminal marker clears only matching active game', activeStore.includes('state?.kind === kind && state.gameId === gameId'));
check('terminal marker exported for runtime coordination', activeStore.includes('export function markActiveBoardGameSessionTerminal'));
check('coordinator poisons terminal id before surface cleanup', coordinator.indexOf('markActiveBoardGameSessionTerminal(kind, gameId)') < coordinator.indexOf('finishChessSurfaceGame(gameId)'));
check('coordinator clears matching pending reservation at terminal', coordinator.includes('clearPendingBoardGameReservation({ gameKind: kind })'));
check('late old terminal cannot clear a newer rail', coordinator.includes('rail.gameKind === kind && rail.gameId === gameId'));
check('BoardGameSessionBridge no longer mentions pendingResultGameId', !bridge.includes('pendingResultGameId'));

// Independent result presentation.
check('terminal result store supports Chess snapshot', resultStore.includes('publishChessTerminalResult'));
check('terminal result store supports Xiangqi snapshot', resultStore.includes('publishXiangqiTerminalResult'));
check('root result host subscribes independently from GameBoardHost', stack.includes('<GameBoardHost />') && stack.includes('<BoardGameTerminalResultHost />'));
check('root result host does not read ActiveBoardGameSession', !resultHost.includes('useActiveBoardGameSession'));
check('root result host rematches Chess through realtime action channel', resultHost.includes('chessActions.rematchGame(result.gameId') && !resultHost.includes('CHESS_EVENTS.gameRematch'));
check('root result host can rematch Xiangqi from saved game id', resultHost.includes('XIANGQI_EVENTS.gameRematch'));
check('result close clears only saved result snapshot', resultHost.includes('clearBoardGameTerminalResult({ kind: closing.kind, gameId: closing.gameId })'));
check('terminal audio belongs to independent result host', resultHost.includes('playGameEnd()') && !chessSurface.includes('playTerminalSound') && !xiangqiSurface.includes('playGameEnd()'));
check('Chess result host keeps human rematch wait/cancel independent from old session', resultHost.includes('rematchWaitingUntil') && resultHost.includes('chessActions.cancelRematch(result.gameId)'));

// Chess terminal packet teardown occurs immediately, not on modal dismissal.
const chessHandle = chessContext.slice(chessContext.indexOf('const handleState = useCallback'), chessContext.indexOf('const handleMoveDelta'));
check('Chess terminal packet copies result first', chessHandle.includes('publishChessTerminalResult(next)'));
check('Chess terminal packet immediately tears down claimed game', chessHandle.includes('finishClaimedBoardGame("chess", next.gameId)'));
check('Chess terminal packet clears activeGameId immediately', chessHandle.includes('setActiveGameId(null)'));
check('dead pending-result realtime identity is removed entirely', !chessContext.includes('pendingResultGameId') && !chessContext.includes('acknowledgeResult'));
check('Chess terminal packet normalizes recovery authority to none', chessHandle.includes('setRecoveryKind("none")'));
check('Chess terminal packet ACKs result immediately', chessHandle.includes('CHESS_EVENTS.gameResultAck'));
check('Chess terminal packet drops local resumable state ref', chessHandle.includes('stateRef.current = null'));
check('Chess ignores every late packet for tombstoned game id', chessHandle.includes('isActiveBoardGameSessionTerminal("chess", next.gameId)'));
check('Chess surface owns no terminal-session teardown anymore', !chessSurface.includes('finishClaimedBoardGame') && chessHandle.includes('finishClaimedBoardGame("chess", next.gameId)'));

// Xiangqi terminal packet teardown occurs in both state and delta paths.
check('Xiangqi has one terminal-authoritative teardown function', xiangqiSurface.includes('const terminateAuthoritativeGame = React.useCallback'));
check('Xiangqi result snapshot is copied before teardown', xiangqiSurface.indexOf('publishXiangqiTerminalResult(terminalState)') < xiangqiSurface.indexOf('finishClaimedBoardGame("xiangqi", terminalState.gameId)'));
check('Xiangqi ACKs result immediately in terminal teardown', xiangqiSurface.includes('XIANGQI_EVENTS.gameResultAck'));
check('Xiangqi terminal state packet uses terminal teardown', xiangqiSurface.includes('if (next.status === "finished") {\n      terminateAuthoritativeGame(next);'));
check('Xiangqi terminal move delta uses terminal teardown', xiangqiSurface.match(/terminateAuthoritativeGame\(next\)/g)?.length >= 2);
check('Xiangqi ignores late tombstoned state packets', xiangqiSurface.includes('isActiveBoardGameSessionTerminal("xiangqi", next.gameId)'));
check('Xiangqi ignores late tombstoned move packets', xiangqiSurface.includes('isActiveBoardGameSessionTerminal("xiangqi", delta.gameId)'));
check('Xiangqi command route observes independent terminal result', xiangqiRoute.includes('useBoardGameTerminalResult()'));
check('Xiangqi terminal command route returns to Game Hub immediately', xiangqiRoute.includes('terminalResult?.kind !== "xiangqi"') && xiangqiRoute.includes('router.replace("/home-games" as never)'));
check('Xiangqi route cannot auto-resolve a new session behind terminal result', xiangqiRoute.includes('if (terminalResult?.kind === "xiangqi") return;') && xiangqiRoute.includes('else if (terminalResult?.kind !== "xiangqi")'));

// Focus dedicated camera + single native gesture root.
check('Focus has dedicated X camera SharedValue', focus.includes('const focusCameraTranslateX = useSharedValue(0)'));
check('Focus has dedicated Y camera SharedValue', focus.includes('const focusCameraTranslateY = useSharedValue(0)'));
check('Focus has dedicated scale SharedValue', focus.includes('const focusCameraScale = useSharedValue(initialRuntimeScale)'));
check('focus mode selects dedicated camera', focus.includes('surfaceMode === "focusOverlay" ? focusCameraTranslateX : canvasTranslateX'));
check('Focus native Modal uses a valid successor input path', (focus.includes('PanResponder.create({') && !focus.includes('unstable_forceActive')) || (focus.includes('Gesture.Simultaneous(focusPanGesture, focusPinchGesture)') && /GestureHandlerRootView[\s\S]{0,180}unstable_forceActive/.test(focus)));
check('Focus detector avoids ignored nested root under native Modal', focus.includes('if (focusOverlay) return <View style={styles.gestureRoot}>{children}</View>;') && focus.includes('<FamilyGraphGestureBoundary focusOverlay={surfaceMode === "focusOverlay"}>'));
check('Pan update uses pure Focus camera delta helper', focus.includes('applyFocusPanDelta('));
check('Pinch update uses pure Focus scale helper', focus.includes('applyFocusPinchScale('));
check('Focus pan helper applies translation without clamp', focusCamera.includes('x: startX + translationX') && focusCamera.includes('y: startY + translationY'));
check('Focus still uses simultaneous Pan and Pinch', focus.includes('Gesture.Simultaneous(panGesture, pinchGesture)'));
check('Focus stays at exact 85 percent window geometry', focus.includes('const FOCUS_OVERLAY_SCREEN_RATIO = 0.85'));

for (const rel of [
  'src/services/games/boardGameTerminalResultStore.ts',
  'src/services/games/activeBoardGameSessionStore.ts',
  'src/services/presentation/boardGamePresentationCoordinator.ts',
  'src/components/system/BoardGameSessionBridge.tsx',
  'src/components/system/BoardGameTerminalResultHost.tsx',
  'src/components/system/BloomSurfaceStack.tsx',
  'src/context/ChessRealtimeContext.tsx',
  'src/components/xiangqi/XiangqiSurfaceHost.tsx',
  'src/app/(xiangqi)/xiangqi-preview.tsx',
  'src/components/familyGraph/familyGraphFocusCamera.ts',
  'src/components/familyGraph/FamilyGraphPrototype.tsx',
]) check(`syntax ${rel}`, syntax(rel));

// Runtime proof against the real stores/coordinator, not source-only grep.
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
  const pending = require(path.join(root, 'src/services/games/pendingBoardGameReservationStore.ts'));
  const rail = require(path.join(root, 'src/services/presentation/bloomSurfaceRailStore.ts'));
  const chessStore = require(path.join(root, 'src/services/chess/chessSurfaceStore.ts'));
  const xiangqiStore = require(path.join(root, 'src/services/xiangqi/xiangqiSurfaceStore.ts'));
  const coordinatorRuntime = require(path.join(root, 'src/services/presentation/boardGamePresentationCoordinator.ts'));
  const terminalResults = require(path.join(root, 'src/services/games/boardGameTerminalResultStore.ts'));
  const camera = require(path.join(root, 'src/components/familyGraph/familyGraphFocusCamera.ts'));

  active.resetActiveBoardGameSession();
  pending.resetPendingBoardGameReservation();
  rail.resetBloomSurfaceRail();
  chessStore.resetChessSurfaceSession();
  xiangqiStore.resetXiangqiSurfaceSession();
  terminalResults.resetBoardGameTerminalResult();

  coordinatorRuntime.claimAndPresentBoardGame({ kind: 'chess', gameId: 'terminal-chess', familyId: 'f1', source: 'server', presentation: 'full' });
  terminalResults.publishChessTerminalResult({ gameId:'terminal-chess', familyId:'f1', status:'finished' });
  coordinatorRuntime.finishClaimedBoardGame('chess', 'terminal-chess');
  check('runtime terminal Chess clears lease before result close', active.getActiveBoardGameSession() === null);
  check('runtime terminal Chess clears rail before result close', rail.getBloomSurfaceRailState().gameId === null);
  check('runtime terminal Chess clears surface id before result close', chessStore.getChessSurfaceState().gameId === null);
  check('runtime terminal Chess result snapshot survives teardown', terminalResults.getBoardGameTerminalResult()?.gameId === 'terminal-chess');
  check('runtime tombstone rejects old Chess reclaim', !active.claimActiveBoardGameSession({ kind:'chess', gameId:'terminal-chess', familyId:'f1', source:'server' }));
  check('runtime new Chess id can claim immediately', coordinatorRuntime.claimAndPresentBoardGame({ kind:'chess', gameId:'new-chess', familyId:'f1', source:'server', presentation:'full' }));
  coordinatorRuntime.finishClaimedBoardGame('chess', 'terminal-chess');
  check('runtime late old Chess terminal does not clear new game', active.getActiveBoardGameSession()?.gameId === 'new-chess' && rail.getBloomSurfaceRailState().gameId === 'new-chess');
  coordinatorRuntime.finishClaimedBoardGame('chess', 'new-chess');

  coordinatorRuntime.claimAndPresentBoardGame({ kind: 'xiangqi', gameId: 'terminal-xq', familyId: 'f1', source: 'server', presentation: 'full' });
  terminalResults.publishXiangqiTerminalResult({ gameId:'terminal-xq', familyId:'f1', status:'finished' });
  coordinatorRuntime.finishClaimedBoardGame('xiangqi', 'terminal-xq');
  check('runtime terminal Xiangqi clears lease before result close', active.getActiveBoardGameSession() === null);
  check('runtime terminal Xiangqi clears surface id before result close', xiangqiStore.getXiangqiSurfaceState().gameId === null);
  check('runtime terminal Xiangqi result snapshot survives teardown', terminalResults.getBoardGameTerminalResult()?.gameId === 'terminal-xq');
  check('runtime tombstone rejects old Xiangqi reclaim', !active.claimActiveBoardGameSession({ kind:'xiangqi', gameId:'terminal-xq', familyId:'f1', source:'server' }));
  check('runtime new Xiangqi id can claim immediately', coordinatorRuntime.claimAndPresentBoardGame({ kind:'xiangqi', gameId:'new-xq', familyId:'f1', source:'server', presentation:'full' }));
  coordinatorRuntime.finishClaimedBoardGame('xiangqi', 'new-xq');

  const moved = camera.applyFocusPanDelta(25, -40, 100, 60);
  check('runtime Focus pan +100 changes X by exactly +100', moved.x === 125);
  check('runtime Focus pan +60 changes Y by exactly +60', moved.y === 20);
  check('runtime Focus pan is not clamped back to zero', moved.x !== 0 && moved.y !== 0);
  check('runtime Focus pinch scales independently', camera.applyFocusPinchScale(0.95, 1.5, 0.02) === 1.4249999999999998 || Math.abs(camera.applyFocusPinchScale(0.95, 1.5, 0.02) - 1.425) < 1e-9);
} finally {
  Module._load = originalLoad;
  if (previousTs) require.extensions['.ts'] = previousTs;
  else delete require.extensions['.ts'];
}

check('package registers P2.21 gate', pkg.scripts?.['phaseP2_21:check'] === 'node ./scripts/test-phase-p2_21-terminal-teardown-focus-camera.js');
check('CLEAN APPLY executes P2.21 successor gate', cleanApply.includes('test-phase-p2_21-terminal-teardown-focus-camera.js'));
check('Android Debug executes P2.21 successor gate', debugBat.includes('phaseP2_21:check'));
check('Android Release executes P2.21 successor gate', releaseBat.includes('phaseP2_21:check'));
check('pre-copy package banner identifies P2.21 or real-device successor', /Performance Architecture P2\.(?:21|22|23|24|25|26|27)/.test(preCopy));
check('APK share entrypoint identifies P2.21 or real-device successor', /Family Bloom P2\.(?:21|22|23|24|25|26|27) - BUILD APK AND COPY TO SHARE/.test(buildShareBat));

console.log(`\nFamily Bloom P2.21: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
