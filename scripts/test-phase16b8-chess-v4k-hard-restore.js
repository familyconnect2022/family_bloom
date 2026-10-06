const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
let pass = 0, fail = 0;
function check(name, ok) { if (ok) { pass++; console.log('PASS', name); } else { fail++; console.error('FAIL', name); } }

const expected = {
  'src/components/chess/ChessBoard.tsx': 'ee57261d4667978a23388f0ceff36e4b90b451f2880a29ea916cc2ec0883364c',
  'src/components/chess/v2/ChessPiece.tsx': '33150f5dbd8712fe7f36d20d996ccb9ddcf8d87f61d48cbdc6e964f3e5cb4901',
  'src/components/chess/v2/InteractionLayer.tsx': '75f8b36a4136575adc501d217ce7dc7a101b175706a5c40689504cab99463ed7',
  'src/components/chess/v2/PieceLayer.tsx': '110983a413f367f1b6d3b8f9aa517c56b10ccb0ebabb3fa6c52963f8ca545fc0',
  'src/components/chess/ChessClock.tsx': '0a3e33021ce9a1b18d43b8e8065f0aabef3a1e64cc98da67acfd9165e9fd790a',
  'src/components/chess/ChessPlayerRail.tsx': '992481415379e8a824d00fa18388521a7d1df5e439db0025c9e1aeb5f678a7f3',
  'src/components/chess/ChessMaterialStrip.tsx': '233535add123327532f790d5af15eed5a82925733f513058a81f72834663675f',
};
for (const [file, digest] of Object.entries(expected)) check(`${file} matches proven V4K checkpoint`, sha(file) === digest);

const game = read('src/app/(chess)/chess-game/[gameId].tsx');
const board = read('src/components/chess/ChessBoard.tsx');
const interaction = read('src/components/chess/v2/InteractionLayer.tsx');
const socket = read('src/services/chess/chessSocketService.ts');
const hook = read('src/hooks/chess/useChessGame.ts');
const server = read('server/src/socket/socketServer.ts');
const cleanup = read('scripts/setup/cleanup-overlay-routes.js');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

check('game route is the V4K interaction-era screen inside the current route group',
  game.includes('const [fxEnabled, setFxEnabled] = useState(false)') &&
  game.includes('const [hintsEnabled, setHintsEnabled] = useState(false)') &&
  game.includes('const [motionFxEnabled, setMotionFxEnabled] = useState(false)'));
check('game route removed post-V4K promotion/result/preparing portal code',
  !game.includes('ChessPromotionOverlay') && !game.includes('ChessResultToast') && !game.includes('measureInWindow') && !game.includes('boardWindowPortalSlot') && !game.includes('boardSurfaceRef'));
check('V4K inline promotion chooser is restored', game.includes('Phong cấp thành') && game.includes("[['q', 'Hậu'], ['r', 'Xe'], ['b', 'Tượng'], ['n', 'Mã']]"));
check('V4K rematch loading overlay is screen-level and has no board portal', game.includes('styles.rematchOverlay') && game.includes('Đang chuẩn bị ván mới…') && !game.includes('<Modal'));
check('V4K split piece/destination input path is intact',
  board.includes('const onTapPiece = useCallback') && board.includes('const onPressSquare = useCallback') &&
  board.includes('attemptRef.current(selectedNow, square') && board.includes('queuePremove(selectedNow, square'));
check('V4K empty-square interaction uses one RNGH tap surface',
  interaction.includes('Gesture.Tap()') && interaction.includes('positionToSquare') && interaction.includes('style={StyleSheet.absoluteFill}'));
check('no 16B tap dedupe/lifecycle patch remains in ChessBoard',
  !board.includes('lastTapRef') && !board.includes('tap_deduped') && !board.includes('[FB_CHESS_INPUT]') && !board.includes('state.fen !== visible.fen'));
check('client realtime transport remains unchanged',
  sha('src/services/chess/chessSocketService.ts') === 'a2169413de584be7922b6cbdc6854f47f6f76ea830808d18397f66647604409a' &&
  sha('src/hooks/chess/useChessGame.ts') === '09e9c34db9a973369d0c6fd415f05bc26a5d9d5d154d076137a5db983814da9f');
check('bundled Chess server remains V4M fixed-120ms server', server.includes('TEST_BOT_MOVE_DELAY_MS = 120') && server.includes('}, TEST_BOT_MOVE_DELAY_MS);'));
check('global Chess foreground presence provider remains unchanged', sha('src/context/ChessRealtimeContext.tsx') === '51d5e20679e2aebdad1e057419ac8782b5cd5ea1dff14d46a8a3ae5d782a3497');
check('V4K screen still allows Bloom Bot rematch anytime and keeps human 06:00 gate', game.includes('const canRematchNow = isTestBotOpponent || playWindow.canCreate;') && game.includes('Hẹn từ 06:00'));
check('copy-over cleanup removes post-V4K client overlay leftovers', cleanup.includes('ChessPromotionOverlay.tsx') && cleanup.includes('ChessResultToast.tsx'));
check('copy-over cleanup still removes legacy duplicate Chess routes', cleanup.includes("'src/app/chess-game'") && cleanup.includes("'src/app/chess-lobby.tsx'"));
check('Debug build uses the V4K recovery gate and no longer requires Phase 15A.6 portal gate', debugBat.includes('phase16b8:check') && !debugBat.includes('npm run phase15a6:check'));
check('Release build uses the V4K recovery gate and no longer requires Phase 15A.6 portal gate', releaseBat.includes('phase16b8:check') && !releaseBat.includes('npm run phase15a6:check'));

console.log(`\nPhase 16B.8 Chess V4K Hard Restore: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
