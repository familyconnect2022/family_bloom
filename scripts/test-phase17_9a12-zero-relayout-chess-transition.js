const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
let pass = 0, fail = 0;
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`PASS ${name}`); }
  else { fail++; console.error(`FAIL ${name}${detail ? `: ${detail}` : ''}`); }
}

const host = read('src/components/chess/ChessSurfaceHost.tsx');
const mini = read('src/components/chess/ChessMiniHost.tsx');
const board = read('src/components/chess/ChessBoard.tsx');
const piece = read('src/components/chess/v2/ChessPiece.tsx');
const rootLayout = read('src/app/_layout.tsx');
const aggregate = read('scripts/test-chess-current-build-gates.js');

check('A12 full Chess never uses display none/flex for visibility', !/display\s*:/.test(host));
check('persistent full surface is moved offscreen with SharedValue translate', host.includes('fullSurfaceX') && host.includes('translateX: fullSurfaceX.value') && host.includes('offscreenX = windowWidth + 48'));
check('full surface position updates in layout effect before normal effects', host.includes('useLayoutEffect') && host.includes('surface.mode === "full" ? 0 : offscreenX'));
check('minimize performs visual handoff before lifecycle mode change', /fullSurfaceX\.value = offscreenX;[\s\S]{0,180}requestAnimationFrame\(\(\) => minimizeChessSurface\(\)\)/.test(host));
check('result exit hides Chess before durable ACK cleanup', /leaveFinished[\s\S]{0,500}fullSurfaceX\.value = offscreenX;[\s\S]{0,260}requestAnimationFrame\([\s\S]{0,260}acknowledgeResult\(finishedGameId\)/.test(host));
check('Mini Chess is an independent app-root sibling', rootLayout.includes('<ChessSurfaceHost />') && rootLayout.includes('<ChessMiniHost />') && !host.includes('<MiniChessCard'));
check('Mini host owns only lightweight direct game-store subscription', mini.includes('subscribeChessGameStore(gameId, listener)') && mini.includes('ChessMiniHost') && !mini.includes('ChessBoard'));
check('one global GestureHandlerRootView owns Chess gestures', rootLayout.includes('<GestureHandlerRootView style={{ flex: 1 }}>') && !host.includes('GestureHandlerRootView') && !board.includes('GestureHandlerRootView'));
check('Mini drag/tap gesture remains functional under global root', mini.includes('Gesture.Pan()') && mini.includes('Gesture.Tap()') && mini.includes('Gesture.Race(pan, tap)'));
check('full game-store subscription still sleeps while mini', host.includes('useChessGame(activeFamilyId, surface.gameId, surface.mode === "full"') && host.includes('seed, surface.mode === "full"'));
check('fixed 32-piece native pool remains persistent', board.includes('const initialPieces = useMemo(() => buildPieceDescriptors(CHESS_START_FEN), [])') && board.includes('const pieces = initialPieces'));
check('board runtime sleeps while full surface is not visible', host.includes('runtimeActive={actualGame ? fullVisible : (surface.preparing || resettingWarmBoard)}'));
check('tap-only piece policy is unchanged', piece.includes('pointerEvents="none"') && !piece.includes('Gesture.Pan()'));
check('Chess travel motion is lighter at 1.12 peak', piece.includes('withTiming(1.12') && !piece.includes('withTiming(1.30'));
check('normal/opponent/premove motion windows are reduced', board.includes('const MOVE_MS = 132') && board.includes('const OPPONENT_MOVE_MS = 136') && board.includes('const PREMOVE_MOVE_MS = 108'));
check('reconcile motion is also shortened without remount', board.includes('const RECONCILE_MS = 150') && board.includes('reconcileRuntimeToSnapshot'));
check('Ready Promotion Result coordinate system remains untouched', host.includes('styles.chessModalLayer') && host.includes('promotion && actualGame') && host.includes('showResult'));
check('A11 synchronizing/input lock contract remains', host.includes('game.connectionPhase === "connected"') && host.includes('Đang đồng bộ ván cờ…'));
check('A12 is included in current Chess aggregate', aggregate.includes('test-phase17_9a12-zero-relayout-chess-transition.js'));

const sourceFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs);
    else if (/\.(ts|tsx)$/.test(entry.name)) sourceFiles.push(abs);
  }
}
walk(path.join(root, 'src'));
walk(path.join(root, 'server', 'src'));
let syntaxErrors = 0;
for (const file of sourceFiles) {
  const result = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  });
  syntaxErrors += (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length;
}
check(`full TS/TSX transpile scan (${sourceFiles.length} files)`, syntaxErrors === 0, `${syntaxErrors} diagnostics`);

console.log(`Phase 17.9A12 zero-relayout Chess transition: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
