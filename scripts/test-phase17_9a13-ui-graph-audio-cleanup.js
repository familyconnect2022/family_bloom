const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};


const aggregate = read('scripts/test-chess-current-build-gates.js');
assert(aggregate.includes('test-phase17_9a13-ui-graph-audio-cleanup.js'), 'Current Chess aggregate does not include A13');
const cleanBat = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
assert(cleanBat.includes('node_modules\\expo-audio\\package.json') && cleanBat.includes('call npm install'), 'Copy-over updater does not bootstrap expo-audio');

const graph = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
assert(!graph.includes('finishBranchOpenPerf'), 'FamilyGraph still references removed finishBranchOpenPerf');

const play = read('src/app/(tabs)/play.tsx');
for (const label of ['Bảng tin Nhà Mình', 'Trò chơi Nhà Mình', 'Quỹ gia đình']) {
  assert(play.includes(label), `Missing top rectangular card: ${label}`);
}
assert(!play.includes('styles.grid'), 'Old square/grid Home hub layout still rendered');
assert(!play.includes('styles.miniCard'), 'Old mini square cards still rendered');
const boardIndex = play.indexOf('title="Bảng tin Nhà Mình"');
const gameIndex = play.indexOf('title="Trò chơi Nhà Mình"');
const fundIndex = play.indexOf('title="Quỹ gia đình"');
const welcomeIndex = play.indexOf('<BloomCard style={styles.welcomeCard}>');
assert(boardIndex >= 0 && gameIndex > boardIndex && fundIndex > gameIndex, 'Top Home cards are not ordered Board -> Games -> Fund');
assert(fundIndex < welcomeIndex, 'Board/Games/Fund are not placed at the top of Home content');

const kitchen = read('src/features/home/kitchen/KitchenFeaturePanel.tsx');
const searchIndex = kitchen.indexOf('placeholder="Tìm món mình đang thèm…"');
const prefIndex = kitchen.indexOf('<View style={styles.prefCard}>');
const todayIndex = kitchen.indexOf('<Text style={styles.heading}>Gợi ý hôm nay</Text>');
assert(searchIndex >= 0 && searchIndex < prefIndex && searchIndex < todayIndex, 'Kitchen search is not placed above preferences and daily suggestions');

const mini = read('src/components/chess/ChessMiniHost.tsx');
assert(!mini.includes('useSharedValue(x.value)'), 'ChessMiniHost still reads x.value during React render');
assert(!mini.includes('useSharedValue(y.value)'), 'ChessMiniHost still reads y.value during React render');
assert(mini.includes('const startX = useSharedValue(0);'), 'ChessMiniHost startX is not render-safe');
assert(mini.includes('const startY = useSharedValue(0);'), 'ChessMiniHost startY is not render-safe');

const pkg = JSON.parse(read('package.json'));
assert(pkg.dependencies['expo-audio'] === '~57.0.5', 'expo-audio SDK 57 dependency missing');

const soundFiles = [
  'move.wav', 'capture.wav', 'check.wav', 'promotion.wav', 'win.wav', 'loss.wav',
  'premove.wav', 'ready.wav', 'reconnect.wav', 'timeout.wav',
  'challenge_sent.wav', 'challenge_accepted.wav',
];
for (const file of soundFiles) {
  assert(exists(`assets/audio/chess/${file}`), `Missing local Chess SFX asset: ${file}`);
}

const soundscape = read('src/components/chess/useChessSoundscape.ts');
for (const api of ['playMove', 'playCapture', 'playCheck', 'playPromotion', 'playWin', 'playLoss', 'playPremove', 'playReady', 'playReconnect', 'playTimeout', 'playChallengeSent', 'playChallengeAccepted']) {
  assert(soundscape.includes(api), `Chess soundscape missing ${api}`);
}

const board = read('src/components/chess/ChessBoard.tsx');
assert(board.includes('onPremoveQueued?.();'), 'Premove does not emit immediate local tick');

const host = read('src/components/chess/ChessSurfaceHost.tsx');
assert(host.includes('latest.move.promotion'), 'Authoritative promotion sound classification missing');
assert(host.includes('latest.checkSquare'), 'Authoritative check sound classification missing');
assert(host.includes('latest.move.captured'), 'Authoritative capture sound classification missing');
assert(host.includes('latest.version <= lastSoundRevisionRef.current'), 'Authoritative revision sound dedupe missing');
assert(host.includes('onPremoveQueued={actualGame ? playPremove : undefined}'), 'Premove SFX not wired to board');
assert(host.includes('subscribeChessSoundUiEvents'), 'Challenge sound event bus not subscribed at persistent host');

const lobby = read('src/app/(chess)/chess-lobby.tsx');
assert(lobby.includes('publishChessSoundUiEvent("challenge_sent")'), 'Challenge-sent SFX event missing');
const globalHost = read('src/components/chess/ChessGlobalUiHost.tsx');
assert(globalHost.includes('publishChessSoundUiEvent("challenge_accepted")'), 'Challenge-accepted SFX event missing');

console.log('PASS phase17_9a13 UI + FamilyGraph + Reanimated + Chess audio gates');
