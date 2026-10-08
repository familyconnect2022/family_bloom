const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
let pass = 0, fail = 0;
function check(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`PASS ${name}`); }
  else { fail += 1; console.error(`FAIL ${name}${detail ? `: ${detail}` : ''}`); }
}
function syntax(rel) {
  const source = read(rel);
  const out = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    reportDiagnostics: true,
    fileName: path.basename(rel),
  });
  return (out.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
}

const board = read('src/components/chess/ChessBoard.tsx');
const piece = read('src/components/chess/v2/ChessPiece.tsx');
const layer = read('src/components/chess/v2/PieceLayer.tsx');
const interaction = read('src/components/chess/v2/InteractionLayer.tsx');
const host = read('src/components/chess/ChessSurfaceHost.tsx');
const rail = read('src/components/chess/ChessPlayerRail.tsx');
const material = read('src/components/chess/ChessMaterialStrip.tsx');
const perf = read('src/services/games/gameRuntimePerf.ts');
const aggregate = read('scripts/test-chess-current-build-gates.js');

check('Chess pieces have no Pan gesture', !/Gesture\.Pan\(/.test(piece) && !/GestureDetector/.test(piece));
check('Chess piece layer is visual-only', /pointerEvents="none"/.test(layer) && !/onDragStart|onDragCancel|onDrop/.test(layer));
check('ChessBoard has no drag/drop code path', !/onDragStart|onDragCancel|onDrop|positionToSquare|"drag"/.test(board));
check('Chess performance probe no longer carries drag counters', !/markDrag|dragStarts|dragDrops|dragCancels/.test(perf));
check('Board still owns one tap recognizer', /Gesture\.Tap\(\)/.test(interaction) && /runOnJS\(true\)/.test(interaction));
check('Old tap-pan arbitration context is gone', !/ChessBoardTapGestureContext/.test(interaction) && !/ChessBoardTapGestureContext/.test(piece));
check('Tap-to-move remains wired', /onPressSquare/.test(board) && /attemptRef\.current\(selectedNow, square/.test(board));
check('Tap premove remains wired', /queuePremove\(selectedNow, square/.test(board) && /premoveRef/.test(board));

check('Player rail no longer owns material strip', !/ChessMaterialStrip/.test(rail) && !/captures: ChessCaptureCounts|advantage: number/.test(rail));
check('Root host owns two external material strips', (host.match(/<ChessMaterialStrip/g) || []).length === 2);
check('Material strip sits in explicit 18dp rail-board lanes', /CHESS_MATERIAL_HEIGHT\s*=\s*18/.test(host) && /CHESS_MATERIAL_HEIGHT \* 2/.test(host));
check('HUD-board stack reserves four fixed inter-item gaps', /CHESS_CONTENT_GAP \* 4/.test(host));
check('Captured pieces are larger and advantage score is external/readable', /pieceSize = total >= 14 \? 11/.test(material) && /fontSize: 10/.test(material) && /Lợi thế \+/.test(material));
check('Empty material lane stays visually quiet', !/Chưa ăn quân/.test(material));

check('Mini Chess is reduced to 88x40', /MINI_WIDTH\s*=\s*88/.test(host) && /MINI_HEIGHT\s*=\s*40/.test(host));
check('Mini drag remains separate from piece input', /Gesture\.Pan\(\)/.test(host) && /Gesture\.Race\(pan, tap\)/.test(host) && !/Gesture\.Pan\(\)/.test(piece));
check('Root Chess still avoids full-screen elevation', !/elevation:\s*1000/.test(host));
check('Board geometry remains width-owned', /windowWidth - CHESS_SCREEN_GUTTER \* 2/.test(host) && /Math\.floor\(raw \/ 8\) \* 8/.test(host));
check('Ready/Promotion/Result still share root modal layer', /styles\.chessModalLayer/.test(host) && /promotion && actualGame/.test(host) && /showResult/.test(host));

const files = [
  'src/components/chess/ChessBoard.tsx',
  'src/components/chess/v2/ChessPiece.tsx',
  'src/components/chess/v2/PieceLayer.tsx',
  'src/components/chess/v2/InteractionLayer.tsx',
  'src/components/chess/ChessSurfaceHost.tsx',
  'src/components/chess/ChessPlayerRail.tsx',
  'src/components/chess/ChessMaterialStrip.tsx',
  'src/services/games/gameRuntimePerf.ts',
];
const errors = files.flatMap(rel => syntax(rel).map(d => `${rel}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`));
check(`A10 changed TypeScript/TSX syntax (${files.length} files)`, errors.length === 0, errors.slice(0, 4).join(' | '));
check('Current Chess aggregate includes A10', aggregate.includes('test-phase17_9a10-tap-only-material-rail-mini.js'));

console.log(`Phase 17.9A10 tap-only/material/mini: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
