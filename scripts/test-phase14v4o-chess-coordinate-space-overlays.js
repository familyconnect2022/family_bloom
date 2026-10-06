const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const game = read('src/app/(chess)/chess-game/[gameId].tsx');
const result = read('src/components/chess/ChessResultToast.tsx');
const promotion = read('src/components/chess/ChessPromotionOverlay.tsx');
const server = read('server/src/socket/socketServer.ts');
const material = read('src/components/chess/ChessMaterialStrip.tsx');
const fx = read('src/components/chess/ChessBattleEffects.tsx');
const hint = read('src/components/chess/v2/HintLayer.tsx');

const boardStart = game.indexOf('<View style={[styles.boardStage, boardLocalOverlayActive && styles.boardStageOverlayActive]}>');
const boardEnd = game.indexOf('</View>', game.indexOf('<ChessPromotionOverlay', boardStart));
const promotionPos = game.indexOf('<ChessPromotionOverlay');
const scrollClose = game.indexOf('</ScrollView>');
const resultPos = game.indexOf('<ChessResultToast');

const checks = [
  ['promotion overlay is mounted inside boardStage', boardStart >= 0 && promotionPos > boardStart && promotionPos < boardEnd],
  ['promotion overlay no longer uses native Modal', !promotion.includes('import { Modal') && !promotion.includes(' Modal,') && !promotion.includes('<Modal')],
  ['promotion overlay is board-local absolute fill', promotion.includes('...StyleSheet.absoluteFillObject') && promotion.includes('justifyContent: "center"') && promotion.includes('borderRadius: 18')],
  ['promotion choices still use real piece images', promotion.includes('wq.webp') && promotion.includes('bq.webp') && promotion.includes('<Image source={PROMOTION_IMAGES[key]}')],
  ['result toast remains outside ScrollView', scrollClose >= 0 && resultPos > scrollClose],
  ['result toast uses physical window dimensions', result.includes('useWindowDimensions') && result.includes('viewportWidth') && result.includes('viewportHeight')],
  ['result overlay anchors at root top-left instead of parent bottom sizing', result.includes('position: "absolute"') && result.includes('top: 0') && result.includes('left: 0') && !result.includes('...StyleSheet.absoluteFillObject,\n    zIndex: 900')],
  ['result overlay centers in explicit viewport', result.includes('justifyContent: "center"') && result.includes('style={[styles.overlay, { width: viewportWidth, height: viewportHeight }]}')],
  ['explicit loss result exists', result.includes('title: "Bạn thua"') && result.includes('outcome === "loss" && styles.lossCard')],
  ['draw result remains explicit', result.includes('title: "Ván hòa"') && result.includes('outcome === "draw" && styles.drawCard')],
  ['win celebration remains rich but isolated', result.includes('PETALS.map') && result.includes('<Blossom side="left"') && result.includes('iconHaloWin')],
  ['material advantage remains above captured piece row', material.indexOf('styles.advantageRow') < material.indexOf('styles.piecesRow')],
  ['Bloom Bot timing remains fixed at 120 ms', server.includes('const TEST_BOT_MOVE_DELAY_MS = 120;') && server.includes('}, TEST_BOT_MOVE_DELAY_MS);')],
  ['V4J sparse hints preserved', hint.includes('targets.map') && !hint.includes('Array.from({ length: 64')],
  ['V4K material swing FX preserved', fx.includes('show: netGain >= 2') && fx.includes('title: "ĐỘT BIẾN!"')],
  ['production Hint/Motion remain enabled', game.includes('hintsEnabled\n') && game.includes('motionFxEnabled\n')],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
console.log(`PASS ${checks.length - failed}/${checks.length}`);
if (failed) process.exit(1);
