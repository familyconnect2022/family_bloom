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

const tabs = read('src/app/(tabs)/_layout.tsx');
const motion = read('src/constants/motion.ts');
const runtime = read('src/context/TabRuntimeContext.tsx');
const budget = read('src/services/performance/uiFrameBudget.ts');
const pkg = JSON.parse(read('package.json'));
const phaseP1_2 = pkg.scripts?.['phaseP1_2:check'] === 'node ./scripts/test-phase-p1_2-opaque-tab-handoff.js';
const phaseP2_3 = pkg.scripts?.['phaseP2_3:check'] === 'node ./scripts/test-phase-p2_3-zero-work-tab-press.js';
const phaseP2_4 = pkg.scripts?.['phaseP2_4:check'] === 'node ./scripts/test-phase-p2_4-frozen-tab-surfaces.js';
const phaseP2_5 = pkg.scripts?.['phaseP2_5:check'] === 'node ./scripts/test-phase-p2_5-visual-ready-no-reload.js';
const phaseP2_7 = pkg.scripts?.['phaseP2_7:check'] === 'node ./scripts/test-phase-p2_7-hard-isolated-tabbar-branch-visual-ready.js';
const post = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const pre = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

check('Visited/preloaded tab surfaces remain attached', tabs.includes('detachInactiveScreens={false}') && (phaseP2_5 ? tabs.includes('lazy: true') : tabs.includes('lazy: false')));
check('Bloom tab motion follows the current handoff architecture', phaseP2_4 ? /tabs:[\s\S]{0,220}animation:\s*"none"/.test(motion) : /tabs:[\s\S]{0,220}animation:\s*"shift"/.test(motion));
check('Scene transition follows the current lightweight handoff', phaseP2_4 ? (tabs.includes('freezeOnBlur: true') && !tabs.includes('transitionSpec:')) : ((tabs.includes('const TAB_SCENE_MOTION_MS = 168') || (phaseP1_2 && tabs.includes('const TAB_SCENE_MOTION_MS = 152'))) && tabs.includes('duration: TAB_SCENE_MOTION_MS')));
check('Scene motion distance remains bounded or removed by P2.4', phaseP2_4 ? !tabs.includes('TAB_SCENE_SHIFT_PX') : (tabs.includes('const TAB_SCENE_SHIFT_PX = 18') || (phaseP1_2 && tabs.includes('const TAB_SCENE_SHIFT_PX = 14'))));
check('Scene geometry work is transform-only or removed by P2.4', phaseP2_4 ? !tabs.includes('sceneStyleInterpolator:') : (tabs.includes('sceneStyleInterpolator: ({ current })') && tabs.includes('translateX: current.progress.interpolate')));
check('Scene continuity is opaque/no-fade in the current successor', phaseP2_4 ? !tabs.includes('sceneStyleInterpolator:') : (tabs.includes('outputRange: [0, 0.965, 1, 0.965, 0]') || (phaseP1_2 && !/sceneStyleInterpolator:[\s\S]{0,900}opacity:/.test(tabs))));
check('No scene width/height/left/top animation is introduced', !/sceneStyleInterpolator:[\s\S]{0,1200}(?:width|height|left|top):\s*current\.progress\.interpolate/.test(tabs));
check('Scene easing is native when needed, or absent with no-scene P2.4', phaseP2_4 ? !tabs.includes('NativeEasing') : (tabs.includes('Easing as NativeEasing') && tabs.includes('NativeEasing.bezier(0.2, 0.78, 0.24, 1)')));
check('Tab pill still stays on Reanimated SharedValue', (phaseP2_7 ? tabs.includes('useSharedValue(initialIndex)') : tabs.includes('useSharedValue(state.index)')) && tabs.includes('withTiming(index') && tabs.includes('Easing as ReanimatedEasing'));
check('Latest requested tab has explicit optimistic ownership', tabs.includes('const latestRequestedIndexRef = useRef<number | null>(null)'));
check('Press-in retargets latest request before navigation commit', tabs.includes('latestRequestedIndexRef.current = index') && (phaseP2_7 ? tabs.indexOf('latestRequestedIndexRef.current = index') < tabs.indexOf('persistentTabBarController.press(index)') : tabs.indexOf('latestRequestedIndexRef.current = index') < tabs.indexOf('currentNavigation.navigate(route.name)')));
check('Stale intermediate navigation state cannot rewind pill', phaseP2_7 ? (tabs.includes('if (latestRequested != null)') && tabs.includes('if (latestRequested === index)') && tabs.includes('return;')) : (tabs.includes('if (latestRequested != null)') && tabs.includes('if (state.index === latestRequested)') && tabs.includes('return;')));
check('Latest tap can reassert the stale state-focused tab', phaseP2_7 ? (tabs.includes('commitGenerationRef') && tabs.includes('clearTimeout(pendingCommitTimerRef.current)') && tabs.includes('persistentTabBarController.getCommittedIndex()')) : (tabs.includes('forceCommitIndexRef') && (tabs.includes('const shouldNavigate = !focused || forceCommit') || tabs.includes('const shouldNavigate = currentState.index !== index || forceCommit')) && (tabs.includes('state.index === index && optimisticIndex !== index') || tabs.includes('currentState.index === index && optimisticIndex !== index'))));
check('Prevented navigation clears optimistic target and restores accepted visual state', tabs.includes('latestRequestedIndexRef.current = null') && (phaseP2_7 ? tabs.includes('visualTargetIndex.value = result.committedIndex') : (phaseP2_3 ? tabs.includes('visualTargetIndex.value = currentState.index') : tabs.includes('tabRuntime.restoreFocus'))));
check('UI critical window covers the current visual handoff', (phaseP2_7 ? tabs.includes('TAB_MOTION_MAX_MS + 64') : (phaseP2_4 ? tabs.includes('TAB_MOTION_MS + 64') : (tabs.includes('TAB_SCENE_MOTION_MS + 64') || (phaseP2_3 && tabs.includes('TAB_SCENE_MOTION_MS + 96'))))) && budget.includes('beginUiCriticalWindow'));
const p11LifecycleOk = phaseP2_7
  ? !tabs.includes('tabRuntime.prepareFocus(') && tabs.includes('tabRuntime.beginInteraction(') && tabs.indexOf('tabRuntime.beginInteraction(') < tabs.indexOf('persistentTabBarController.press(index)')
  : phaseP2_3
  ? !tabs.includes('tabRuntime.prepareFocus(') && tabs.includes('tabRuntime.beginInteraction(') && tabs.indexOf('tabRuntime.beginInteraction(') < tabs.indexOf('currentNavigation.navigate(route.name)')
  : tabs.indexOf('tabRuntime.prepareFocus') < tabs.indexOf('navigation.emit({ type: \"tabPress\"');
check('Lifecycle preparation follows current handoff architecture', p11LifecycleOk);
check('Runtime still delays heavy live work until restore window', runtime.includes('export const TAB_RESTORE_DELAY_MS = 210') && runtime.includes('this.scheduleRestore(tabId)'));
{ const end=phaseP2_7?tabs.indexOf('function PersistentBloomTabBarHost'):tabs.indexOf('function BloomSlidingTabBar'); const bs=tabs.slice(Math.max(0,tabs.indexOf('const BloomTabButton')), end); check('Single-glyph A18 tab architecture remains intact', phaseP2_3 ? (bs.match(/<AnimatedIonicons/g)||[]).length===1 : (bs.match(/<Ionicons/g)||[]).length===1); }
check('Tab pill geometry remains 50x36', tabs.includes('const TAB_INDICATOR_WIDTH = 50') && tabs.includes('const TAB_INDICATOR_HEIGHT = 36'));
check('P1.1 package gate registered', pkg.scripts?.['phaseP1_1:check'] === 'node ./scripts/test-phase-p1_1-native-feel-tab-surface.js');
check('Post-copy updater runs P1.1 gate', post.includes('test-phase-p1_1-native-feel-tab-surface.js'));
check('Debug Android build runs P1.1 gate', debugBat.includes('npm run phaseP1_1:check'));
check('Release Android build runs P1.1 gate', releaseBat.includes('npm run phaseP1_1:check'));
check('Pre-copy BAT identifies P1.1/P1.2 or approved P2 successor', /Performance Foundation P1\.[12]|Performance Architecture P2/i.test(pre));

const syntaxFiles = [
  'src/app/(tabs)/_layout.tsx',
  'src/constants/motion.ts',
  'src/context/TabRuntimeContext.tsx',
  'src/services/performance/uiFrameBudget.ts',
];
const syntaxErrors = [];
for (const file of syntaxFiles) {
  const out = ts.transpileModule(read(file), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    reportDiagnostics: true,
    fileName: file,
  });
  for (const d of out.diagnostics || []) {
    if (d.category === ts.DiagnosticCategory.Error) syntaxErrors.push(`${file}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
  }
}
check(`P1.1 changed TS/TSX syntax clean (${syntaxFiles.length} files)`, syntaxErrors.length === 0, syntaxErrors.slice(0, 3).join(' | '));

console.log(`\nFamily Bloom Android Performance Foundation P1.1: ${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
