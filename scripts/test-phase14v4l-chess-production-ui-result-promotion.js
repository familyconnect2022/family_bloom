const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const game = read('src/app/(chess)/chess-game/[gameId].tsx');
const rail = read('src/components/chess/ChessPlayerRail.tsx');
const clock = read('src/components/chess/ChessClock.tsx');
const result = read('src/components/chess/ChessResultToast.tsx');
const promotion = read('src/components/chess/ChessPromotionOverlay.tsx');
const board = read('src/components/chess/ChessBoard.tsx');
const hint = read('src/components/chess/v2/HintLayer.tsx');
const fx = read('src/components/chess/ChessBattleEffects.tsx');

const checks = [
  ['test toggles removed from game UI', !game.includes('Hint:') && !game.includes('Motion:') && !game.includes('FX:') && !game.includes('diagnosticChips')],
  ['hints enabled in production', game.includes('hintsEnabled\n') && board.includes('hintsEnabled = false')],
  ['motion enabled in production', game.includes('motionFxEnabled\n') && board.includes('motionFxEnabled = false')],
  ['battle FX always connected during active play', game.includes('<ChessBattleEffects event={battleEvent} mode="full" />') && game.includes('deriveChessBattleEvent(previous, current, myColor)')],
  ['clock labels removed', !clock.includes('label: string') && !clock.includes('styles.label') && !game.includes('clockLabel=')],
  ['active clock uses full Bloom fill and white digits', clock.includes('["#FFF9FC", "#D84F85"]') && clock.includes('["#874C62", "#FFFFFF"]')],
  ['redundant piece color labels removed', !rail.includes('colorLabel') && !game.includes('colorLabel=')],
  ['rail turn copy removed in favor of clock focus', !rail.includes('activeCopy') && !rail.includes('inactiveCopy')],
  ['centered result toast integrated over board', game.includes('<ChessResultToast') && result.includes('StyleSheet.absoluteFillObject') && result.includes('justifyContent: "center"')],
  ['result toast has new game and dismiss actions', result.includes('primaryLabel') && result.includes('Đồng ý') && game.includes('Chơi ván mới')],
  ['win celebration is lightweight and result-only', result.includes('PETALS') && result.includes('outcome === "win"') && result.includes('Ionicons name="sparkles"')],
  ['old finished BloomCard removed', !game.includes('<BloomCard tone="soft"') && !game.includes('styles.result')],
  ['promotion is centered custom overlay', game.includes('<ChessPromotionOverlay') && promotion.includes('StyleSheet.absoluteFillObject') && promotion.includes('justifyContent: "center"')],
  ['promotion choices use real piece images', promotion.includes('wq.webp') && promotion.includes('wr.webp') && promotion.includes('wb.webp') && promotion.includes('wn.webp') && promotion.includes('<Image source={PROMOTION_IMAGES[key]}')],
  ['promotion choices have no visible piece-name text', !promotion.includes('>Hậu<') && !promotion.includes('>Xe<') && !promotion.includes('>Tượng<') && !promotion.includes('>Mã<')],
  ['promotion remains server-authoritative move input', board.includes('onPromotion(from, to)') && board.includes('onMove(from, to, chosenPromotion, clientMoveId, current.revision)')],
  ['V4J sparse hint preserved', hint.includes('targets.map') && !hint.includes('Array.from({ length: 64')],
  ['V4K material swing filter preserved', fx.includes('show: netGain >= 2') && fx.includes('title: "ĐỘT BIẾN!"')],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
console.log(`PASS ${checks.length}/${checks.length}`);
