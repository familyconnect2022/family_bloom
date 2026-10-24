const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
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
const runtime = read('src/context/TabRuntimeContext.tsx');
const realtime = read('src/context/FamilyRealtimeContext.tsx');
const membersHook = read('src/hooks/family/useFamilyMembers.ts');
const eventsHook = read('src/hooks/family/useFamilyEvents.ts');
const moments = read('src/app/(tabs)/moments.tsx');
const budget = read('src/services/performance/uiFrameBudget.ts');
const pkg = JSON.parse(read('package.json'));
const clean = read('scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat');
const pre = read('scripts/android/maintenance/Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const debugBat = read('scripts/android/dev/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat');
const phaseP2_3 = pkg.scripts?.['phaseP2_3:check'] === 'node ./scripts/tests/history/test-phase-p2_3-zero-work-tab-press.js';
const phaseP2_4 = pkg.scripts?.['phaseP2_4:check'] === 'node ./scripts/test-phase-p2_4-frozen-tab-surfaces.js';
const phaseP2_5 = pkg.scripts?.['phaseP2_5:check'] === 'node ./scripts/tests/history/test-phase-p2_5-visual-ready-no-reload.js';
const phaseP2_7 = pkg.scripts?.['phaseP2_7:check'] === 'node ./scripts/tests/history/test-phase-p2_7-hard-isolated-tabbar-branch-visual-ready.js';

check('Native tab surfaces remain persistent after first mount', tabs.includes('detachInactiveScreens={false}') && (phaseP2_5 ? tabs.includes('lazy: true') : tabs.includes('lazy: false')));
check('Native tab route motion remains centrally configured', tabs.includes('animation: BLOOM_MOTION.tabs.animation'));
check('Tab press-in opens a UI-critical frame window', tabs.includes('beginUiCriticalWindow') && tabs.includes('TAB_UI_CRITICAL_WINDOW_MS'));
const p1TabLifecycleOk = phaseP2_7
  ? tabs.includes('pendingCommitDelayRef.current + 8') && tabs.includes('persistentTabBarController.press(index)') && !tabs.includes('tabRuntime.prepareFocus(')
  : phaseP2_3
  ? tabs.includes('scheduleTabCommitNextFrame(() =>') && !tabs.includes('tabRuntime.prepareFocus(')
  : (tabs.includes('if (!focused) tabRuntime.prepareFocus(tabIdForRoute(route.name))') || tabs.includes('if (shouldNavigate) tabRuntime.prepareFocus(tabIdForRoute(route.name))'))
    && tabs.indexOf('tabRuntime.prepareFocus') < tabs.indexOf('navigation.emit({ type: \"tabPress\"');
check('Tab press lifecycle strategy matches current architecture', p1TabLifecycleOk);
check('Prevented navigation restores the accepted visual/runtime state', phaseP2_7 ? (tabs.includes('result.prevented') && tabs.includes('visualTargetIndex.value = result.committedIndex') && tabs.includes('tabRuntime.restoreFocus(tabId)')) : (phaseP2_4 ? (tabs.includes('event.defaultPrevented') && tabs.includes('visualTargetIndex.value = currentState.index') && tabs.includes('tabRuntime.restoreFocus(tabId)')) : (phaseP2_3 ? (tabs.includes('event.defaultPrevented') && tabs.includes('visualTargetIndex.value = currentState.index') && !tabs.includes('tabRuntime.restoreFocus(')) : tabs.includes('tabRuntime.restoreFocus(tabIdForRoute(state.routes[state.index]?.name ?? "index"))'))));
check('Runtime exposes pre-commit focus preparation', runtime.includes('prepareFocus = (tabId: MainTabId) =>'));
check('Outgoing tab transitions toward warm using the current handoff policy', phaseP2_3 ? runtime.includes('if (previous && previous !== tabId) this.scheduleMoveToWarm(previous)') : runtime.includes('if (previous && previous !== tabId) this.moveToWarm(previous)'));
check('Navigation focus reuses an already-running restore timer', runtime.includes('this.restoreTimers.has(tabId)'));
check('Heavy screens need not subscribe to the full runtime snapshot', runtime.includes('export function useTabLiveState(tabId: MainTabId)') && runtime.includes('store.getSnapshot(tabId).live'));

check('Frame budget coalesces deferred commits by key', budget.includes('const pending = new Map<string, DeferredCommit>()') && budget.includes('pending.set(key, commit)'));
check('Critical windows extend instead of racing', budget.includes('criticalUntil = Math.max(criticalUntil'));
check('Deferred work drains one commit per frame', budget.includes('function drainOnePerFrame()') && budget.includes('if (pending.size) drainOnePerFrame()'));
check('Disposed realtime owners can cancel deferred commits', budget.includes('export function cancelDeferredUiCommit'));

check('Family members snapshots no longer originate from root during tab critical window', realtime.includes('P2 cache bridge') && (membersHook.includes('useTabLiveEffect') || membersHook.includes('useOptionalTabLiveEffect')));
check('Family moments snapshots no longer originate from root during tab critical window', realtime.includes('P2 cache bridge') && moments.includes('useTabLiveEffect("moments"'));
check('Upcoming-event snapshots are owned by active feature lifecycle', realtime.includes('P2 cache bridge') && eventsHook.includes('useTabLiveEffect'));
check('Yearly-event snapshots are owned by active feature lifecycle', realtime.includes('P2 cache bridge') && eventsHook.includes('calendarService.subscribeYearly'));
check('Root has zero feature realtime channels to defer or clean up', !/watchMembers|subscribeLatest|subscribeUpcoming|subscribeYearly/.test(realtime));

check('Moments no longer owns a feed-wide screenFocused state', !moments.includes('const [screenFocused, setScreenFocused]'));
check('Moments no longer owns focus-gate timers', !moments.includes('screenFocusGateTimerRef') && !moments.includes('screenFocusMountedRef'));
check('Moment rows subscribe only to the live boolean', moments.includes('const screenFocused = useTabLiveState("moments")'));
check('Moment realtime remains viewport-gated', moments.includes('realtimeEnabled={screenFocused && visible}'));
check('Parent renderFeedItem no longer depends on screenFocused', !/renderFeedItem[\s\S]{0,2200}\], \[[^\]]*screenFocused/.test(moments));

check('Root .gitignore remains bundled', fs.existsSync(path.join(root, '.gitignore')));
check('Copy-over cleanup BAT remains bundled', fs.existsSync(path.join(root, 'scripts/android/maintenance/Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat')) && fs.existsSync(path.join(root, 'scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat')));
check('P1 package gate is registered', pkg.scripts?.['phaseP1:check'] === 'node ./scripts/tests/history/test-phase-p1-android-performance-foundation.js');
check('Post-copy updater runs P1 gate', clean.includes('test-phase-p1-android-performance-foundation.js'));
check('Debug Android build runs P1 gate', debugBat.includes('npm run phaseP1:check'));
check('Release Android build runs P1 gate', releaseBat.includes('npm run phaseP1:check'));
check('Pre-copy BAT identifies P1 or approved P2 successor', /Performance Foundation P1|Performance Architecture P2/i.test(pre));

const syntaxFiles = [
  'src/services/performance/uiFrameBudget.ts',
  'src/context/TabRuntimeContext.tsx',
  'src/context/FamilyRealtimeContext.tsx',
  'src/app/(tabs)/_layout.tsx',
  'src/app/(tabs)/moments.tsx',
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
check(`P1 changed TS/TSX syntax clean (${syntaxFiles.length} files)`, syntaxErrors.length === 0, syntaxErrors.slice(0, 3).join(' | '));

// Execute the frame-budget module after a tiny TS->CJS transpile so coalescing
// behavior is covered, not only source shape.
const compiled = ts.transpileModule(budget, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  fileName: 'uiFrameBudget.ts',
}).outputText;
const tmp = path.join(os.tmpdir(), `family-bloom-ui-budget-${process.pid}.cjs`);
fs.writeFileSync(tmp, compiled + `\n;(async()=>{\n const seen=[];\n resetUiFrameBudgetForTests();\n beginUiCriticalWindow(35);\n commitAfterUiCriticalWindow('same',()=>seen.push('old'));\n commitAfterUiCriticalWindow('same',()=>seen.push('new'));\n if(seen.length) process.exit(31);\n await new Promise(r=>setTimeout(r,90));\n if(seen.length!==1||seen[0]!=='new') process.exit(32);\n resetUiFrameBudgetForTests();\n process.exit(0);\n})().catch(()=>process.exit(33));\n`);
const behavior = spawnSync(process.execPath, [tmp], { cwd: root, encoding: 'utf8', timeout: 2000 });
try { fs.unlinkSync(tmp); } catch {}
check('Frame-budget runtime coalesces to latest snapshot after critical window', behavior.status === 0, (behavior.stderr || behavior.stdout || `exit=${behavior.status}`).trim());

console.log(`\nFamily Bloom Android Performance Foundation P1: ${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
