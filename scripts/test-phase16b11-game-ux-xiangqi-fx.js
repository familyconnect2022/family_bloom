const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass = 0, fail = 0;
function check(name, ok) { if (ok) { pass++; console.log('PASS', name); } else { fail++; console.error('FAIL', name); } }

const chessGame = read('src/app/(chess)/chess-game/[gameId].tsx');
const chessBoard = read('src/components/chess/ChessBoard.tsx');
const xiangqiBoard = read('src/components/xiangqi/XiangqiGameBoard.tsx');
const xiangqiFx = read('src/components/xiangqi/XiangqiBattleEffects.tsx');
const xiangqiScreen = read('src/app/(xiangqi)/xiangqi-preview.tsx');
const preCopy = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const postCopy = read('Family_Bloom_CLEAN_APPLY_FULL.bat');

check('Chess board keeps proven V4K renderer sizing path', chessBoard.includes('Math.min(width - 28, 430)') && chessBoard.includes('alignSelf:"center"'));
check('Chess screen wrapper now mathematically fits and centers renderer', chessGame.includes('body: { paddingHorizontal: 8') && chessGame.includes('boardStage: {') && chessGame.includes('alignSelf: "center"') && chessGame.includes('padding: 6'));
check('Chess result uses visibly distinct win draw loss palettes', chessGame.includes('const resultPalette = didDraw') && (chessGame.includes('hero: "#B8892F"') || chessGame.includes('hero: "#C43C72"') || chessGame.includes('hero: "#D56591"')) && chessGame.includes('hero: "#6D5361"'));
check('Chess result has explicit outcome badge', chessGame.includes('const resultBadge =') && chessGame.includes('CHIẾN THẮNG') && chessGame.includes('VÁN ĐẤU KHÉP LẠI'));

check('Xiangqi legal capture hints are separated from empty hints', xiangqiBoard.includes('captureMode') && xiangqiBoard.includes('pieceBySquare.get') && xiangqiBoard.includes('target.capture'));
check('Xiangqi capture ring renders above pieces', xiangqiBoard.includes('hintPlane') && /piecePlane: \{[^\n]*zIndex: 20/.test(xiangqiBoard) && /hintPlane: \{[^\n]*zIndex: 30/.test(xiangqiBoard));
check('Xiangqi hints use pooled stagger animation', xiangqiBoard.includes('withDelay') && xiangqiBoard.includes('buildParallelHintDelays') && xiangqiBoard.includes('withSequence'));
check('Xiangqi pieces animate movement instead of teleporting', xiangqiBoard.includes('XiangqiPieceSprite') && xiangqiBoard.includes('withTiming(left') && xiangqiBoard.includes('withTiming(top') && xiangqiBoard.includes('pieceSlotMoving'));
check('Xiangqi keeps approved 1.3x resting piece footprint', xiangqiBoard.includes('step * 1.3') && xiangqiBoard.includes('Math.min(72'));
check('Xiangqi has battle FX for capture check and finale', xiangqiFx.includes('kind: "capture" | "check" | "checkmate" | "finish"') && xiangqiFx.includes('ĂN ${PIECE_COPY') && xiangqiFx.includes('CHIẾU TƯỚNG!') && xiangqiFx.includes('Haptics'));
check('Xiangqi screen exposes preparing ready and playing phases', xiangqiScreen.includes('type XiangqiRoundPhase = "preparing" | "ready" | "playing"') && xiangqiScreen.includes('Đang chuẩn bị ván đấu') && xiangqiScreen.includes('Sẵn sàng • Đỏ đi trước'));
check('Xiangqi blocks clocks and moves until ready sequence completes', xiangqiScreen.includes('roundPhase !== "playing" || game.gameOver') && xiangqiScreen.includes('roundPhase !== "playing" || game.gameOver || game.turn !== "red"'));
check('Xiangqi result waits for battle FX before full-screen result', xiangqiScreen.includes('setTimeout(() => setResultRevealReady(true), 820)') && (xiangqiScreen.includes('visible={game.gameOver && resultRevealReady}') || xiangqiScreen.includes('visible={screenFocused && game.gameOver && resultRevealReady}')));
check('Xiangqi win and loss are visually distinct', xiangqiScreen.includes('const resultPalette = didWin') && (xiangqiScreen.includes('hero: "#B88A2E"') || xiangqiScreen.includes('hero: "#D56591"')) && xiangqiScreen.includes('hero: "#6E5361"') && xiangqiScreen.includes('"Bạn thua"'));
check('copy-over cleanup BAT remains bundled', preCopy.includes('PRE-COPY CLEAN') && postCopy.includes('CLEAN APPLY FULL'));

for (const [file, source] of [
  ['chess game', chessGame],
  ['xiangqi board', xiangqiBoard],
  ['xiangqi FX', xiangqiFx],
  ['xiangqi screen', xiangqiScreen],
]) {
  const out = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
    reportDiagnostics: true,
    fileName: file.endsWith('board') ? 'component.tsx' : 'screen.tsx',
  });
  check(`${file} transpiles without syntax diagnostics`, !(out.diagnostics || []).length);
}

console.log(`\nPhase 16B.11 Game UX + Xiangqi FX: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
