const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const board = read('src/components/chess/ChessBoard.tsx');
const hint = read('src/components/chess/v2/HintLayer.tsx');
const visual = read('src/components/chess/v2/useChessVisualState.ts');
const piece = read('src/components/chess/v2/ChessPiece.tsx');
const game = read('src/app/chess-game/[gameId].tsx');
const fx = read('src/components/chess/ChessBattleEffects.tsx');
const interaction = read('src/components/chess/v2/InteractionLayer.tsx');
const clock = read('src/components/chess/ChessClock.tsx');
const diag = read('src/services/chess/chessDiagnostics.ts');

const checks = [
  ['hint layer is sparse', hint.includes('targets.map') && !hint.includes('Array.from({ length: 64')],
  ['hint layer has zero reanimated worklets', !hint.includes('react-native-reanimated') && !hint.includes('useAnimatedStyle')],
  ['hint updates are isolated from ChessBoard render', hint.includes('useImperativeHandle') && board.includes('hintControllerRef.current?.show') && !board.includes('setHintSnapshot')],
  ['visual state no longer owns hint animation masks', !visual.includes('legalMoveLow') && !visual.includes('hintRevealProgress') && !visual.includes('withTiming')],
  ['board computes only actual hint targets', board.includes('const targets: ChessHintTarget[] = []') && board.includes('hintControllerRef.current?.show(targets, premoveMode)')],
  ['programmatic local motion is translate-only', board.includes('source === "drag" && motionFxEnabled ? "settle" : "flat"')],
  ['opponent motion is translate-only', board.includes('animateMove(delta.move, OPPONENT_MOVE_MS, "flat")')],
  ['motion windows are short', board.includes('const MOVE_MS = 105') && board.includes('const OPPONENT_MOVE_MS = 110') && board.includes('const PREMOVE_MOVE_MS = 80')],
  ['drag lift reduced', piece.includes('withTiming(1.16, { duration: 70 })')],
  ['fx is emitted from visual commit', board.includes('onVisualCommit?.(previousVisualState, interactionStateRef.current)') && game.includes('handleVisualCommit')],
  ['old fx network/visual gate removed', !game.includes('boardMoving') && !game.includes('visualRevision') && !game.includes('previousStateRef')],
  ['latest fx replaces stale fx', fx.includes('event?.key') && fx.includes('setVisibleEvent(event)')],
  ['single board interaction gesture preserved', interaction.includes('Gesture.Tap()') && !interaction.includes('Array.from({ length: 64')],
  ['clock isolation preserved', clock.includes('state.turn === color') && clock.includes('1000')],
  ['diagnostics remain off hot path', diag.includes('CHESS_DIAGNOSTICS_ENABLED = false')],
  ['server-authoritative move contract preserved', board.includes('onMove(from, to, chosenPromotion, clientMoveId, current.revision)')],
  ['premove revalidation preserved', board.includes('premove_fire') && board.includes('attemptRef.current(queued.from, queued.to, queued.promotion, "premove")')],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
console.log(`PASS ${checks.length}/${checks.length}`);
