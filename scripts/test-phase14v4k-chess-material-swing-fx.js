const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const fx = read('src/components/chess/ChessBattleEffects.tsx');
const game = read('src/app/chess-game/[gameId].tsx');
const board = read('src/components/chess/ChessBoard.tsx');

const checks = [
  ['piece values defined', fx.includes('p: 1') && fx.includes('n: 3') && fx.includes('b: 3') && fx.includes('r: 5') && fx.includes('q: 9')],
  ['pawn capture fx suppressed', fx.includes('capturedPiece === "p"') && fx.includes('show: false')],
  ['immediate recapture is checked with local chess.js', fx.includes('new Chess(fen)') && fx.includes('move.to === square') && fx.includes('!!move.captured')],
  ['exchange gain subtracts capturing piece on recapture', fx.includes('capturedValue - (recapturable ? moverValue : 0)')],
  ['capture fx threshold is plus two', fx.includes('show: netGain >= 2')],
  ['routine capture returns no event', fx.includes('if (!swing?.show) return null')],
  ['qualified capture copy is material swing', fx.includes('title: "ĐỘT BIẾN!"') && fx.includes(':material-swing')],
  ['check remains higher priority than capture filter', fx.indexOf('if (checking)') < fx.indexOf('if (captured)')],
  ['promotion remains higher priority than capture filter', fx.indexOf('if (promoted)') < fx.indexOf('if (captured)')],
  ['visual commit fx pipeline preserved', game.includes('deriveChessBattleEvent(previous, current, myColor)') && board.includes('onVisualCommit?.(previousVisualState, interactionStateRef.current)')],
  ['V4J sparse hint remains preserved', board.includes('hintControllerRef.current?.show(targets, premoveMode)')],
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
console.log(`PASS ${checks.length}/${checks.length}`);
