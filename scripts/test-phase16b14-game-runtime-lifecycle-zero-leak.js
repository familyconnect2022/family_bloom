const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass = 0, fail = 0;
function check(name, ok) { if (ok) { pass++; console.log('PASS', name); } else { fail++; console.error('FAIL', name); } }

const board = read('src/components/chess/ChessBoard.tsx');
const piece = read('src/components/chess/v2/ChessPiece.tsx');
const hook = read('src/hooks/chess/useChessGame.ts');
const game = read('src/app/(chess)/chess-game/[gameId].tsx');
const clock = read('src/components/chess/ChessClock.tsx');
const rail = read('src/components/chess/ChessPlayerRail.tsx');
const modal = read('src/components/chess/BloomGameBottomModal.tsx');
const xiangqi = read('src/app/(xiangqi)/xiangqi-preview.tsx');
const xiangqiBoard = read('src/components/xiangqi/XiangqiGameBoard.tsx');
const xiangqiFx = read('src/components/xiangqi/XiangqiBattleEffects.tsx');
const realtime = read('src/context/ChessRealtimeContext.tsx');
const socket = read('src/services/chess/chessSocketService.ts');
const postCopy = read('Family_Bloom_CLEAN_APPLY_FULL.bat');

check('Chess screen lifecycle follows Expo Router focus', game.includes('useFocusEffect') && game.includes('const [screenFocused, setScreenFocused]'));
check('Game hook suspends game-specific listeners while route is blurred', hook.includes('runtimeActive = true') && /if \(!familyId \|\| !gameId \|\| !runtimeActive\)/.test(hook));
check('Game resync becomes inert while route runtime is suspended', hook.includes('if (!runtimeActiveRef.current) return stateRef.current'));
check('Global realtime provider remains separate from game-route runtime', realtime.includes('ChessRealtimeContext.Provider') && socket.includes('disconnectIfIdle'));
check('Global socket idle disconnect remains no-op for foreground presence', socket.includes('authenticated foreground app owns Chess socket lifecycle') && socket.includes('disconnectIfIdle'));

check('Chess board has explicit runtimeActive lifecycle', board.includes('runtimeActive = true') && board.includes('runtimeActiveRef'));
check('Chess board invalidates stale async work with epoch', board.includes('runtimeEpochRef') && board.includes('epochIsCurrent'));
check('Blur resets visual Promise queue immediately', board.includes('animationQueueRef.current = Promise.resolve()'));
check('Blur clears selection and premove state', board.includes('focus-suspend') && board.includes('clearSelection()'));
check('Blur clears pending optimistic command reference', board.includes('pendingRef.current = null'));
check('Old async move continuations are guarded after await', board.includes('await animateMove') && board.includes('if (!epochIsCurrent(epoch)) return'));
check('Old promotion await is guarded by runtime epoch', board.includes('chosenPromotion = await onPromotion') && board.includes('epochIsCurrent(epoch)'));
check('Delayed ACK resync is guarded by runtime epoch', board.includes('setTimeout(() =>') && board.includes('if (!epochIsCurrent(epoch)) return'));
check('Focus resume force-snaps latest authoritative snapshot without remount', board.includes('rebuildFromSnapshot(stateRef.current, true)') && board.includes('forceSnap'));
check('PieceLayer remains persistent across focus changes', !board.includes('pieceGeneration') && board.includes('<PieceLayer') && board.includes('pieces={pieces}'));

check('Piece controller can synchronously cancel and normalize native motion', piece.includes('sync: (pieceKey: PieceKey') && piece.includes('cancelAnimation(x)') && piece.includes('cancelAnimation(scale)'));
check('Cancelling a piece resolves pending animation Promise', piece.includes('pendingDoneRef') && piece.includes('finishPending()'));
check('Piece sync restores drag and moving flags to idle', piece.includes('dragAllowed.value = 0') && piece.includes('moving.value = 0'));
check('Piece sync can repair promotion artwork after interrupted transition', piece.includes('setPieceKeyState(nextPieceKey)'));

check('Chess clock interval is focus/runtime gated', clock.includes('runtimeActive = true') && clock.includes('const clockRunning = runtimeActive &&'));
check('Player rail propagates runtime lifecycle to clock', rail.includes('runtimeActive={runtimeActive}'));
check('Chess screen disables both clocks after blur or game finish', game.includes('runtimeActive={screenFocused && boardSurfaceVisible && entryPhase === "playing" && state.status === "active"}'));
check('Chess effects are not mounted behind another route', game.includes('FX_ENABLED && screenFocused'));
check('Chess reconnect indicator is hidden behind another route', game.includes('screenFocused && game.connectionPhase === "reconnecting"'));
check('Chess result modal is focus-gated', game.includes('visible={screenFocused && state.status === "finished"'));
check('Chess promotion and ready bottom modals are focus-gated', game.includes('visible={screenFocused && !!promotion}') && game.includes('visible={screenFocused && gameFlowVisible && !promotion}'));
check('Blur resolves a pending promotion promise instead of leaking it', game.includes('current?.resolve?.(null)'));
check('Chess terminal state hard-locks input after the final visual commit', board.includes('if (state.status !== "active")') && board.includes('boardLocked.value = 1'));

check('Bloom bottom modal does not retain forced hardware raster layer', !modal.includes('renderToHardwareTextureAndroid') && !modal.includes('shouldRasterizeIOS'));

check('Xiangqi screen lifecycle follows Expo Router focus', xiangqi.includes('useFocusEffect') && xiangqi.includes('screenFocused'));
check('Xiangqi preparation timers are focus-gated', xiangqi.includes('if (!screenFocused) return undefined') && xiangqi.includes('roundPhase === "playing"') && xiangqi.includes('boardReady') && xiangqi.includes('screenFocused'));
check('Xiangqi clock is stopped while screen is blurred', xiangqi.includes('if (!screenFocused || roundPhase !== "playing" || game.gameOver)'));
check('Xiangqi bot timer is stopped while screen is blurred', xiangqi.includes('!screenFocused || roundPhase !== "playing" || game.gameOver || game.turn !== "black"'));
check('Xiangqi battle FX unmounts with hidden heavy surface', xiangqi.includes('screenFocused && boardSurfaceVisible ? <XiangqiBattleEffects'));
check('Xiangqi FX cleanup stops native animations as well as timer', xiangqiFx.includes('opacity.stopAnimation()') && xiangqiFx.includes('pulse.stopAnimation()') && xiangqiFx.includes('clearTimeout(timer)'));
check('Xiangqi modals are focus-gated', xiangqi.includes('visible={screenFocused && !playing && !game.gameOver}') && xiangqi.includes('visible={screenFocused && game.gameOver && resultRevealReady}'));
check('Xiangqi game-over state blocks further board input while keeping final move visible', xiangqi.includes('game.gameOver') && xiangqi.includes('runtimeActive={screenFocused && boardSurfaceVisible}'));
check('Xiangqi board gesture is disabled when runtime sleeps', xiangqiBoard.includes('.enabled(runtimeActive)'));
check('Xiangqi SharedValue animations cancel and snap on suspend', xiangqiBoard.includes('cancelAnimation(x)') && xiangqiBoard.includes('x.value = left') && xiangqiBoard.includes('lift.value = 1'));
check('Xiangqi hint animations cancel on suspend', xiangqiBoard.includes('cancelAnimation(opacity)') && xiangqiBoard.includes('if (!runtimeActive)'));

check('Post-copy updater still runs current Chess aggregate', postCopy.includes('chess:current-check'));

for (const [file, source] of [
  ['ChessBoard', board], ['ChessPiece', piece], ['useChessGame', hook], ['Chess game screen', game],
  ['ChessClock', clock], ['ChessPlayerRail', rail], ['Bloom modal', modal], ['Xiangqi preview', xiangqi], ['Xiangqi board', xiangqiBoard], ['Xiangqi FX', xiangqiFx],
]) {
  const out = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
    reportDiagnostics: true,
    fileName: `${file}.tsx`,
  });
  check(`${file} transpiles without syntax diagnostics`, !(out.diagnostics || []).length);
}

console.log(`\nPhase 16B.14 Game Runtime Lifecycle / Zero-Leak: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
