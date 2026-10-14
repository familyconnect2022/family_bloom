const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const board = read('src/components/chess/ChessBoard.tsx');
const piece = read('src/components/chess/v2/ChessPiece.tsx');
const square = read('src/components/chess/v2/SquareLayer.tsx');
const screen = read('src/app/(chess)/chess-game/[gameId].tsx');
const diagnostics = read('src/services/chess/chessDiagnostics.ts');
const panel = read('src/components/chess/ChessDiagnosticPanel.tsx');

const checks = [
  ['visual interaction state is separated from latest network state', board.includes('const interactionStateRef = useRef(state)') && board.includes('const stateRef = useRef(state)')],
  ['selection validates against visible interaction state', /const selectSquare[\s\S]*const current = interactionStateRef\.current/.test(board)],
  ['attemptMove validates against visible interaction state', /const executeAttempt[\s\S]*const current = interactionStateRef\.current/.test(board)],
  ['snapshot rebuild advances visual interaction truth', board.includes('interactionStateRef.current = snapshot')],
  ['network-ahead visual catchup locks gestures before input', board.includes('VISUAL_CATCHUP_LOCK') && board.includes('useLayoutEffect(() =>')],
  ['move command carries the same visual revision used for validation', board.includes('onMove(from, to, chosenPromotion, clientMoveId, current.revision)') && screen.includes('expectedVersion: number')],
  ['hook emits explicit visual expectedVersion instead of silently substituting latest network revision', read('src/hooks/chess/useChessGame.ts').includes('const commandVersion = expectedVersion ?? current.revision') && read('src/hooks/chess/useChessGame.ts').includes('expectedVersion: commandVersion')],
  ['local authoritative confirm advances interaction truth', board.includes('interactionStateRef.current = applyChessMoveDelta(interactionStateRef.current, delta)')],
  ['remote authoritative commit advances interaction truth', (board.match(/interactionStateRef\.current = applyChessMoveDelta\(interactionStateRef\.current, delta\)/g) || []).length >= 2],
  ['drag mapping still starts from logical board coordinates', board.includes('positionToSquare(centerX, centerY, squareSize, orientation)')],
  ['drag tolerance considers only chess.js legal destinations', board.includes('const legalTargets = Array.from(new Set(moves.map((move) => String(move.to))))')],
  ['drag tolerance is bounded inside one destination square', board.includes('const maxDistance = squareSize * 0.56')],
  ['drop adjustment is diagnostic-visible', board.includes('stage: resolved.adjusted ? "drop_target_adjusted" : "drop_target"')],
  ['silent transient square lock is diagnostic-visible', board.includes('stage: "input_blocked"') && diagnostics.includes('| "input_blocked"')],
  ['diagnostic panel surfaces input busy reason', panel.includes('INPUT BUSY')],
  ['piece art is approximately 1.2x previous 0.82 sizing', piece.includes('squareSize * 0.984')],
  ['piece hit slot remains square-sized despite larger art', piece.includes('width: squareSize, height: squareSize')],
  ['Bloom board uses blush light squares', square.includes('#FBEFF4')],
  ['Bloom board uses rose dark squares', square.includes('#C98BA7')],
  ['board shell has Bloom border and rounded corners', board.includes('borderRadius:18') && board.includes('borderColor:"#E6B3C7"')],
  ['rematch has explicit loading state', screen.includes('const [rematchLoading, setRematchLoading] = useState(false)')],
  ['rematch loading starts before server request', /setRematchLoading\(true\);[\s\S]*await game\.rematch\(\)/.test(screen)],
  ['rematch overlay tells user a new game is being prepared', screen.includes('Đang chuẩn bị ván mới…') && screen.includes('Bloom đang xếp lại bàn cờ và kết nối đối thủ.')],
  ['rematch button cannot be spammed while loading', screen.includes('disabled={rematchLoading}') && screen.includes('if (rematchLoading) return')],
  ['router gameId change clears old loading overlay', /setRematchLoading\(false\);[\s\S]*\}, \[gameId\]\)/.test(screen)],
  ['visual hint architecture still avoids React legal-move state', !board.includes('setLegalMoves') && !board.includes('setLegalTargets') && board.includes('visual.legalMoveLow.value')],
  ['server reject still uses authoritative resync', board.includes('const snapshot = await onResync()') && board.includes('rebuildFromSnapshot(snapshot)')],
];

let pass = 0;
for (const [name, ok] of checks) {
  if (ok) { pass += 1; console.log(`PASS ${name}`); }
  else console.error(`FAIL ${name}`);
}
console.log(`\nPhase 14V4E input stabilization + Bloom polish: ${pass}/${checks.length} PASS`);
if (pass !== checks.length) process.exit(1);
