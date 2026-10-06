const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass=0, fail=0;
function check(name, ok){ if(ok){pass++;console.log('PASS',name);} else {fail++;console.error('FAIL',name);} }

const board=read('src/components/chess/ChessBoard.tsx');
const pieces=read('src/components/chess/v2/PieceLayer.tsx');
const game=read('src/app/(chess)/chess-game/[gameId].tsx');
const driver=read('src/components/system/AppWidePerformanceDriver.tsx');
const lab=read('src/app/(internal)/performance-test.tsx');
const xiangqi=read('src/components/xiangqi/XiangqiGameBoard.tsx');
const xiangqiScreen=read('src/app/(xiangqi)/xiangqi-preview.tsx');
const xiangqiEngine=read('src/games/xiangqi/xiangqiEngine.ts');

check('Chess board is restored to the proven V4K input/render checkpoint', board.includes('const onTapPiece = useCallback') && board.includes('const onPressSquare = useCallback') && !board.includes('[FB_CHESS_INPUT]'));
check('Chess board keeps the proven V4K single visual plane', board.includes('<SquareLayer') && board.includes('style={[StyleSheet.absoluteFill, fadeStyle]}'));
check('Chess board has no regression-prone full-size wrapper planes', !board.includes('squarePlane:{') && !board.includes('visualPlane:{') && !board.includes('piecePlane:{'));
check('Chess PieceLayer is the V4K plain absolute-fill surface', pieces.includes('style={StyleSheet.absoluteFill}') && !pieces.includes('styles.layer'));
check('Chess game removes post-V4K board portal/measurement code', !game.includes('measureInWindow') && !game.includes('boardWindowPortalSlot') && !game.includes('boardSurfaceRef'));
check('Chess game keeps V4K gameplay while promotion/preparing stay board-local', game.includes('PHONG QUÂN') && game.includes('styles.boardLocalOverlay') && game.includes('const boardPreparing =') && !game.includes('measureInWindow'));

const startBlock = lab.split('const startAppWideSweep = () => {')[1]?.split('const copyAppWideSweepReport')[0] || '';
check('Performance button starts fresh run without competing navigation', startBlock.includes('appWidePerformanceService.start()') && !startBlock.includes('router.'));
check('Performance driver reacts when runnerReady flips', driver.includes('state.runnerReady, state.status'));
check('Performance driver has direct Android Lab retry + fail-safe', driver.includes('[FB_PERF_DRIVER] BOOTSTRAP') && driver.includes('const target = appWidePerformanceService.routeForStep') && driver.includes('router.replace(target as never)') && driver.includes('6000'));
check('Performance driver still uses replace-only step ownership', driver.includes('router.replace(route as never)') && !driver.includes('router.navigate(route as never)'));

check('Xiangqi board uses 1.3x piece box', xiangqi.includes('step * 1.3') && xiangqi.includes('Math.min(72'));
check('Xiangqi input uses native RNGH tap inside ScrollView', xiangqi.includes('GestureDetector') && xiangqi.includes('Gesture.Tap()') && xiangqi.includes('runOnJS(handleBoardTap)'));
check('Chess tap path restores proven V4P split handlers', board.includes('const onTapPiece = useCallback') && board.includes('const onPressSquare = useCallback') && !board.includes('handleSquareTap') && !board.includes('tap_deduped'));
check('Xiangqi screen remains playable with local Bloom Bot', xiangqiScreen.includes('playXiangqiMove') && xiangqiScreen.includes('chooseXiangqiBotMove'));
check('Xiangqi has focused 10-minute clocks', xiangqiScreen.includes('600_000') && xiangqiScreen.includes('clockActive'));
check('Xiangqi engine includes legal move and check filtering', xiangqiEngine.includes('getXiangqiLegalMoves') && xiangqiEngine.includes('isXiangqiInCheck'));
check('Xiangqi engine covers cannon screen horse leg elephant eye', xiangqiEngine.includes('screenSeen') && xiangqiEngine.includes('lc:') && xiangqiEngine.includes('dc / 2'));

console.log(`Phase 16B.1 Chess + Performance + Xiangqi Hotfix: ${pass} PASS / ${fail} FAIL`);
process.exit(fail?1:0);
