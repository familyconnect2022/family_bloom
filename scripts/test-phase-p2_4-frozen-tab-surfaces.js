const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass = 0, fail = 0;
function check(label, condition, detail = '') {
  const n = String(pass + fail + 1).padStart(2, '0');
  if (condition) { pass++; console.log(`PASS ${n} - ${label}`); }
  else { fail++; console.log(`FAIL ${n} - ${label}${detail ? ` :: ${detail}` : ''}`); }
}

console.log('\nP2.4 — Frozen Tab Surfaces / Hard Render Isolation\n');

const tabs = read('src/app/(tabs)/_layout.tsx');
const runtime = read('src/context/TabRuntimeContext.tsx');
const rootLayout = read('src/app/_layout.tsx');
const motion = read('src/constants/motion.ts');
const music = read('src/context/HomeMusicPlayerContext.tsx');
const chessSurfaceStore = read('src/services/chess/chessSurfaceStore.ts');
const pkg = JSON.parse(read('package.json'));
const post = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
const mainTabs = [
  'src/app/(tabs)/index.tsx',
  'src/app/(tabs)/moments.tsx',
  'src/app/(tabs)/planner.tsx',
  'src/app/(tabs)/family.tsx',
  'src/app/(tabs)/play.tsx',
];

const phaseP2_5 = pkg.scripts?.['phaseP2_5:check'] === 'node ./scripts/test-phase-p2_5-visual-ready-no-reload.js';
const phaseP2_7 = pkg.scripts?.['phaseP2_7:check'] === 'node ./scripts/test-phase-p2_7-hard-isolated-tabbar-branch-visual-ready.js';
check('Tab surfaces stay attached after first mount', tabs.includes('detachInactiveScreens={false}') && (phaseP2_5 ? tabs.includes('lazy: true') : tabs.includes('lazy: false')));
check('Inactive tab screens are hard-frozen instead of re-rendering', tabs.includes('freezeOnBlur: true'));
check('Tab switch no longer animates two full feature scenes', tabs.includes('animation: BLOOM_MOTION.tabs.animation') && /tabs:[\s\S]{0,180}animation: "none"/.test(motion));
check('No full-scene interpolator remains', !tabs.includes('sceneStyleInterpolator:'));
check('No full-scene transitionSpec remains', !tabs.includes('transitionSpec:'));
check('Tab bar keeps its isolated SharedValue response', phaseP2_7
  ? tabs.includes('const visualTargetIndex = useSharedValue(initialIndex)') && tabs.includes('const indicatorIndex = useSharedValue(initialIndex)') && tabs.includes('function PersistentBloomTabBarHost()')
  : tabs.includes('const visualTargetIndex = useSharedValue(state.index)') && tabs.includes('const indicatorIndex = useSharedValue(state.index)'));
check('Touch-down still avoids navigation/lifecycle work', (() => {
  const a = tabs.slice(tabs.indexOf('const onPressInIndex'), tabs.indexOf('const onPressIndex'));
  return a.includes('visualTargetIndex.value = index') && !a.includes('navigate(') && !a.includes('restoreFocus(') && !a.includes('setNavigatorFocused(');
})());
check('Runtime active-tab ownership is committed by tiny tabbar bridge', tabs.includes('tabRuntime.restoreFocus(tabId)') && (phaseP2_7 ? tabs.includes('function TabNavigatorControllerBridge') : tabs.includes('runtimeTabIdForRoute(activeRouteName)')));
check('Parent Stack visibility is owned by one tiny navigator bridge', tabs.includes('function TabNavigatorFocusBridge()') && tabs.includes('tabRuntime.setNavigatorFocused(true)') && tabs.includes('tabRuntime.setNavigatorFocused(false)'));
check('Only the tab layout owns useFocusEffect in the tab tree', (tabs.match(/useFocusEffect\(/g) || []).length === 1);

for (const file of mainTabs) {
  const source = read(file);
  check(`${file} no longer subscribes heavy screen tree to navigation focus`, !source.includes('useTabRuntime(') && !source.includes('useFocusEffect('));
}

check('Runtime remembers Tabs navigator visibility separately from active tab', runtime.includes('private navigatorFocused = false'));
check('Hidden Tabs workspace suspends every feature runtime without unmounting state', runtime.includes('setNavigatorFocused = (focused: boolean) =>') && runtime.includes('this.transition(tabId, "suspended"'));
check('Active tab cannot wake while parent Tabs navigator is hidden', runtime.includes('if (!this.navigatorFocused) return;'));
check('App foreground restores live work only when Tabs navigator itself is visible', runtime.includes('if (this.navigatorFocused && this.focusedTab) this.focus(this.focusedTab);'));
check('Controller exposes navigator visibility without exposing React state', runtime.includes('setNavigatorFocused: store.setNavigatorFocused'));

const routeGateStart = rootLayout.indexOf('const RootRouteGate');
const rootNavigatorStart = rootLayout.indexOf('const RootNavigator');
const familySessionStart = rootLayout.indexOf('function FamilySession');
const routeGate = rootLayout.slice(routeGateStart, rootNavigatorStart);
const rootNavigator = rootLayout.slice(rootNavigatorStart, familySessionStart);
check('useSegments route churn is isolated inside RootRouteGate', routeGate.includes('useSegments()') && !rootNavigator.includes('useSegments()'));
check('Root Stack tab-startup readiness follows current successor', phaseP2_5 ? (rootNavigator.includes('useTabStartup()') && rootNavigator.includes('firstVisualReady')) : !rootNavigator.includes('useTabStartup()'));
check('Root Navigator keeps Stack as sibling of route gate, not child of it', rootNavigator.includes('<RootRouteGate') && rootNavigator.includes('{navigationStack}'));
check('Tab route changes cannot directly rebuild the Root Stack through segments', !rootNavigator.includes('rootSegment') && !rootNavigator.includes('segments['));
check('Transient routes freeze the entire Tabs workspace underneath', rootLayout.includes('<Stack.Screen name="(tabs)" options={{ freezeOnBlur: true }} />'));
check('High-frequency music progress cannot churn controls-only consumers', music.includes('const controlsValue = useMemo(() => ({ currentTrack, playTrack })') && music.includes('<HomeMusicPlayerControlsContext.Provider value={controlsValue}>'));
check('Tabbar subscribes only to the root presentation rail, not feature React snapshots', tabs.includes('subscribeBloomSurfaceRail') && tabs.includes('getBloomSurfaceRailState') && !tabs.includes('useChessSurfaceState()') && !tabs.includes('useChessSurfaceMode()'));

for (const file of ['src/app/(tabs)/_layout.tsx', 'src/context/TabRuntimeContext.tsx', 'src/app/_layout.tsx', 'src/context/HomeMusicPlayerContext.tsx', 'src/services/chess/chessSurfaceStore.ts', ...mainTabs]) {
  const out = ts.transpileModule(read(file), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    reportDiagnostics: true,
    fileName: file,
  });
  const errors = (out.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  check(`Syntax clean: ${file}`, errors.length === 0, errors.slice(0, 2).map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' ')).join(' | '));
}

check('P2.4 gate is registered in package scripts', pkg.scripts?.['phaseP2_4:check'] === 'node ./scripts/test-phase-p2_4-frozen-tab-surfaces.js');
check('Post-copy updater runs P2.4 gate', post.includes('test-phase-p2_4-frozen-tab-surfaces.js'));
check('Android Debug build runs P2.4 gate', debugBat.includes('phaseP2_4:check'));
check('Android Release build runs P2.4 gate', releaseBat.includes('phaseP2_4:check'));

console.log(`\nFamily Bloom P2.4 Frozen Tab Surfaces: ${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
