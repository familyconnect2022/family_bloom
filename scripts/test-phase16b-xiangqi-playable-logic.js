const fs = require('fs');
const path = require('path');
const os = require('os');
const Module = require('module');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const enginePath = path.join(root, 'src/games/xiangqi/xiangqiEngine.ts');
const screenPath = path.join(root, 'src/app/(xiangqi)/xiangqi-preview.tsx');
const boardPath = path.join(root, 'src/components/xiangqi/XiangqiGameBoard.tsx');
const devToolsPath = path.join(root, 'src/app/(internal)/developer-tools.tsx');
const playPath = path.join(root, 'src/app/(tabs)/play.tsx');
const perfConstPath = path.join(root, 'src/constants/performanceTest.ts');
const homeGamesPath = path.join(root, 'src/app/(home)/(games)/home-games.tsx');
const chessBoardPath = path.join(root, 'src/components/chess/ChessBoard.tsx');
const chessPieceLayerPath = path.join(root, 'src/components/chess/v2/PieceLayer.tsx');
const debugBuildPath = path.join(root, 'scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBuildPath = path.join(root, 'scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

let pass = 0;
let fail = 0;
function check(name, condition) {
  if (condition) { pass += 1; console.log(`PASS ${name}`); }
  else { fail += 1; console.error(`FAIL ${name}`); }
}

const play = fs.readFileSync(playPath, 'utf8');
const source = fs.readFileSync(enginePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  fileName: enginePath,
}).outputText;
const temp = path.join(os.tmpdir(), `xiangqi-engine-${Date.now()}.cjs`);
fs.writeFileSync(temp, compiled);
const engine = require(temp);
fs.unlinkSync(temp);

const {
  createInitialXiangqiState,
  getXiangqiLegalMoves,
  playXiangqiMove,
  isXiangqiInCheck,
  chooseXiangqiBotMove,
  timeoutXiangqi,
} = engine;

const state = createInitialXiangqiState();
check('initial position has 32 pieces', state.pieces.length === 32);
check('red moves first', state.turn === 'red');
const soldier = state.pieces.find((p) => p.id === 'r-soldier-0');
const soldierMoves = getXiangqiLegalMoves(state, soldier.id);
check('soldier before river moves forward only', soldierMoves.length === 1 && soldierMoves[0].col === 0 && soldierMoves[0].row === 5);

function custom(pieces, turn = 'red') {
  return { pieces, turn, gameOver: false, moveNumber: 1, lastMove: null, inCheck: null, winner: null, finishReason: null };
}
const generals = [
  { id:'bg', color:'black', type:'general', col:4, row:0 },
  { id:'rg', color:'red', type:'general', col:4, row:9 },
];

let s = custom([...generals, { id:'block', color:'red', type:'chariot', col:4, row:5 }]);
const blockerMoves = getXiangqiLegalMoves(s, 'block');
check('self-check filters move that exposes flying generals', !blockerMoves.some((m) => m.col === 3 && m.row === 5));

s = custom([...generals, { id:'rh', color:'red', type:'horse', col:4, row:7 }, { id:'leg', color:'red', type:'soldier', col:4, row:6 }]);
const horseMoves = getXiangqiLegalMoves(s, 'rh');
check('horse leg blocks vertical-leg jumps', !horseMoves.some((m) => m.row === 5));

s = custom([...generals, { id:'re', color:'red', type:'elephant', col:4, row:9 }, { id:'eye', color:'red', type:'soldier', col:3, row:8 }]);
const elephantMoves = getXiangqiLegalMoves(s, 're');
check('elephant eye blocks diagonal', !elephantMoves.some((m) => m.col === 2 && m.row === 7));

s = custom([...generals, { id:'re', color:'red', type:'elephant', col:2, row:5 }]);
const riverMoves = getXiangqiLegalMoves(s, 're');
check('red elephant cannot cross river', !riverMoves.some((m) => m.row < 5));

s = custom([...generals, { id:'file-block', color:'red', type:'soldier', col:4, row:5 }, { id:'rc', color:'red', type:'cannon', col:0, row:9 }, { id:'screen', color:'red', type:'soldier', col:0, row:7 }, { id:'target', color:'black', type:'horse', col:0, row:5 }]);
const cannonMoves = getXiangqiLegalMoves(s, 'rc');
check('cannon captures after exactly one screen', cannonMoves.some((m) => m.col === 0 && m.row === 5));
check('cannon cannot land between screen and target', !cannonMoves.some((m) => m.col === 0 && m.row === 6));

s = custom([...generals, { id:'file-block', color:'red', type:'soldier', col:4, row:5 }, { id:'rs', color:'red', type:'soldier', col:4, row:4 }]);
const crossed = getXiangqiLegalMoves(s, 'rs');
check('soldier gains sideways moves after river', crossed.some((m) => m.col === 3 && m.row === 4) && crossed.some((m) => m.col === 5 && m.row === 4));

s = custom([{ id:'bg', color:'black', type:'general', col:4, row:0 }, { id:'rg', color:'red', type:'general', col:4, row:9 }]);
check('facing generals are check', isXiangqiInCheck(s.pieces, 'red') && isXiangqiInCheck(s.pieces, 'black'));

let moved = playXiangqiMove(state, 'r-soldier-0', { col:0, row:5 });
check('legal move changes turn to black', moved.turn === 'black' && moved.pieces.find((p) => p.id === 'r-soldier-0').row === 5);
const botMove = chooseXiangqiBotMove(moved);
check('Bloom Bot chooses a legal black move', !!botMove && getXiangqiLegalMoves(moved, botMove.pieceId).some((m) => m.col === botMove.to.col && m.row === botMove.to.row));
const timedOut = timeoutXiangqi(moved, 'black');
check('local Xiangqi clock can finish on timeout', timedOut.gameOver && timedOut.winner === 'red' && timedOut.finishReason === 'timeout');

const screen = fs.readFileSync(screenPath, 'utf8');
const board = fs.readFileSync(boardPath, 'utf8');
const devTools = fs.readFileSync(devToolsPath, 'utf8');
const perfConst = fs.readFileSync(perfConstPath, 'utf8');
const home = fs.readFileSync(homeGamesPath, 'utf8');
const chessBoard = fs.readFileSync(chessBoardPath, 'utf8');
const chessPieceLayer = fs.readFileSync(chessPieceLayerPath, 'utf8');
const debugBuild = fs.readFileSync(debugBuildPath, 'utf8');
const releaseBuild = fs.readFileSync(releaseBuildPath, 'utf8');
check('Xiangqi page uses chess-like player rails', screen.includes('PlayerRail') && screen.includes('Bloom Bot') && screen.includes('Đầu hàng'));
check('Xiangqi rail uses focused 10-minute clock UI', screen.includes('600_000') && screen.includes('clockActive') && screen.includes('clockTextActive'));
check('Xiangqi page is playable, not gallery-only', screen.includes('playXiangqiMove') && screen.includes('chooseXiangqiBotMove'));
check('board uses native RNGH tap surface inside ScrollView', board.includes('GestureDetector') && board.includes('Gesture.Tap()') && board.includes('.runOnJS(true)') && board.includes('handleBoardTap(event.x, event.y)'));
check('piece box uses user-approved 1.3x scale', board.includes('step * 1.3') && board.includes('Math.min(72'));
const internalStyleBlock = chessBoard.split('const styles=StyleSheet.create({')[1] || '';
check('Chess restored proven V4P single-plane tree', chessBoard.includes('<SquareLayer') && chessBoard.includes('style={[StyleSheet.absoluteFill, fadeStyle]}') && !chessBoard.includes('piecePlane:{'));
check('Chess PieceLayer uses plain absolute fill', (chessPieceLayer.includes('style={StyleSheet.absoluteFill}') || (chessPieceLayer.includes('style={styles.layer}') && chessPieceLayer.includes('...StyleSheet.absoluteFillObject'))) && !/elevation\s*:/.test(chessPieceLayer));
check('retired app-wide performance route is absent', !fs.existsSync(path.join(root, 'src/app/(internal)/performance-test.tsx')));
check('retired app-wide runner service is absent', !fs.existsSync(path.join(root, 'src/services/performance/appWidePerformanceService.ts')));
check('developer tools owns explicit opt-in performance tests', devTools.includes('Hiệu năng & tải') && devTools.includes('performanceTestService.startInteractionProbe'));
check('developer tools are exact-account and internal-build gated', perfConst.includes('INTERNAL_TOOLS_ENABLED') && perfConst.includes('huynh235@gmail.com'));
check('home games presents Xiangqi as playable', home.includes('Chơi được ngay') && home.includes('Luật nền V1'));
check('Android builds keep safe-asset and Phase16B gates', [debugBuild, releaseBuild].every((text) => text.includes('phase16a2:check') && text.includes('phase16b:check')));
check('historical Phase16A gallery gate no longer blocks current builds', [debugBuild, releaseBuild].every((text) => !text.includes('phase16a:check')));

console.log(`Phase 16B Xiangqi Playable Logic + Clean Developer Tools: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
