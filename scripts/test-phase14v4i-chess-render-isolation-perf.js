const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const board = read('src/components/chess/ChessBoard.tsx');
const highlight = read('src/components/chess/v2/HighlightLayer.tsx');
const interaction = read('src/components/chess/v2/InteractionLayer.tsx');
const clock = read('src/components/chess/ChessClock.tsx');
const game = read('src/app/(chess)/chess-game/[gameId].tsx');
const diag = read('src/services/chess/chessDiagnostics.ts');
const piece = read('src/components/chess/v2/ChessPiece.tsx');
const checks = [
  ['motion defaults off', board.includes('motionFxEnabled = false') && game.includes('useState(false);\n  const [motionFxEnabled')],
  ['hint defaults off', board.includes('hintsEnabled = false') && game.includes('const [hintsEnabled, setHintsEnabled] = useState(false)')],
  ['highlight is sparse', !highlight.includes('Array.from({ length: 64') && highlight.includes('at most 6 highlight rectangles')],
  ['single board tap gesture', interaction.includes('Gesture.Tap()') && !interaction.includes('<Pressable') && !interaction.includes('Array.from({ length: 64')],
  ['clock active side only', clock.includes('state.turn === color') && clock.includes('setInterval(() => tick((value) => value + 1), 1000)')],
  ['diagnostics disabled', diag.includes('CHESS_DIAGNOSTICS_ENABLED = false') && !game.includes('<ChessDiagnosticPanel')],
  ['piece motion can be flat', piece.includes('motionFxEnabled') && piece.includes('scale.value = 1')],
  ['server move contract preserved', board.includes('onMove(from, to, chosenPromotion, clientMoveId, current.revision)')],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
if (failed) process.exit(1);
console.log(`PASS ${checks.length}/${checks.length}`);
