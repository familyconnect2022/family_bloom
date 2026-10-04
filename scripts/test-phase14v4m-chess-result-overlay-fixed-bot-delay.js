const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const game = read('src/app/chess-game/[gameId].tsx');
const result = read('src/components/chess/ChessResultToast.tsx');
const material = read('src/components/chess/ChessMaterialStrip.tsx');
const rail = read('src/components/chess/ChessPlayerRail.tsx');
const promotion = read('src/components/chess/ChessPromotionOverlay.tsx');
const server = read('server/src/socket/socketServer.ts');

const boardStageStart = game.indexOf('<View style={styles.boardStage}>');
const boardStageEnd = game.indexOf('<ChessPlayerRail', boardStageStart + 1);
const resultInsideBoard = boardStageStart >= 0 && boardStageEnd > boardStageStart && game.slice(boardStageStart, boardStageEnd).includes('<ChessResultToast');
const materialAdvantageBeforePieces = material.indexOf('styles.advantageRow') >= 0 && material.indexOf('styles.advantageRow') < material.indexOf('styles.piecesRow');

const checks = [
  ['result toast is mounted inside boardStage', resultInsideBoard],
  ['result toast is not native Modal', !result.includes(' Modal,') && !result.includes('<Modal') && result.includes('Intentionally NOT a React Native Modal')],
  ['result toast is absolute overlay and cannot consume layout height', result.includes('...StyleSheet.absoluteFillObject') && result.includes('zIndex: 900')],
  ['boardStage remains positioning anchor', game.includes('boardStage: {\n    position: "relative"')],
  ['win toast has richer celebration layer', result.includes('styles.aura') && result.includes('PETALS.map') && result.includes('<Blossom side="left"') && result.includes('Ionicons name="sparkles"')],
  ['win toast still has rematch and dismiss actions', result.includes('primaryLabel') && result.includes('Đồng ý') && result.includes('Ionicons name="refresh"')],
  ['advantage row is physically above captured piece row', materialAdvantageBeforePieces],
  ['advantage and captures use separate fixed vertical bands', material.includes('height: 14') && material.includes('height: 19') && !material.includes('marginBottom: -1')],
  ['long captured rows compact further', material.includes('ultraDense = total >= 14') && material.includes('pieceUltraDense') && material.includes('overlapUltraDense')],
  ['player rail reserves enough vertical room for two material rows', rail.includes('minHeight: 90') && rail.includes('minHeight: 38')],
  ['Bloom Bot delay is fixed at exactly 120ms', server.includes('const TEST_BOT_MOVE_DELAY_MS = 120;') && server.includes('}, TEST_BOT_MOVE_DELAY_MS);')],
  ['random bot think delay removed', !server.includes('90 + Math.floor(Math.random() * 90)') && !server.includes('250 + Math.floor(Math.random()')],
  ['bot move selection remains server authoritative', server.includes('await manager.move(') && server.includes('latest.revision')],
  ['promotion image overlay remains preserved', promotion.includes('wq.webp') && promotion.includes('bq.webp') && promotion.includes('<Image source={PROMOTION_IMAGES[key]}')],
  ['production Hint/Motion remain enabled', game.includes('hintsEnabled\n') && game.includes('motionFxEnabled\n')],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
console.log(`PASS ${checks.length}/${checks.length}`);
