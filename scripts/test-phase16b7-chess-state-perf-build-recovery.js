const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass = 0, fail = 0;
function check(name, ok) { if (ok) { pass++; console.log('PASS', name); } else { fail++; console.error('FAIL', name); } }

const board = read('src/components/chess/ChessBoard.tsx');
const piece = read('src/components/chess/v2/ChessPiece.tsx');
const lab = read('src/app/(internal)/performance-test.tsx');
const driver = read('src/components/system/AppWidePerformanceDriver.tsx');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
const overlayClean = read('scripts/setup/cleanup-overlay-routes.js');

const tapBlock = board.split('const onTapPiece = useCallback')[1]?.split('const onPressSquare = useCallback')[0] || '';
const startBlock = lab.split('const startAppWideSweep = () => {')[1]?.split('const copyAppWideSweepReport')[0] || '';

check('Chess piece tap reaches the proven V4P selectSquare path', tapBlock.includes('selectSquare(runtime.square)'));
check('Chess piece tap has no early visual-catchup/motion/pending return', !tapBlock.includes('VISUAL_CATCHUP_LOCK') && !tapBlock.includes('MOTION_LOCK') && !tapBlock.includes('PENDING_LOCK'));
check('Chess native tap always reaches JS; selection truth is validated in selectSquare', /if \(success\) runOnJS\(onTapPiece\)\(id\)/.test(piece));
check('preparing->active with same FEN may advance revision and is adopted', board.includes('if (state.fen !== visible.fen) return;') && board.includes('if (state.revision < visible.revision) return;') && board.includes('interactionStateRef.current = state'));
check('same-position lifecycle sync advances visual revision and unlocks active board', board.includes('lastQueuedVersionRef.current = Math.max') && board.includes('onVisualRevisionChange?.(state.revision)') && board.includes('boardLocked.value = canTouchBoard(state) ? 0 : 1'));
check('dev input log exposes a real block reason if device still rejects selection', board.includes('[FB_CHESS_INPUT] BLOCK') && board.includes('[FB_CHESS_INPUT] SELECT'));
check('Performance Lab is state-only startup owner', startBlock.includes('appWidePerformanceService.start()') && !startBlock.includes('router.'));
check('global driver directly opens current first route', driver.includes('const target = appWidePerformanceService.routeForStep(state.currentStep, runId)') && driver.includes('router.replace(target as never)'));
check('global driver retries and has hard fail-safe', driver.includes('retry1') && driver.includes('retry2') && driver.includes('retry3') && driver.includes('6000'));
check('performance bootstrap has no dismissAll or unrelated tabs staging route', !driver.includes('router.dismissAll()') && !driver.includes('router.replace("/(tabs)/play" as never)'));
check('Debug build runs Phase 16B.7 gate', debugBat.includes('phase16b7:check'));
check('Release build runs Phase 16B.7 gate', releaseBat.includes('phase16b7:check'));
check('Debug and Release builds auto-clean FULL-over-old route leftovers', debugBat.includes('cleanup-overlay-routes.js') && releaseBat.includes('cleanup-overlay-routes.js') && overlayClean.includes('src/app/chess-game') && overlayClean.includes('src/app/performance-test.tsx'));

console.log(`\nPhase 16B.7 Chess State + Performance Build Recovery: ${pass} PASS / ${fail} FAIL`);
process.exitCode = fail ? 1 : 0;
