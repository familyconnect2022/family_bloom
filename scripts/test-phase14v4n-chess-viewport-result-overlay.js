const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const screenPath = path.join(root, 'src/app/(chess)/chess-game/[gameId].tsx');
const toastPath = path.join(root, 'src/components/chess/ChessResultToast.tsx');
const screen = fs.readFileSync(screenPath, 'utf8');
const toast = fs.readFileSync(toastPath, 'utf8');
const server = fs.readFileSync(path.join(root, 'server/src/socket/socketServer.ts'), 'utf8');
const material = fs.readFileSync(path.join(root, 'src/components/chess/ChessMaterialStrip.tsx'), 'utf8');

let pass = 0;
let fail = 0;
function check(name, condition) {
  if (condition) { console.log(`PASS ${name}`); pass++; }
  else { console.error(`FAIL ${name}`); fail++; }
}

const boardOpen = screen.indexOf('<View style={styles.boardStage}>');
const boardClose = screen.indexOf('</View>', screen.indexOf('<ChessBoard', boardOpen));
const scrollClose = screen.indexOf('</ScrollView>');
const resultToast = screen.indexOf('<ChessResultToast');
const promotion = screen.indexOf('<ChessPromotionOverlay');

check('result toast exists once', (screen.match(/<ChessResultToast/g) || []).length === 1);
check('result toast is outside boardStage', resultToast > boardClose);
check('result toast is outside ScrollView', resultToast > scrollClose);
check('result toast is mounted before promotion root overlay', resultToast < promotion);
check('result toast hides while rematch loading', screen.includes('!resultDismissed && !rematchLoading'));
check('viewport overlay uses absoluteFillObject', toast.includes('...StyleSheet.absoluteFillObject'));
check('viewport overlay centers on screen', toast.includes('alignItems: "center"') && toast.includes('justifyContent: "center"'));
check('toast is not native React Native Modal', !toast.includes('Modal,' ) && !toast.includes('<Modal'));
check('boardStage no longer owns result toast', !screen.slice(boardOpen, boardClose).includes('ChessResultToast'));
check('screen root remains non-layout result host', screen.includes('</ScrollView>') && screen.slice(scrollClose, resultToast).includes('V4N'));
check('Bloom Bot fixed 120ms timing preserved', server.includes('const TEST_BOT_MOVE_DELAY_MS = 120;'));
check('material advantage remains above captured pieces', material.indexOf('styles.advantageRow') < material.indexOf('styles.piecesRow'));

console.log(`PASS ${pass}/${pass + fail}`);
if (fail) process.exit(1);
