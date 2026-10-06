const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const game = read('src/app/(chess)/chess-game/[gameId].tsx');
const board = read('src/components/chess/ChessBoard.tsx');
const promotion = read('src/components/chess/ChessPromotionOverlay.tsx');
const result = read('src/components/chess/ChessResultToast.tsx');
const server = read('server/src/socket/socketServer.ts');
const material = read('src/components/chess/ChessMaterialStrip.tsx');
const hint = read('src/components/chess/v2/HintLayer.tsx');

let pass = 0;
let fail = 0;
function check(name, condition) {
  if (condition) { console.log(`PASS ${name}`); pass++; }
  else { console.error(`FAIL ${name}`); fail++; }
}

const stageStart = game.indexOf('<View style={[styles.boardStage, boardLocalOverlayActive && styles.boardStageOverlayActive]}>');
const surfaceStart = game.indexOf('<View style={[styles.boardSurface, { width: boardSize, height: boardSize }]}>' , stageStart);
const overlayStart = game.indexOf('style={[styles.boardOverlayHost, { width: boardSize, height: boardSize }]}', surfaceStart);
const promotionPos = game.indexOf('<ChessPromotionOverlay', overlayStart);
const rematchPos = game.indexOf('{rematchLoading ? (', overlayStart);
const bottomRail = game.indexOf('<ChessPlayerRail', surfaceStart + 1);
const scrollClose = game.indexOf('</ScrollView>');
const resultPos = game.indexOf('<ChessResultToast');

check('shared board-size helper is exported', board.includes('export function getChessBoardSize(windowWidth: number)'));
check('ChessBoard itself uses shared board-size helper', board.includes('const boardSize = getChessBoardSize(width);'));
check('screen uses same shared board-size helper', game.includes('const boardSize = getChessBoardSize(windowWidth);'));
check('boardSurface is explicit physical board coordinate system', surfaceStart > stageStart && game.includes('boardSurface: {\n    position: "relative"'));
check('board overlay host is explicitly board-sized inside boardSurface', overlayStart > surfaceStart && game.includes('position: "absolute"') && game.includes('style={[styles.boardOverlayHost, { width: boardSize, height: boardSize }]}'));
check('board stage lifts above sibling rails while local overlay is visible', game.includes('const boardLocalOverlayActive = !!promotion || rematchLoading;') && game.includes('boardStageOverlayActive') && game.includes('zIndex: 4000') && game.includes('elevation: 24'));
check('promotion chooser is inside board overlay host', promotionPos > overlayStart && promotionPos < bottomRail);
check('preparing/rematch overlay is inside board overlay host', rematchPos > overlayStart && rematchPos < bottomRail);
check('no rematch/preparing overlay remains at root after ScrollView', game.indexOf('{rematchLoading ? (', scrollClose) === -1);
check('promotion chooser does not use Modal or window metrics', !promotion.includes('<Modal') && !promotion.includes('useWindowDimensions'));
check('promotion chooser absolute-fills its board host', promotion.includes('...StyleSheet.absoluteFillObject') && promotion.includes('justifyContent: "center"'));
check('promotion options remain image-only board sprites', promotion.includes('wq.webp') && promotion.includes('bq.webp') && promotion.includes('<Image source={PROMOTION_IMAGES[key]}'));
check('result toast remains root/viewport centered and untouched', resultPos > scrollClose && result.includes('useWindowDimensions') && result.includes('viewportHeight'));
check('explicit loss result remains available', result.includes('title: "Bạn thua"'));
check('fixed Bloom Bot 120ms test delay remains preserved', server.includes('const TEST_BOT_MOVE_DELAY_MS = 120;'));
check('material advantage row remains above captures', material.indexOf('styles.advantageRow') < material.indexOf('styles.piecesRow'));
check('sparse hints remain preserved', hint.includes('targets.map') && !hint.includes('Array.from({ length: 64'));
check('production Hint and Motion remain enabled', game.includes('hintsEnabled\n') && game.includes('motionFxEnabled\n'));

console.log(`PASS ${pass}/${pass + fail}`);
if (fail) process.exit(1);
