const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
const shaText = (s) => crypto.createHash('sha256').update(s).digest('hex');
let pass = 0, fail = 0;
function check(name, ok) { if (ok) { pass++; console.log('PASS', name); } else { fail++; console.error('FAIL', name); } }

const game = read('src/app/(chess)/chess-game/[gameId].tsx');
const board = read('src/components/chess/ChessBoard.tsx');
const clock = read('src/components/chess/ChessClock.tsx');
const rail = read('src/components/chess/ChessPlayerRail.tsx');
const material = read('src/components/chess/ChessMaterialStrip.tsx');
const interaction = read('src/components/chess/v2/InteractionLayer.tsx');
const preCopy = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const postCopy = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

const boardPrefix = board.split('const styles=StyleSheet.create({', 1)[0];
check('V4K ChessBoard gameplay/input prefix is byte-identical', shaText(boardPrefix) === 'e77652739fb03f608cdedc01113de75e747aabcb7969775d68826f3917f9f4d4');
check('V4K ChessPiece input remains byte-identical', sha('src/components/chess/v2/ChessPiece.tsx') === '33150f5dbd8712fe7f36d20d996ccb9ddcf8d87f61d48cbdc6e964f3e5cb4901');
check('V4K empty-square InteractionLayer remains byte-identical', sha('src/components/chess/v2/InteractionLayer.tsx') === '75f8b36a4136575adc501d217ce7dc7a101b175706a5c40689504cab99463ed7');
check('V4K PieceLayer remains byte-identical', sha('src/components/chess/v2/PieceLayer.tsx') === '110983a413f367f1b6d3b8f9aa517c56b10ccb0ebabb3fa6c52963f8ca545fc0');
check('single RNGH empty-square tap path remains', interaction.includes('Gesture.Tap()') && interaction.includes('positionToSquare'));

check('Hint Motion FX are production-on constants', game.includes('const HINTS_ENABLED = true;') && game.includes('const MOTION_ENABLED = true;') && game.includes('const FX_ENABLED = true;'));
check('diagnostic Hint Motion FX toggle controls removed', !game.includes('Hint:') && !game.includes('Motion:') && !game.includes('FX:') && !game.includes('diagnosticChips'));
check('player rails no longer render color/turn copy', !rail.includes('colorLabel') && !rail.includes('activeCopy') && !rail.includes('inactiveCopy') && !rail.includes('turnLine'));
check('clock no longer renders You/Opponent label', !clock.includes('label: string') && !clock.includes('styles.label'));
check('active clock is dark pink with white numerals', clock.includes('"#A92F5D"') && clock.includes('["#6F334A", "#FFFFFF"]'));
check('material advantage owns a separate fixed row above captures', material.includes('styles.advantageRow') && material.indexOf('styles.advantageRow') < material.indexOf('styles.pieces'));
check('captured material compacts for long rows', material.includes('total >= 14') && material.includes('total >= 11') && material.includes('total >= 8'));

check('board corners are truly clipped/rounded', board.includes('borderRadius:22,overflow:"hidden"') && board.includes('boardClip:{...StyleSheet.absoluteFillObject,borderRadius:22,overflow:"hidden"'));
check('promotion chooser remains custom Bloom UI with real piece assets', game.includes('PROMOTION_IMAGES[myColor][piece]') && (game.includes('styles.boardLocalOverlay') || game.includes('<BloomGameBottomModal')));
check('preparing/rematch flow remains custom blocking Bloom UI', (game.includes('const boardPreparing =') && game.includes('styles.boardLocalOverlay')) || (game.includes('gameFlowVisible') && game.includes('<BloomGameBottomModal')));
check('result experience uses full phone-window Modal', game.includes('<Modal') && game.includes('presentationStyle="overFullScreen"') && game.includes('statusBarTranslucent') && game.includes('styles.resultScreen'));
check('result has separate win/loss/draw copy and Bloom Supper hero surface', game.includes('const didWin') && game.includes('"Bạn thua"') && game.includes('styles.resultHero') && game.includes('BLOOM CHÚC MỪNG'));
check('result actions preserve rematch + dismiss paths', game.includes('Chơi ván mới') && game.includes('Đồng ý') && game.includes('setResultDismissed(true)'));

check('fixed PRE-COPY BAT uses pure batch JS-shadow cleanup', preCopy.includes(':CleanJsShadows') && !preCopy.includes('powershell -NoProfile'));
check('POST-COPY BAT verifies Phase 16B.9', postCopy.includes('phase16b9:check'));
check('Debug build runs Phase 16B.9 current gate', debugBat.includes('phase16b9:check') && !debugBat.includes('phase16b8:check'));
check('Release build runs Phase 16B.9 current gate', releaseBat.includes('phase16b9:check') && !releaseBat.includes('phase16b8:check'));

console.log(`\nPhase 16B.9 Chess Production Polish: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
