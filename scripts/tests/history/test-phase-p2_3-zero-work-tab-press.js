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

console.log('\nP2.3 — Zero-Work Tab Press\n');

const tabs = read('src/app/(tabs)/_layout.tsx');
const runtime = read('src/context/TabRuntimeContext.tsx');
const pkg = JSON.parse(read('package.json'));
const phaseP2_4 = pkg.scripts?.['phaseP2_4:check'] === 'node ./scripts/test-phase-p2_4-frozen-tab-surfaces.js';
const phaseP2_7 = pkg.scripts?.['phaseP2_7:check'] === 'node ./scripts/tests/history/test-phase-p2_7-hard-isolated-tabbar-branch-visual-ready.js';
const post = read('scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat');
const debugBat = read('scripts/android/dev/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat');

const pressIn = tabs.slice(tabs.indexOf('const onPressInIndex'), tabs.indexOf('const onPressIndex'));
const press = tabs.slice(tabs.indexOf('const onPressIndex'), tabs.indexOf('const onLongPressIndex'));
const buttonEnd = tabs.indexOf('function PersistentBloomTabBarHost');
const button = tabs.slice(tabs.indexOf('const BloomTabButton'), buttonEnd > 0 ? buttonEnd : undefined);

check('Touch-down owns a dedicated visual SharedValue target',
  (phaseP2_7 ? tabs.includes('const visualTargetIndex = useSharedValue(initialIndex)') : tabs.includes('const visualTargetIndex = useSharedValue(state.index)')) &&
  pressIn.includes('visualTargetIndex.value = index'));
check('Touch-down retargets the pill on the UI thread', pressIn.includes('animateIndicatorTo(index)'));
check('Touch-down path does not mutate tab lifecycle ownership',
  !pressIn.includes('prepareFocus') && !pressIn.includes('restoreFocus') && !pressIn.includes('beginInteraction'));
check('Touch-down path does not navigate or emit navigation events',
  !pressIn.includes('navigation.navigate') && !pressIn.includes('navigation.emit') && !pressIn.includes('navigationRef'));
check('Route commit is explicitly deferred beyond the touch frame',
  phaseP2_7
    ? press.includes('commitDelayMs') && press.includes('setTimeout(() =>') && press.includes('pendingCommitDelayRef.current + 8')
    : tabs.includes('scheduleTabCommitNextFrame(() =>') && tabs.includes('globalThis.requestAnimationFrame'));
check('Latest released tap invalidates stale deferred commits',
  tabs.includes('commitGenerationRef') && press.includes('commitGenerationRef.current !== generation'));
check('Lifecycle pre-commit prepareFocus is removed from tab press path',
  !press.includes('prepareFocus(') && !tabs.includes('tabRuntime.prepareFocus('));
check('Low-priority work is blocked only in deferred commit phase',
  press.includes('tabRuntime.beginInteraction(') && (phaseP2_7 ? press.includes('persistentTabBarController.press(index)') : press.indexOf('tabRuntime.beginInteraction(') < press.indexOf('currentNavigation.navigate(route.name)')));
check('Prevented tab press rolls visual target back without fake runtime ownership',
  phaseP2_7
    ? press.includes('result.prevented') && press.includes('visualTargetIndex.value = result.committedIndex') && !press.includes('restoreFocus(')
    : press.includes('event.defaultPrevented') && press.includes('visualTargetIndex.value = currentState.index') && !press.includes('restoreFocus('));
check('Single icon visual color is SharedValue-driven instead of navigation-state-driven',
  button.includes('visualTargetIndex.value === index ? COLORS.white : COLORS.tabInactive') &&
  !button.includes('focused ? COLORS.white : COLORS.tabInactive'));
check('Tab buttons are memoized so navigation commit does not redraw all five glyphs',
  tabs.includes('const BloomTabButton = memo(function BloomTabButton'));
check('Exactly one glyph component is rendered by each tab button',
  ((button.match(/<AnimatedIonicons/g) || []).length === 1) && ((button.match(/<Ionicons/g) || []).length === 0));
check('Outgoing surface freeze spans the visual handoff',
  runtime.includes('export const TAB_HANDOFF_FREEZE_MS = 176') && (phaseP2_4 ? tabs.includes('freezeOnBlur: true') : tabs.includes('const TAB_SCENE_MOTION_MS = 152')));
check('Outgoing blur schedules WARM after handoff instead of notifying immediately',
  runtime.includes('this.scheduleMoveToWarm(tabId);') && runtime.includes('private scheduleMoveToWarm(tabId: MainTabId)'));
check('Rapid tap-back cancels outgoing freeze and reuses ACTIVE surface',
  runtime.includes('const wasFrozenOutgoing = this.handoffTimers.has(tabId)') &&
  runtime.includes('if (wasFrozenOutgoing && this.appActive && currentAtFocus.state === "active") return;'));
check('Incoming surface still delays live work until after scene motion',
  runtime.includes('export const TAB_RESTORE_DELAY_MS = 210') && runtime.includes('this.scheduleRestore(tabId)'));
check('App background clears handoff timers too',
  runtime.includes('this.handoffTimers.forEach((timer) => clearTimeout(timer))') && runtime.includes('this.handoffTimers.clear()'));

for (const file of ['src/app/(tabs)/_layout.tsx', 'src/context/TabRuntimeContext.tsx']) {
  const out = ts.transpileModule(read(file), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    reportDiagnostics: true,
    fileName: file,
  });
  check(`Syntax clean: ${file}`, !(out.diagnostics || []).some((d) => d.category === ts.DiagnosticCategory.Error));
}

check('P2.3 gate is registered in package scripts', pkg.scripts?.['phaseP2_3:check'] === 'node ./scripts/tests/history/test-phase-p2_3-zero-work-tab-press.js');
check('Post-copy updater runs P2.3 gate', post.includes('test-phase-p2_3-zero-work-tab-press.js'));
check('Android Debug build runs P2.3 gate', debugBat.includes('phaseP2_3:check'));
check('Android Release build runs P2.3 gate', releaseBat.includes('phaseP2_3:check'));

console.log(`\nFamily Bloom P2.3 Zero-Work Tab Press: ${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
