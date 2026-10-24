const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__legacyScriptsDir, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass = 0, fail = 0;
function check(label, condition, detail = '') {
  const n = String(pass + fail + 1).padStart(2, '0');
  if (condition) { pass++; console.log(`PASS ${n} - ${label}`); }
  else { fail++; console.log(`FAIL ${n} - ${label}${detail ? ` :: ${detail}` : ''}`); }
}

const tabs = read('src/app/(tabs)/_layout.tsx');
const webTabs = read('src/app/(tabs)/_layout.web.tsx');
const motion = read('src/constants/motion.ts');
const runtime = read('src/context/TabRuntimeContext.tsx');
const budget = read('src/services/performance/uiFrameBudget.ts');
const theme = read('src/constants/theme.ts');
const pkg = JSON.parse(read('package.json'));
const phaseP2_3 = pkg.scripts?.['phaseP2_3:check'] === 'node ./scripts/tests/history/test-phase-p2_3-zero-work-tab-press.js';
const phaseP2_4 = pkg.scripts?.['phaseP2_4:check'] === 'node ./scripts/test-phase-p2_4-frozen-tab-surfaces.js';
const phaseP2_5 = pkg.scripts?.['phaseP2_5:check'] === 'node ./scripts/tests/history/test-phase-p2_5-visual-ready-no-reload.js';
const phaseP2_7 = pkg.scripts?.['phaseP2_7:check'] === 'node ./scripts/tests/history/test-phase-p2_7-hard-isolated-tabbar-branch-visual-ready.js';
const post = read('scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat');
const pre = read('scripts/android/maintenance/Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const debugBat = read('scripts/android/dev/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat');

check('Visited/preloaded tab surfaces remain attached', tabs.includes('detachInactiveScreens={false}') && (phaseP2_5 ? tabs.includes('lazy: true') : tabs.includes('lazy: false')));
check('Bloom tab motion remains on an approved lightweight handoff', phaseP2_4 ? /tabs:[\s\S]{0,220}animation:\s*"none"/.test(motion) : /tabs:[\s\S]{0,220}animation:\s*"shift"/.test(motion));
check('Scene transition is short or fully removed by P2.4', phaseP2_4 ? (tabs.includes('freezeOnBlur: true') && !tabs.includes('transitionSpec:')) : (tabs.includes('const TAB_SCENE_MOTION_MS = 152') && tabs.includes('duration: TAB_SCENE_MOTION_MS')));
check('Tab pill timing remains bounded in the approved successor', phaseP2_7 ? (tabs.includes('const TAB_MOTION_MIN_MS = 164') && tabs.includes('const TAB_MOTION_MAX_MS = 278')) : tabs.includes('const TAB_MOTION_MS = 152'));
check('Scene travel is micro-shift or removed by P2.4', phaseP2_4 ? !tabs.includes('TAB_SCENE_SHIFT_PX') : tabs.includes('const TAB_SCENE_SHIFT_PX = 14'));
check('Scene interpolator has no opacity animation', !/sceneStyleInterpolator:[\s\S]{0,900}opacity:/.test(tabs));
check('Scene interpolator is transform-only or removed by P2.4', phaseP2_4 ? !tabs.includes('sceneStyleInterpolator:') : (tabs.includes('sceneStyleInterpolator: ({ current })') && tabs.includes('translateX: current.progress.interpolate')));
check('No scene width/height/top/left/padding animation is introduced', !/sceneStyleInterpolator:[\s\S]{0,1200}(?:width|height|top|left|padding):\s*current\.progress\.interpolate/.test(tabs));
check('Navigator root owns Bloom background', /navigatorRoot:\s*\{[^}]*backgroundColor:\s*COLORS\.background/.test(tabs));
check('Every tab scene owns Bloom background', (tabs.includes('sceneStyle: styles.tabScene') || tabs.includes('sceneStyle: [styles.tabScene')) && /tabScene:\s*\{[^}]*backgroundColor:\s*COLORS\.background/.test(tabs));
check('Bloom background token is soft pink and not white', theme.includes("background: '#FFF3F7'"));
check('Native scene easing remains bounded when a scene animation exists', phaseP2_4 ? !tabs.includes('NativeEasing') : tabs.includes('NativeEasing.bezier(0.2, 0.78, 0.24, 1)'));
check('Tab pill remains Reanimated SharedValue timing', (phaseP2_7 ? tabs.includes('useSharedValue(initialIndex)') : tabs.includes('useSharedValue(state.index)')) && tabs.includes('withTiming(index') && (tabs.includes('ReanimatedEasing.bezier(0.2, 0.78, 0.24, 1)') || (phaseP2_7 && tabs.includes('ReanimatedEasing.bezier(0.16, 0.72, 0.22, 1)'))));
check('Latest-tap-wins ownership remains intact', tabs.includes('latestRequestedIndexRef') && (phaseP2_7 ? tabs.includes('commitGenerationRef') && tabs.includes('pendingCommitTimerRef') : tabs.includes('forceCommitIndexRef')));
check('Stale intermediate state cannot rewind pill', phaseP2_7 ? (tabs.includes('if (latestRequested != null)') && tabs.includes('if (latestRequested === index)') && tabs.includes('return;')) : (tabs.includes('if (latestRequested != null)') && tabs.includes('if (state.index === latestRequested)') && tabs.includes('return;')));
check('UI critical window still covers the visual handoff', (phaseP2_7 ? tabs.includes('TAB_MOTION_MAX_MS + 64') : (phaseP2_4 ? tabs.includes('TAB_MOTION_MS + 64') : (tabs.includes('TAB_SCENE_MOTION_MS + 64') || (phaseP2_3 && tabs.includes('TAB_SCENE_MOTION_MS + 96'))))) && budget.includes('beginUiCriticalWindow'));
check('Heavy live work still restores after the 152ms handoff', runtime.includes('export const TAB_RESTORE_DELAY_MS = 210'));
{ const end=phaseP2_7?tabs.indexOf('function PersistentBloomTabBarHost'):tabs.indexOf('function BloomSlidingTabBar'); const bs=tabs.slice(Math.max(0,tabs.indexOf('const BloomTabButton')), end); check('Single-glyph tab architecture remains intact', phaseP2_3 ? (bs.match(/<AnimatedIonicons/g)||[]).length===1 : (bs.match(/<Ionicons/g)||[]).length===1); }
check('Web tabs remain on their dedicated WebTabShell', webTabs.includes('<WebTabShell') && !webTabs.includes('sceneStyleInterpolator'));
check('P1.2 package gate registered', pkg.scripts?.['phaseP1_2:check'] === 'node ./scripts/tests/history/test-phase-p1_2-opaque-tab-handoff.js');
check('Post-copy updater runs P1.2 gate', post.includes('test-phase-p1_2-opaque-tab-handoff.js'));
check('Debug Android build runs P1.2 gate', debugBat.includes('npm run phaseP1_2:check'));
check('Release Android build runs P1.2 gate', releaseBat.includes('npm run phaseP1_2:check'));
check('Pre-copy BAT identifies P1.2 or approved P2 successor', /Performance Foundation P1\.2|Performance Architecture P2/i.test(pre));
check('Post-copy BAT identifies P1.2 or approved P2 successor', /Performance Foundation P1\.2|Performance Architecture P2/i.test(post));

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
check(`P1.2 changed TS/TSX syntax clean (${syntaxFiles.length} files)`, syntaxErrors.length === 0, syntaxErrors.slice(0, 3).join(' | '));

console.log(`\nFamily Bloom Android Performance Foundation P1.2: ${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
