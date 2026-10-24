const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__legacyScriptsDir, '..');
const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
let passed = 0;
const ok = (condition, message) => { if (!condition) fail(message); else { passed += 1; console.log(`PASS: ${message}`); } };

console.log('Family Bloom P2.32 — client board-game reset foundation');

const removed = [
  'src/app/(chess)',
  'src/app/(xiangqi)',
  'src/components/chess',
  'src/components/xiangqi',
  'src/hooks/chess',
  'src/games/xiangqi',
  'src/context/ChessRealtimeContext.tsx',
  'src/context/XiangqiRealtimeContext.tsx',
  'src/components/system/BloomGameOverlayStack.tsx',
  'src/components/system/BoardGameTerminalResultHost.tsx',
  'src/services/games/boardGameTerminalResultStore.ts',
  'src/services/games/gameRuntimePerf.ts',
  'src/web/games/WebGameSocketContext.tsx',
  'src/web/games/WebRealtimeGames.tsx',
  'src/web/games/webGameAudio.ts',
];
for (const item of removed) ok(!exists(item), `legacy client gameplay removed: ${item}`);

const foundation = [
  'src/types/chess.ts',
  'src/types/xiangqiBoardProtocol.ts',
  'src/types/xiangqiRealtime.ts',
  'src/services/chess/chessSocketService.ts',
  'src/services/xiangqi/xiangqiSocketService.ts',
  'src/app/(internal)/board-game-bot-test.tsx',
];
for (const item of foundation) ok(exists(item), `foundation retained: ${item}`);

const rootLayout = read('src/app/_layout.tsx');
ok(!/ChessRealtimeProvider|XiangqiRealtimeProvider|BloomGameOverlayStack|BoardGameAudioProvider/.test(rootLayout), 'root runtime has no legacy Chess/Xiangqi providers/overlay/audio host');
ok(!/\(chess\)|\(xiangqi\)/.test(rootLayout), 'root navigator has no production Chess/Xiangqi routes');
ok(rootLayout.includes('(internal)/board-game-bot-test'), 'internal Bloom Bot test route is registered');

const tabs = read('src/app/(tabs)/_layout.tsx');
ok(!/chess-game|xiangqi-game/.test(tabs), 'tab bar has no legacy board-game route visibility hacks');

const dev = read('src/app/(internal)/developer-tools.tsx');
ok(dev.includes('/board-game-bot-test'), 'Developer Tools links to Bloom Bot protocol test');
ok(!/chess-lobby|xiangqi-preview|gameRuntimePerf/.test(dev), 'Developer Tools no longer opens legacy production board-game UI');

const botTest = read('src/app/(internal)/board-game-bot-test.tsx');
for (const token of ['CHESS_EVENTS.testBotChallenge', 'CHESS_EVENTS.testBotInvite', 'CHESS_EVENTS.sessionRecover', 'XIANGQI_EVENTS.testBotChallenge', 'XIANGQI_EVENTS.testBotInvite', 'XIANGQI_EVENTS.sessionRecover']) {
  ok(botTest.includes(token), `bot test keeps protocol action: ${token}`);
}
ok(!/\b(?:import|require)\s*\(?\s*["'][^"']*(?:components\/chess|components\/xiangqi|ChessGameBoard|XiangqiGameBoard)[^"']*["']/.test(botTest),
  'bot test does not import deleted legacy board components (native presentation functions are allowed)');

const chessSocket = read('src/services/chess/chessSocketService.ts');
const xiangqiSocket = read('src/services/xiangqi/xiangqiSocketService.ts');
ok(chessSocket.includes('CHESS_EVENTS.inviteReceived') && chessSocket.includes('emitAck'), 'Chess realtime/invitation transport retained');
ok(xiangqiSocket.includes('XIANGQI_EVENTS.inviteReceived') && xiangqiSocket.includes('emitAck'), 'Xiangqi realtime/invitation transport retained');

const serverChess = read('server/src/socket/socketServer.ts');
const serverXiangqi = read('server/src/xiangqi/xiangqiSocket.ts');
ok(serverChess.includes('testBotChallenge') && serverChess.includes('inviteCreate') && serverChess.includes('sessionRecover'), 'Chess server protocol/bot/invitation/recovery retained');
ok(serverXiangqi.includes('testBotChallenge') && serverXiangqi.includes('inviteCreate') && serverXiangqi.includes('sessionRecover'), 'Xiangqi server protocol/bot/invitation/recovery retained');

const chessPieces = ['wk','wq','wr','wb','wn','wp','bk','bq','br','bb','bn','bp'];
for (const piece of chessPieces) ok(exists(`assets/images/chess/pieces-png-default/${piece}.png`), `Chess piece asset retained: ${piece}.png`);
const xiangqiPieces = [
  'red_general','red_advisor','red_elephant','red_chariot','red_horse','red_cannon','red_soldier',
  'black_general','black_advisor','black_elephant','black_chariot','black_horse','black_cannon','black_soldier',
];
for (const piece of xiangqiPieces) ok(exists(`assets/xiangqi/${piece}.png`), `Xiangqi piece asset retained: ${piece}.png`);
const sounds = ['move-check','premove','game-end','castle','move-opponent','illegal','tenseconds','move-self','capture','game-start','promote'];
for (const sound of sounds) ok(exists(`assets/audio/board-game/${sound}.mp3`), `board-game sound retained: ${sound}.mp3`);

const srcFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) srcFiles.push(full);
  }
}
walk(path.join(root, 'src'));
const legacyRouteHits = [];
for (const full of srcFiles) {
  const text = fs.readFileSync(full, 'utf8');
  if (/chess-lobby|chess-game|chess-challenge|xiangqi-lobby|xiangqi-game|xiangqi-challenge|xiangqi-preview/.test(text)) {
    legacyRouteHits.push(path.relative(root, full));
  }
}
ok(legacyRouteHits.length === 0, `no legacy production board-game route references remain${legacyRouteHits.length ? `: ${legacyRouteHits.join(', ')}` : ''}`);

if (process.exitCode) process.exit(process.exitCode);
console.log(`P2.32 PASS (${passed} assertions)`);
