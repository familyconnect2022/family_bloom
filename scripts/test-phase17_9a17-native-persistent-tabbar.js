const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
let pass = 0, fail = 0;
function check(label, cond, detail='') {
  const n = String(pass + fail + 1).padStart(2,'0');
  if (cond) { pass++; console.log(`PASS ${n} - ${label}`); }
  else { fail++; console.log(`FAIL ${n} - ${label}${detail ? ` :: ${detail}` : ''}`); }
}

const tabs = read('src/app/(tabs)/_layout.tsx');
const moments = read('src/app/(tabs)/moments.tsx');
const pkg = JSON.parse(read('package.json'));
const post = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
const button = tabs.slice(tabs.indexOf('function BloomTabButton'), tabs.indexOf('function BloomSlidingTabBar'));

check('Inactive native tab screens are explicitly kept attached', tabs.includes('detachInactiveScreens={false}'));
check('All five main tab React surfaces stay eagerly mounted', tabs.includes('lazy: false'));
check('No freeze-on-blur regression is introduced', !tabs.includes('freezeOnBlur: true'));
check('Screen transition itself remains disabled', tabs.includes('animation: BLOOM_MOTION.tabs.animation'));
check('Tab visual motion remains one SharedValue source', tabs.includes('const indicatorIndex = useSharedValue(state.index)') && tabs.includes('indicatorIndex.value = withTiming(index'));
check('Indicator still uses the same SharedValue', tabs.includes('indicatorIndex.value * itemWidth'));
check('Each tab button receives the indicator SharedValue', tabs.includes('indicatorIndex: SharedValue<number>') && button.includes('indicatorIndex,'));
check('Each tab renders exactly two visual glyph layers', (button.match(/<Ionicons/g)||[]).length === 2);
check('Two glyphs live inside one fixed 26x26 layout slot', tabs.includes('width: TAB_ICON_SIZE') && tabs.includes('height: TAB_ICON_SIZE') && tabs.includes('top: (58 - TAB_ICON_SIZE) / 2'));
check('Both glyph layers are absolute and cannot push each other', tabs.includes('tabIconLayer:') && tabs.includes('...StyleSheet.absoluteFillObject'));
check('Active and inactive glyphs have fixed colors, not React focused color switching', tabs.includes('color={COLORS.white}') && tabs.includes('color={COLORS.tabInactive}') && !button.includes('focused ? COLORS.white : COLORS.tabInactive'));
check('Both visual layers interpolate from indicatorIndex on UI thread', (button.match(/Math\.abs\(indicatorIndex\.value - index\)/g)||[]).length >= 2 && button.includes('interpolate(') && button.includes('Extrapolation.CLAMP'));
check('Icon scale is transform-only and cannot affect layout geometry', button.includes('transform: [{ scale }]'));
check('Pill geometry remains exactly A16 50x36 at y=11', tabs.includes('const TAB_INDICATOR_WIDTH = 50') && tabs.includes('const TAB_INDICATOR_HEIGHT = 36') && /slidingIndicator:[\s\S]{0,100}top: 11/.test(tabs));
check('Tab row geometry remains exactly 58px', tabs.includes('height: 58') && tabs.includes('height: 58 + bottomInset'));
check('Optimistic press-in still starts motion before navigation commit', tabs.includes('onPressIn={onPressIn}') && tabs.includes('animateIndicatorTo(index)'));
check('Navigation state does not restart an accepted tab animation', tabs.includes('if (optimisticIndexRef.current === state.index) return'));
check('Moments focus-wide render is deferred beyond 232ms tab motion', moments.includes('screenFocusGateTimerRef') && (moments.match(/}, 280\);/g)||[]).length >= 2);
check('Moments no longer resumes visible-card realtime on the next animation frame', !/useFocusEffect\([\s\S]{0,450}requestAnimationFrame/.test(moments));
check('Moments focus timers are canceled on unmount/rapid switches', moments.includes('clearTimeout(screenFocusGateTimerRef.current)') && moments.includes('screenFocusMountedRef.current'));

const protectedHashes = {
  'src/components/chess/ChessBoard.tsx':'a5e09a317a2f3eee9ac27c171b925c021c6270fc87e14601852ff14f7ba48eac',
  'src/components/chess/ChessSurfaceHost.tsx':'e99d8435c5b8dde50c1ba77259afa53888b78863b54444cc0f9db09c45eb98a0',
  'src/components/xiangqi/XiangqiGameBoard.tsx':'8885b9034c4f9366c6b75ce3256a6a9cbc5ff3ad07c56d2bd06746d66b1f15d3',
  'src/app/(xiangqi)/xiangqi-preview.tsx':'4486e90f481118461b1562f1130c4d66d64293b665d1dea10d9b0bccfd47906f',
  'server/src/socket/socketServer.ts':'c0d46d5e343d323effc0a06fef64f1cf424b2f27e38dbf080a66c0a00d6dd63a',
  'server/src/xiangqi/xiangqiGameManager.ts':'bacf1a3e73a81bdcdeecce9f215fae124b4dcd1a5f66ac243e8d5f3a9f9aa3ed',
  'firestore.rules':'a872b09e20259f22e04e8564d3f0c0722a895235bac2da71bf663c6c8b81222a',
  'firestore.indexes.json':'b88b9fab1c5db94017e0d1744abf0d1ca98979ef86bdefa2e6831fc0e49d429f',
};
for (const [file, expected] of Object.entries(protectedHashes)) {
  check(`A16 game/server baseline unchanged: ${file}`, sha(file) === expected, sha(file));
}

for (const file of ['src/app/(tabs)/_layout.tsx','src/app/(tabs)/moments.tsx']) {
  const out = ts.transpileModule(read(file), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }, reportDiagnostics: true, fileName: file });
  check(`Syntax clean: ${file}`, !(out.diagnostics||[]).some((d) => d.category === ts.DiagnosticCategory.Error));
}

check('A17 package gate is registered', pkg.scripts?.['phase17_9a17:check'] === 'node ./scripts/test-phase17_9a17-native-persistent-tabbar.js');
check('Post-copy updater runs A17 gate', post.includes('test-phase17_9a17-native-persistent-tabbar.js'));
check('Debug Android build runs A17 gate', debugBat.includes('npm run phase17_9a17:check'));
check('Release Android build runs A17 gate', releaseBat.includes('npm run phase17_9a17:check'));
check('Current game aggregate includes A17', read('scripts/test-chess-current-build-gates.js').includes('test-phase17_9a17-native-persistent-tabbar.js'));

console.log(`\nPhase 17.9A17 Native-Persistent Tabbar: ${pass}/${pass+fail} PASS`);
process.exit(fail ? 1 : 0);
