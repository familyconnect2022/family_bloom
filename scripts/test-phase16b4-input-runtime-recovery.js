const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass = 0, fail = 0;
function check(name, ok) { if (ok) { pass++; console.log('PASS', name); } else { fail++; console.error('FAIL', name); } }

const chess = read('src/components/chess/ChessBoard.tsx');
const chessPiece = read('src/components/chess/v2/ChessPiece.tsx');
const interaction = read('src/components/chess/v2/InteractionLayer.tsx');
const xiangqi = read('src/components/xiangqi/XiangqiGameBoard.tsx');
const xiangqiScreen = read('src/app/(xiangqi)/xiangqi-preview.tsx');
const driver = read('src/components/system/AppWidePerformanceDriver.tsx');
const lab = read('src/app/(internal)/performance-test.tsx');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

// Chess: preserve the V4P path that was already playable on-device. Do not
// re-centralize piece and square taps into a new state machine.
check('Chess restores proven V4P piece tap path', chess.includes('const onTapPiece = useCallback') && chess.includes('selectSquare(runtime.square)') && !chess.includes('const handleSquareTap = useCallback'));
check('Chess restores proven V4P square destination path', chess.includes('const onPressSquare = useCallback') && chess.includes('attemptRef.current(selectedNow, square') && chess.includes('queuePremove(selectedNow, square'));
check('Chess removes 16B.4 tap dedupe regression', !chess.includes('lastTapRef') && !chess.includes('tap_deduped'));
check('Chess same-position lifecycle explicitly updates visual interaction truth', chess.includes('state.fen !== visible.fen') && chess.includes('state.revision < visible.revision') && chess.includes('interactionStateRef.current = state'));
check('Chess preparing-to-active lifecycle reopens board lock', chess.includes('boardLocked.value = canTouchBoard(state) ? 0 : 1'));
check('Chess drag path remains native', chessPiece.includes('Gesture.Race(pan, tap)') && chess.includes('const onDragStart') && chess.includes('const onDrop'));
check('Chess board keeps native empty-square RNGH surface', interaction.includes('Gesture.Tap()') && interaction.includes('positionToSquare'));

check('Xiangqi stays on native RNGH tap surface', xiangqi.includes('GestureHandlerRootView') && xiangqi.includes('GestureDetector') && xiangqi.includes('Gesture.Tap()') && xiangqi.includes('runOnJS(handleBoardTap)'));
check('Xiangqi approved piece size remains 1.3x capped at 72', xiangqi.includes('Math.min(72, step * 1.3)'));
check('Xiangqi selection and move path remains wired', xiangqiScreen.includes('if (selectedId)') && xiangqiScreen.includes('setSelectedId(tapped.id)') && xiangqiScreen.includes('playXiangqiMove(current, selectedId'));

const startBlock = lab.split('const startAppWideSweep = () => {')[1]?.split('const copyAppWideSweepReport')[0] || '';
check('Performance button leaves first navigation to global driver', startBlock.includes('appWidePerformanceService.start()') && !startBlock.includes('router.'));
check('Performance global runner owns direct bootstrap and continuation', driver.includes('[FB_PERF_DRIVER] BOOTSTRAP') && driver.includes('[FB_PERF_DRIVER] ACTIVE') && driver.includes('router.replace(target as never)') && driver.includes('failSafe'));
check('Debug build runs recovery gate', debugBat.includes('phase16b4:check'));
check('Release build runs recovery gate', releaseBat.includes('phase16b4:check'));

console.log(`Phase 16B.4 corrected recovery: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
