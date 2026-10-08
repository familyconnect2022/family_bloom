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
const realtime = read('src/context/ChessRealtimeContext.tsx');
const store = read('src/services/chess/chessGameStore.ts');
const game = read('src/app/(chess)/chess-game/[gameId].tsx');
const surfaceHost = read('src/components/chess/ChessSurfaceHost.tsx');
const modal = read('src/components/chess/BloomGameBottomModal.tsx');
const xiangqi = read('src/components/xiangqi/XiangqiGameBoard.tsx');
const hint = read('src/components/chess/v2/HintLayer.tsx');
const postCopy = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

check('Chess piece position lives in SharedValues', piece.includes('const x = useSharedValue(initialX)') && piece.includes('const y = useSharedValue(initialY)') && piece.includes('const scale = useSharedValue(1)'));
check('Programmatic move stays on UI thread with eased travel', piece.includes('profile === "travel"') && piece.includes('MOVE_EASING') && piece.includes('withTiming(nextX') && piece.includes('withTiming(nextY'));
check('Chess travel reaches approved 1.30 lift then settles', piece.includes('withTiming(1.30') && piece.includes('withSequence('));
check('Chess piece nodes are visual-only under tap-only input policy', !piece.includes('Gesture.Pan()') && piece.includes('pointerEvents="none"') && !piece.includes('startX.value'));
const moveMs = Number(board.match(/const MOVE_MS = (\d+)/)?.[1] || 0);
const opponentMoveMs = Number(board.match(/const OPPONENT_MOVE_MS = (\d+)/)?.[1] || 0);
const premoveMoveMs = Number(board.match(/const PREMOVE_MOVE_MS = (\d+)/)?.[1] || 0);
check('Move windows are smoother rather than old 80-110ms snap', moveMs >= 140 && moveMs <= 220 && opponentMoveMs >= 140 && opponentMoveMs <= 220 && premoveMoveMs >= 120 && premoveMoveMs <= 190);

check('Reconnect snapshot uses persistent FEN reconciler', board.includes('reconcileRuntimeToSnapshot') && board.includes('previous.fen === snapshot.fen'));
check('Reconnect no longer fades whole board to zero', !board.includes('boardOpacity.value = withTiming(0'));
check('Reconnect no longer remounts PieceLayer generation', !board.includes('pieceGeneration') && !board.includes('key={`piece-layer-'));
check('One missed authoritative move is derived and animated', board.includes('deriveAppliedMoveFromSnapshot') && board.includes('next.revision !== previous.revision + 1') && board.includes('animateMove(singleMove'));
check('Multi-revision recovery reuses existing native piece controllers', board.includes('controllersRef.current.get(id)') && board.includes('assignments = new Map') && board.includes('runtime.alive = false'));
check('Server authoritative contract remains versioned', board.includes('onMove(from, to, chosenPromotion, clientMoveId, current.revision)'));

check('Socket hook exposes reconnecting without dropping current state', hook.includes('connectionPhase: store.connectionPhase') && realtime.includes('chessSocketService.on("disconnected"') && realtime.includes('connectionPhase: "reconnecting"'));
check('Snapshot epoch separates position changes from visual metadata changes', (hook.includes('const positionChanged = !current') && hook.includes('const visualMetaChanged = positionChanged')) || (store.includes('const positionChanged = !previous') && store.includes('const visualMetaChanged = positionChanged')));
check('Reconnect same FEN can still refresh status/turn without moving pieces', (hook.includes('current?.status !== next.status') && hook.includes('current?.turn !== next.turn')) || (store.includes('previous?.status !== next.status') && store.includes('previous?.turn !== next.turn')));
check('Persistent game surface keeps board visible and shows compact reconnect pill', surfaceHost.includes('Đang kết nối lại… bàn cờ được giữ nguyên') && surfaceHost.includes('styles.reconnectPill'));
check('Board input is blocked while transport reconciles', surfaceHost.includes('game.connectionPhase === "connected"') && surfaceHost.includes('interactionBlocked={!boardInteractive}'));
check('In-progress paused reconnect uses centered preparation layer', surfaceHost.includes('state.status === "waiting" || state.status === "paused"') && (surfaceHost.includes('styles.surfaceOverlay') || surfaceHost.includes('styles.boardOverlay') || surfaceHost.includes('styles.chessModalLayer')));

check('Bloom bottom modal animation uses Reanimated SharedValues', modal.includes('useSharedValue(76)') && modal.includes('useAnimatedStyle') && /translateY\.value\s*=\s*with(?:Spring|Timing)\(0/.test(modal));
check('Bottom modal no longer uses React Native Animated progress', !modal.includes('new Animated.Value') && !modal.includes('progress.interpolate'));
check('Bottom modal waits for close motion before unmount', modal.includes('runOnJS(setMounted)(false)'));

check('Xiangqi piece translation stays on SharedValues', xiangqi.includes('const x = useSharedValue(left)') && xiangqi.includes('const y = useSharedValue(top)'));
const xiangqiMoveMs = Number(xiangqi.match(/withTiming\(left, \{ duration: (\d+)/)?.[1] || 0);
check('Xiangqi move timing is eased and less abrupt', xiangqiMoveMs >= 150 && xiangqiMoveMs <= 220 && xiangqi.includes('Easing.bezier('));
check('Xiangqi motion reaches 1.30 peak and settles', xiangqi.includes('withTiming(1.30') && xiangqi.includes('withSequence('));
check('Pooled hint layer remains bounded below 64 squares', hint.includes('MAX_HINT_SLOTS = 32') && hint.includes('Array.from({ length: MAX_HINT_SLOTS') && !hint.includes('Array.from({ length: 64'));

check('Post-copy updater runs current Chess gate aggregate', postCopy.includes('chess:current-check'));
check('Android Debug build runs current Chess gate aggregate', debugBat.includes('chess:current-check'));
check('Android Release build runs current Chess gate aggregate', releaseBat.includes('chess:current-check'));
check('Obsolete Phase 16B1/16B9 blockers are removed from current build scripts', !postCopy.includes('phase16b9:check') && !debugBat.includes('phase16b1:check') && !debugBat.includes('phase16b9:check') && !releaseBat.includes('phase16b1:check') && !releaseBat.includes('phase16b9:check'));

for (const [file, source] of [
  ['ChessBoard', board], ['ChessPiece', piece], ['useChessGame', hook], ['Chess game screen', game], ['Bloom modal', modal], ['Xiangqi board', xiangqi],
]) {
  const out = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
    reportDiagnostics: true,
    fileName: `${file}.tsx`,
  });
  check(`${file} transpiles without syntax diagnostics`, !(out.diagnostics || []).length);
}

console.log(`\nPhase 16B.13 SharedValue Reconnect + Motion: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
