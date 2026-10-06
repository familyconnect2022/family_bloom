const fs = require('fs');
const vm = require('vm');
const ts = require('typescript');

const read = (p) => fs.readFileSync(p, 'utf8');
const board = read('src/components/chess/ChessBoard.tsx');
const piece = read('src/components/chess/v2/ChessPiece.tsx');
const pieceLayer = read('src/components/chess/v2/PieceLayer.tsx');
const hint = read('src/components/chess/v2/HintLayer.tsx');
const highlight = read('src/components/chess/v2/HighlightLayer.tsx');
const mask = read('src/components/chess/v2/moveMask.ts');
const visual = read('src/components/chess/v2/useChessVisualState.ts');
const hook = read('src/hooks/chess/useChessGame.ts');
const clientTypes = read('src/types/chess.ts');
const serverTypes = read('server/src/chess/chessTypes.ts');
const manager = read('server/src/chess/chessGameManager.ts');
const socket = read('server/src/socket/socketServer.ts');
const screen = read('src/app/(chess)/chess-game/[gameId].tsx');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

let pass = 0, fail = 0;
function check(name, ok) {
  if (ok) { pass++; console.log('PASS', name); }
  else { fail++; console.error('FAIL', name); }
}

check('renderer uses Reanimated and Gesture Handler', piece.includes('useSharedValue') && piece.includes('Gesture.Pan()') && piece.includes('useAnimatedStyle'));
check('drag frame updates are shared-value only', /\.onUpdate\(\(event\) => \{[\s\S]*x\.value = startX\.value \+ event\.translationX;[\s\S]*y\.value = startY\.value \+ event\.translationY;/.test(piece) && !/\.onUpdate\([\s\S]{0,400}setState/.test(piece));
check('illegal drag return is timing-based', board.includes('ILLEGAL_RETURN_MS = 95') && board.includes('snapPieceBack') && piece.includes('withTiming(startX.value'));
check('tap and drag share attemptMove path', board.includes('attemptRef.current(selectedNow, square') && (board.includes('attemptRef.current(runtime.square, target') || board.includes('attemptRef.current(runtime.square, resolved.target')));
check('pieces use stable descriptor ids instead of square keys', pieceLayer.includes('key={piece.id}') && !pieceLayer.includes('key={piece.square}'));
check('piece layer is persistent absolute native layer', pieceLayer.includes('StyleSheet.absoluteFill') && pieceLayer.includes('collapsable={false}'));
check('local WebP pieces use native Image', piece.includes('from "react-native"') && piece.includes('PIECE_IMAGES') && (piece.match(/\.webp"\)/g) || []).length === 12 && !piece.includes('expo-image'));
check('board has no React state for selection/legal hints', !board.includes('setLegalTargets') && !board.includes('useState<string | null>(null)') && !board.includes('legalTargets.map'));
check('64 static hint slots exist', hint.includes('Array.from({ length: 64 }') && hint.includes('const HintSlot = React.memo'));
check('64 static highlight slots exist', highlight.includes('Array.from({ length: 64 }') && highlight.includes('const HighlightSlot = React.memo'));
check('hint visibility is SharedValue/worklet driven', hint.includes('useAnimatedStyle') && hint.includes('hasBit(legalMoveLow.value') && hint.includes('hasBit(captureLow.value'));
check('normal and capture hints are distinct', hint.includes('styles.dot') && hint.includes('styles.capture'));
check('hint overlay cannot intercept touches', (hint.match(/pointerEvents="none"/g) || []).length >= 3);
check('logical masks are orientation-independent', mask.includes('squareToIndex') && !/squareToIndex[\s\S]{0,400}orientation/.test(mask));
check('64-bit mask is split low/high', mask.includes('low: number; high: number') && mask.includes('index < 32') && mask.includes('index - 32'));
check('capture mask recognizes capture and en-passant flags', mask.includes('flags.includes("c")') && mask.includes('flags.includes("e")'));
check('visual state includes selected/last/check/premove masks', ['selectedSquareIndex','lastMoveFromIndex','lastMoveToIndex','checkedKingIndex','premoveFromIndex','premoveToIndex'].every(k => visual.includes(k)));
check('selection updates masks without React setter', board.includes('buildMoveMasks(moves)') && board.includes('visual.revealHints(square, premoveMode)') && board.includes('visual.legalMoveLow.value') && board.includes('visual.captureHigh.value'));
check('drag begin shows hints without parent motion state update', /const onDragStart[\s\S]*selectSquare\(runtime\.square\);[\s\S]*boardLocked\.value = 1;/.test(board) && !/const onDragStart[\s\S]{0,500}setMotion\(true\)/.test(board));
check('board flip/resize repositions persistent pieces without snapshot rebuild', board.includes('controllersRef.current.get(id)?.setPosition') && /Resize\/flip is visual only/.test(board));
check('move delta buffer is bounded and preserves batched events', hook.includes('setMoveDeltas((items) => [...items, delta].slice(-16))'));
check('out-of-order/gapped move delta forces resync', hook.includes('delta.version !== current.revision + 1') && hook.includes('result === "gap"') && board.includes('Missing/out-of-order visual history'));
check('client move command is minimal', (/expectedVersion: (?:current\.revision|commandVersion),[\s\S]*from,[\s\S]*to,[\s\S]*promotion/.test(hook)) && !/emitAck<ChessMoveCommandAck>[\s\S]{0,500}\bfen\b/.test(hook));
check('move broadcast uses tiny authoritative delta event', socket.includes('E.gameMoveApplied, event.delta') && clientTypes.includes('export type ChessMoveDelta'));
check('full socket state strips PGN and legal moves', socket.includes('const { pgn: _pgn, legalMoves: _legalMoves, ...client } = state'));
check('move delta does not contain PGN/legal list', !/export type MoveDelta[\s\S]{0,1000}\bpgn\b/.test(serverTypes) && !/export type MoveDelta[\s\S]{0,1000}\blegalMoves\b/.test(serverTypes));
check('server persists checkpoint instead of every normal move', manager.includes('CHECKPOINT_EVERY_PLY') && manager.includes('history().length % CHECKPOINT_EVERY_PLY === 0'));
check('server remains authoritative for revision and chess.js validation', manager.includes('expectedRevision !== r.game.revision') && manager.includes('r.chess.move'));
check('human games do not enumerate legal move lists on server hot path', manager.includes('&& !!r.game.testBotUid'));
check('move command ACK is small', serverTypes.includes('MoveCommandAck = { clientMoveId: string; version: number; duplicate?: boolean }'));
check('screen passes stable callbacks to memoized board', (screen.includes('const runMove = React.useCallback') || screen.includes('const runMove=React.useCallback')) && screen.includes('onMove={runMove}') && screen.includes('onPromotion={requestPromotion}'));
check('server reject path resyncs instead of reverse B-to-A rollback', board.includes('const snapshot = await onResync()') && board.includes('rebuildFromSnapshot(snapshot)') && !board.includes('ROLLBACK_ANIMATION_MS'));
check('DEBUG build validates Renderer V2', debugBat.includes('npm run phase14v4:check'));
check('RELEASE build validates Renderer V2', releaseBat.includes('npm run phase14v4:check'));

// Execute the actual TS mask utilities so signed bit 31/63 and capture semantics are tested.
try {
  const js = ts.transpileModule(mask, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const sandbox = { exports: {}, module: { exports: {} }, require };
  sandbox.exports = sandbox.module.exports;
  vm.runInNewContext(js, sandbox);
  const m = sandbox.module.exports;
  const indices = ['a8','h8','e4','a1','h1'].map(m.squareToIndex);
  check('square/index mapping is exact', JSON.stringify(indices) === JSON.stringify([0,7,36,56,63]) && m.indexToSquare(36) === 'e4');
  const built = m.buildMoveMasks([
    { to: 'e3', flags: 'n' },
    { to: 'e4', flags: 'b' },
    { to: 'f7', flags: 'c', captured: 'p' },
    { to: 'd6', flags: 'e', captured: 'p' },
  ]);
  check('mask runtime differentiates moves/captures', m.hasBit(built.legal.low,built.legal.high,m.squareToIndex('e3')) && m.hasBit(built.legal.low,built.legal.high,m.squareToIndex('e4')) && m.hasBit(built.capture.low,built.capture.high,m.squareToIndex('f7')) && m.hasBit(built.capture.low,built.capture.high,m.squareToIndex('d6')));
  const edge = { low: 0, high: 0 }; m.setBit(edge,31); m.setBit(edge,63);
  check('signed bit 31 and 63 remain queryable', m.hasBit(edge.low,edge.high,31) && m.hasBit(edge.low,edge.high,63));
} catch (error) {
  console.error(error); fail += 3;
}

console.log(`Phase 14V.4 Chess Renderer V2: ${pass} PASS / ${fail} FAIL`);
process.exitCode = fail ? 1 : 0;
