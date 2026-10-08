const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
let pass = 0, fail = 0;
function check(label, ok, detail = '') {
  if (ok) console.log(`PASS ${String(++pass).padStart(2,'0')} - ${label}`);
  else { fail++; console.log(`FAIL ${String(pass+fail).padStart(2,'0')} - ${label}${detail ? ` :: ${detail}` : ''}`); }
}

const perfConst = read('src/constants/performanceTest.ts');
const buildMode = read('src/constants/buildMode.ts');
const rootLayout = read('src/app/_layout.tsx');
const phase17_9aChess = fs.existsSync(path.join(root, 'src/components/chess/ChessSurfaceHost.tsx')) && read('package.json').includes('phase17_9a:check');
const phase17_9a9Server = read('package.json').includes('phase17_9a9:check') && fs.existsSync(path.join(root, 'server/src/chess/rematchProposalStore.ts'));
const home = read('src/app/(tabs)/index.tsx');
const play = read('src/app/(tabs)/play.tsx');
const settings = read('src/app/(profile)/settings.tsx');
const tools = read('src/app/(internal)/developer-tools.tsx');
const graphTest = read('src/app/(internal)/performance-graph-test.tsx');
const dataTest = read('src/app/(internal)/performance-data-test.tsx');
const gamePerf = read('src/services/games/gameRuntimePerf.ts');
const tabRuntime = read('src/context/TabRuntimeContext.tsx');
const notifications = read('src/app/(activity)/(notifications)/notifications.tsx');
const notificationPrefs = read('src/app/(activity)/(notifications)/notification-preferences.tsx');
const pkg = JSON.parse(read('package.json'));
const pre = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const post = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const cleanup = read('scripts/setup/cleanup-overlay-routes.js');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
const readme = read('COPY_OVER_README.txt');

check('Internal tools remain behind __DEV__ build boundary', buildMode.includes('__DEV__') && perfConst.includes('INTERNAL_TOOLS_ENABLED'));
check('Dedicated developer email is exact', perfConst.includes('FAMILY_BLOOM_DEV_EMAIL = "huynh235@gmail.com"'));
check('Developer account predicate requires internal build AND exact email', /INTERNAL_TOOLS_ENABLED\s*&&/.test(perfConst) && /toLowerCase\(\)\s*===\s*FAMILY_BLOOM_DEV_EMAIL/.test(perfConst));
check('Home avatar opens Settings', home.includes('router.push("/settings" as never)'));
check('Root stack registers Settings', rootLayout.includes('name="(profile)/settings"'));
check('Root stack registers Developer Tools', rootLayout.includes('name="(internal)/developer-tools"'));
check('Settings exposes Developer Tools only through strict account predicate', settings.includes('isPerformanceTestAccount(user?.email)') && settings.includes('showDeveloperTools&&'));
check('Settings groups developer tools under one entry', settings.includes('Kiểm thử & chẩn đoán') && settings.includes("router.push('/developer-tools' as never)"));
check('Developer Tools self-guards direct/deep-link access', tools.includes('isPerformanceTestAccount(user?.email)') && tools.includes("router.replace('/settings' as never)"));
check('Developer Tools groups performance/load tests', tools.includes('Hiệu năng & tải') && tools.includes('Đo tương tác JS trong 60 giây') && tools.includes('Graph RAM · 500 người'));
check('Developer Tools groups Android notification tests', tools.includes('Thông báo Android') && tools.includes('Một thông báo thử') && tools.includes('Bộ 9 thông báo đầy đủ'));
check('Developer Tools groups game diagnostics', tools.includes('Game') && tools.includes('Bật đo game') && tools.includes('Mở Cờ vua realtime') && tools.includes('Mở Cờ tướng'));
check('Nhà Mình no longer contains Performance card/runner controls', !/Performance|Hiệu năng|phase17|Guided|RUNNER/i.test(play));
check('Normal notification preferences no longer schedules a test notification', !notificationPrefs.includes('scheduleTest(') && !notificationPrefs.includes('sendLocalTest'));
check('Normal notification center has no test scheduling code', !notifications.includes('scheduleFullTestSuite') && !notifications.includes('scheduleTest('));
check('Family Fund runtime contains no embedded mock/simulation dataset', !read('src/app/(home)/(fund)/home-fund.tsx').includes('makeMockFundTransactions') && !read('src/services/home/homeFundService.ts').includes('makeMockStats'));
check('Home Games runtime contains no simulated-session helper', !read('src/services/home/homeGameService.ts').includes('simulated('));
check('Chess user-facing copy no longer labels the bot as a test', !read('src/app/(chess)/chess-lobby.tsx').includes('Test thách đấu') && !read('src/app/(chess)/chess-history.tsx').includes('Thử nghiệm'));

const retired = [
  'src/app/(internal)/performance-test.tsx',
  'src/components/system/AppWidePerformanceDriver.tsx',
  'src/components/system/GuidedPerformanceOverlay.tsx',
  'src/services/performance/appWidePerformanceService.ts',
  'src/services/performance/finalPerformanceGateService.ts',
  'src/services/performance/automatedRegressionService.ts',
];
for (const file of retired) check(`Retired performance runtime absent: ${file}`, !exists(file));

check('Root layout no longer mounts app-wide performance driver/profiler', !rootLayout.includes('AppWidePerformanceDriver') && !rootLayout.includes('performanceTestService') && !rootLayout.includes('<Profiler'));
check('Five-tab runtime no longer publishes global diagnostic snapshot', !tabRuntime.includes('__FAMILY_BLOOM_TAB_RUNTIME__'));
check('Game diagnostics are disabled by default', gamePerf.includes('let enabled=false'));
check('Game diagnostics require explicit setEnabled', gamePerf.includes('setEnabled(value:boolean)') && gamePerf.includes('if(!enabled)return'));
check('Game global diagnostic snapshot is deleted when disabled', gamePerf.includes('delete (globalThis') && gamePerf.includes('__FAMILY_BLOOM_GAME_PERF__'));
check('Developer Tools is the only UI owner of game diagnostic toggle', tools.includes('gameRuntimePerf.setEnabled(next)'));
check('Graph RAM test is strict-account gated', graphTest.includes('isPerformanceTestAccount(user?.email)') && graphTest.includes("router.replace(\"/settings\" as never)"));
check('Data stress test is strict-account gated', dataTest.includes('isPerformanceTestAccount(user?.email)') && dataTest.includes("router.replace(\"/settings\" as never)"));
check('Reusable graph/data tests remain internal Root Stack routes', rootLayout.includes('(internal)/performance-graph-test') && rootLayout.includes('(internal)/performance-data-test'));

const scripts = pkg.scripts || {};
check('Phase 17.6 package gate exists', scripts['phase17_6:check'] === 'node ./scripts/test-phase17_6-clean-developer-tools.js');
check('Retired runner package gates removed', !Object.keys(scripts).some((k) => /^phase17_(?:2|3|4|5)/.test(k) || /^phase15b/.test(k)));
check('Post-copy updater runs clean 17.6 gate', post.includes('run phase17_6:check') || post.includes('test-phase17_6-clean-developer-tools.js'));
check('Post-copy updater does not run retired runner gates', !/phase17_(?:2|3|4|5)|phase15b/.test(post));
check('Android Debug build runs clean 17.6 gate', debugBat.includes('npm run phase17_6:check'));
check('Android Release build runs clean 17.6 gate', releaseBat.includes('npm run phase17_6:check'));
check('Android builds do not run retired runner gates', !/phase17_(?:2|3|4|5)|phase15b/.test(debugBat) && !/phase17_(?:2|3|4|5)|phase15b/.test(releaseBat));
check('Pre-copy removes retired runner/HUD and 17.5C report', pre.includes('AppWidePerformanceDriver.tsx') && pre.includes('GuidedPerformanceOverlay.tsx') && pre.includes('PHASE_17_5C_BUILD_REPORT.md'));
check('Overlay cleanup removes retired runner/HUD', cleanup.includes('AppWidePerformanceDriver.tsx') && cleanup.includes('GuidedPerformanceOverlay.tsx') && cleanup.includes('appWidePerformanceService.ts'));
check('Overlay cleanup only deletes JS shadows with matching TS/TSX', cleanup.includes("fs.existsSync(`${stem}.ts`)") && cleanup.includes("fs.existsSync(`${stem}.tsx`)"));
check('Developer Tools remains Settings-only by production behavior', settings.includes('isPerformanceTestAccount(user?.email)') && settings.includes('Kiểm thử & chẩn đoán') && tools.includes("router.replace('/settings' as never)"));
check('Root Family Bloom gitignore remains bundled', exists('.gitignore'));

const protectedHashes = {
  'src/components/chess/ChessBoard.tsx': 'e8314cceb1ef310380598655c8381a0cc08a58a45a6a75112c19eac036ad5f59',
  'src/components/chess/v2/ChessPiece.tsx': '7c21b248c6eb86ced1b6fd95e83b9db53831c47c0620e75f25a62a9f372dd40e',
  'src/app/(chess)/chess-game/[gameId].tsx': 'ece20f30f945dc69fb2b818a2b15163e8b98ed3a8b515dacb44807d3e5bde1bd',
  'src/components/xiangqi/XiangqiGameBoard.tsx': 'a7182cc98c97b299d6a40ea83765230b163f0cc6c921f8792d618967f9e61f93',
  'src/app/(xiangqi)/xiangqi-preview.tsx': 'cc1a43c20ef21e3e434f9c9c0c306b08ea09f62bf897f010ee30a413c096c71d',
  'server/src/socket/socketServer.ts': 'dd60cbc1345d5e3f577b32f1265646ae51f24c3d6ba12ac6a4935da38a1efd07',
  'firestore.rules': 'a872b09e20259f22e04e8564d3f0c0722a895235bac2da71bf663c6c8b81222a',
  'firestore.indexes.json': 'b88b9fab1c5db94017e0d1744abf0d1ca98979ef86bdefa2e6831fc0e49d429f',
};
for (const [file, expected] of Object.entries(protectedHashes)) check(`Protected baseline hash unchanged: ${file}`, (phase17_9aChess && ['src/components/chess/ChessBoard.tsx','src/components/chess/v2/ChessPiece.tsx','src/app/(chess)/chess-game/[gameId].tsx'].includes(file)) || (phase17_9a9Server && file === 'server/src/socket/socketServer.ts') || sha(file) === expected, phase17_9aChess ? '17.9A Chess architecture supersedes historical hash' : sha(file));

console.log(`\nPhase 17.6 clean Developer Tools gate: ${pass}/${pass + fail} PASS`);
if (fail) process.exit(1);
