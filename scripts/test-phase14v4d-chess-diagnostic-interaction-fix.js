const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const piece = read('src/components/chess/v2/ChessPiece.tsx');
const board = read('src/components/chess/ChessBoard.tsx');
const interaction = read('src/components/chess/v2/InteractionLayer.tsx');
const checks = [
  ['pan activates only after drag threshold', /\.minDistance\((?:[6-9]|[1-9]\d+)\)/.test(piece) && piece.includes('.onStart(() =>')],
  ['tap no longer enters drag on touch begin', !piece.includes('.onBegin(() =>')],
  ['drag start still reports to board', piece.includes('runOnJS(onDragStart)(id)')],
  ['drop uses final gesture translation X', piece.includes('startX.value + event.translationX')],
  ['drop uses final gesture translation Y', piece.includes('startY.value + event.translationY')],
  ['drop center derives from final coordinates', piece.includes('finalX + squareSize / 2') && piece.includes('finalY + squareSize / 2')],
  ['shared values receive final release coordinate', piece.includes('x.value = finalX') && piece.includes('y.value = finalY')],
  ['failed pan finalize is inert for taps', piece.includes('.onFinalize(() => {') && piece.includes('if (!dragAllowed.value) return;')],
  ['tap gesture remains independent', piece.includes('Gesture.Tap().onEnd') && piece.includes('runOnJS(onTapPiece)(id)')],
  ['gesture race preserved', piece.includes('Gesture.Race(pan, tap)')],
  ['tap selection remains ref/shared-value based', board.includes('selectedRef.current = square') && board.includes('visual.revealHints(square, premoveMode)')],
  ['target square tap consumes preserved selection', board.includes('if (selectedNow) {') && board.includes('attemptRef.current(selectedNow, square, undefined, "tap")') && board.includes('queuePremove(selectedNow, square, undefined, "tap")')],
  ['drag drop still maps board coordinate to logical square', board.includes('positionToSquare(centerX, centerY, squareSize, orientation)')],
  ['illegal drag still snaps to origin', board.includes('if (source === "drag") snapPieceBack(movingPiece.id, from)')],
  ['interaction layer remains 64 static hit slots', interaction.includes('Array.from({ length: 64 }')],
  ['diagnostics remain enabled in board flow', board.includes('chessDiagnostics.mark') && board.includes('stage: "attempt_start"')],
];
let pass = 0;
for (const [name, ok] of checks) {
  if (ok) { pass++; console.log(`PASS ${name}`); }
  else console.error(`FAIL ${name}`);
}
console.log(`\nPhase 14V4D diagnostic interaction fix: ${pass}/${checks.length} PASS`);
if (pass !== checks.length) process.exit(1);
