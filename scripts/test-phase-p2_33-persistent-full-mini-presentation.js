const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let passed = 0;
let failed = 0;
function check(condition, message) {
  if (condition) { passed += 1; console.log(`PASS: ${message}`); }
  else { failed += 1; console.error(`FAIL: ${message}`); }
}

console.log('Family Bloom P2.33 — persistent Full/Mini presentation foundation');

const rootLayout = read('src/app/_layout.tsx');
const presentationRoot = read('src/components/games/BoardGamePresentationRoot.tsx');
const presentationStore = read('src/services/games/boardGamePresentationStore.ts');
const homeGames = read('src/app/(home)/(games)/home-games.tsx');
const cleanApply = read('scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat');
const overlayCleanup = read('scripts/setup/cleanup-overlay-routes.js');
const pkg = JSON.parse(read('package.json'));

check(exists('src/components/games/BoardGamePresentationRoot.tsx'), 'new root-level game presentation exists');
check(exists('src/services/games/boardGamePresentationStore.ts'), 'tiny presentation-only store exists');
check(rootLayout.includes('<BoardGamePresentationRoot />'), 'presentation root is mounted at app root');
check(rootLayout.indexOf('<BoardGamePresentationRoot />') > rootLayout.indexOf('</TabStartupProvider>'), 'presentation root is outside route/tab navigator subtree');
check(!rootLayout.includes('ChessRealtimeProvider') && !rootLayout.includes('XiangqiRealtimeProvider'), 'legacy realtime UI providers stay absent');
check(!rootLayout.includes('(chess)') && !rootLayout.includes('(xiangqi)'), 'no production Chess/Xiangqi route tree restored');

check(presentationStore.includes('"idle" | "full" | "mini"'), 'presentation has only IDLE/FULL/MINI modes');
check(presentationStore.includes('activeKind: null') && presentationStore.includes('fullContent: null') && presentationStore.includes('miniContent: null'), 'IDLE snapshot clears active kind and both contents');
check(/closeBoardGamePresentation[\s\S]*publish\(IDLE_SNAPSHOT\)/.test(presentationStore), 'Close deterministically resets to the canonical IDLE snapshot');
check(/activateBoardGamePresentation[\s\S]*mode: "full"[\s\S]*fullContent: kind[\s\S]*miniContent: kind/.test(presentationStore), 'activation seeds Full and Mini content once then enters FULL');
check(/minimizeBoardGamePresentation[\s\S]*mode: "mini"/.test(presentationStore), 'explicit minimize changes FULL to MINI');
check(/restoreBoardGamePresentation[\s\S]*mode: "full"/.test(presentationStore), 'explicit restore changes MINI to FULL');
check(!/gameId|fen|socket|clock|recovery|prepared|owner/i.test(presentationStore), 'presentation store contains no gameplay/session lifecycle state');

check((presentationRoot.match(/<Animated\.View/g) || []).length >= 2, 'Full and Mini are persistent sibling animated views');
check(presentationRoot.includes('width * 0.85') && presentationRoot.includes('height * 0.85'), 'Full view is 85% of phone width and height');
check(presentationRoot.includes('backgroundColor: "#F6B8D0"'), 'Full/Mini prototype uses pink presentation background');
check(presentationRoot.includes('hiddenFullX') && presentationRoot.includes('hiddenMiniX'), 'both persistent views have explicit off-screen parked coordinates');
check(presentationRoot.includes('presentation.mode === "full"') && presentationRoot.includes('presentation.mode === "mini"'), 'root handles FULL and MINI independently');
check(presentationRoot.includes('presentation.mode === "mini"') && presentationRoot.includes('Gesture.Pan()'), 'Mini drag is enabled only in MINI mode');
check(presentationRoot.includes('leftDockX') && presentationRoot.includes('rightDockX'), 'Mini snaps to left/right screen edge');
check(presentationRoot.includes('Math.min(maxMiniY') && presentationRoot.includes('Math.max(minMiniY'), 'Mini Y position is clamped inside safe screen bounds');
check(presentationRoot.includes('Gesture.Tap()') && presentationRoot.includes('restoreBoardGamePresentation'), 'tapping Mini restores Full');
check(presentationRoot.includes('onPress={minimizeBoardGamePresentation}'), 'Full has explicit Minimize button');
check(presentationRoot.includes('onPress={closeBoardGamePresentation}'), 'Full has explicit Close button');
check(presentationRoot.includes('presentation.fullContent') && presentationRoot.includes('presentation.miniContent'), 'Full and Mini render their own resettable content slots');
check(presentationRoot.includes('presentation.fullContent ? (') && presentationRoot.includes('presentation.miniContent ? ('), 'IDLE removes all inner Full/Mini content while retaining the root view shells');
check(!/ChessBoard|XiangqiGameBoard|chessSocketService|xiangqiSocketService/.test(presentationRoot), 'prototype root contains no board or realtime/gameplay implementation');

check(homeGames.includes('activateBoardGamePresentation("chess")'), 'Chess challenge action activates Chess Full view');
check(homeGames.includes('activateBoardGamePresentation("xiangqi")'), 'Xiangqi challenge action activates Xiangqi Full view');
check(homeGames.includes('Thách đấu'), 'Home Games exposes the challenge entry label');
check(homeGames.includes('assets/xiangqi/red_general.png'), 'Home Games validates the new Xiangqi PNG asset path');

const xiangqiPieces = [
  'red_general','red_advisor','red_elephant','red_chariot','red_horse','red_cannon','red_soldier',
  'black_general','black_advisor','black_elephant','black_chariot','black_horse','black_cannon','black_soldier',
];
check(xiangqiPieces.every((piece) => exists(`assets/xiangqi/${piece}.png`)), 'all 14 Xiangqi pieces are PNG');
check(xiangqiPieces.every((piece) => !exists(`assets/xiangqi/${piece}.webp`)), 'old Xiangqi WebP piece payloads are removed');
const manifest = JSON.parse(read('assets/xiangqi/asset-manifest.json'));
check(xiangqiPieces.every((piece) => manifest[piece]?.format === 'png' && /^[a-f0-9]{64}$/.test(manifest[piece]?.sha256 || '')), 'Xiangqi asset manifest records PNG format and hashes');

const chessPieces = ['wk','wq','wr','wb','wn','wp','bk','bq','br','bb','bn','bp'];
check(chessPieces.every((piece) => exists(`assets/images/chess/pieces-png-default/${piece}.png`)), 'all Chess PNG pieces remain');
const sounds = ['move-check','premove','game-end','castle','move-opponent','illegal','tenseconds','move-self','capture','game-start','promote'];
check(sounds.every((sound) => exists(`assets/audio/board-game/${sound}.mp3`)), 'all 11 Chess/Xiangqi board-game sounds remain');

const botTest = read('src/app/(internal)/board-game-bot-test.tsx');
check(botTest.includes('CHESS_EVENTS.testBotChallenge') && botTest.includes('XIANGQI_EVENTS.testBotChallenge'), 'existing Developer Tools Bloom Bot protocol test remains');
check(exists('src/services/chess/chessSocketService.ts') && exists('src/services/xiangqi/xiangqiSocketService.ts'), 'low-level Chess/Xiangqi realtime transports remain');
check(read('server/src/socket/socketServer.ts').includes('sessionRecover'), 'Chess server protocol remains intact');
check(read('server/src/xiangqi/xiangqiSocket.ts').includes('sessionRecover'), 'Xiangqi server protocol remains intact');
check(pkg.scripts?.['phaseP2_33:check']?.includes('test-phase-p2_33-persistent-full-mini-presentation.js'), 'P2.33 package regression command is registered');
check(cleanApply.includes('phaseP2_33:check'), 'CLEAN APPLY runs the P2.33 presentation gate');
check(cleanApply.includes('assets\\xiangqi\\*.webp'), 'copy-over cleanup removes obsolete Xiangqi WebP payloads');
check(!/legacyDirs[\s\S]*'src\/components\/games'/.test(overlayCleanup), 'overlay cleanup no longer deletes the new presentation components directory');

console.log(`\nP2.33 Full/Mini Presentation: ${passed}/${passed + failed} PASS`);
process.exit(failed ? 1 : 0);
