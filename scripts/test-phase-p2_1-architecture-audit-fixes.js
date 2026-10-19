const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const Module = require('module');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass = 0, fail = 0;
function check(label, condition, detail = '') {
  const n = String(pass + fail + 1).padStart(2, '0');
  if (condition) { pass++; console.log(`PASS ${n} - ${label}`); }
  else { fail++; console.log(`FAIL ${n} - ${label}${detail ? ` :: ${detail}` : ''}`); }
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

console.log('\nP2.1 — Architecture Audit Fixes\n');

const home = read('src/app/(tabs)/index.tsx');
const members = read('src/hooks/family/useFamilyMembers.ts');
const moments = read('src/hooks/moments/useFamilyMoments.ts');
const events = read('src/hooks/family/useFamilyEvents.ts');
const scheduler = read('src/services/performance/bloomTaskScheduler.ts');
const graphWarm = read('src/components/familyGraph/familyGraphWarmCache.ts');
const routing = read('src/components/familyGraph/familyGraphConnectorRouting.ts');
const warmCache = read('src/services/bootstrap/familyHomeWarmCache.ts');
const signalStore = read('src/services/realtime/uiSignalStore.ts');

check('HomeMembersIsland defines its own bounded visibleMembers projection', home.includes('const visibleMembers = members.slice(0, DATA_LIMITS.dashboard.visibleMembers);'));
check('Members listener persists fresh member cache', members.includes('familyHomeWarmCache.update(requestUid, familyId, { members: sorted })'));
check('Moments pagination is family/version/head guarded', moments.includes('activeFamilyRef.current !== requestFamilyId') && moments.includes('familyVersionRef.current !== requestVersion') && moments.includes('headIdsRef.current !== requestHeadIds'));
check('Moments retry invalidates stale pagination generation', moments.includes('familyVersionRef.current += 1') && moments.includes('loadMoreInFlightRef.current = false'));
check('Moments bridge completion cannot clear a newer family bridge', moments.includes('const bridgeToken = ++bridgeTokenRef.current') && moments.includes('bridgeToken === bridgeTokenRef.current'));
check('Planner upcoming pagination is family/head-version guarded', events.includes('upcomingHeadVersionRef.current !== requestHeadVersion'));
check('Planner past pagination is family/head-version guarded', events.includes('pastHeadVersionRef.current !== requestHeadVersion'));
check('Planner prevents duplicate same-frame pagination requests', events.includes('upcomingLoadRef.current') && events.includes('pastLoadRef.current'));
check('Planner family switch clears pagination loading state', events.includes('setLoadingMoreUpcoming(false)') && events.includes('setLoadingMorePast(false)'));
check('Members callbacks reject stale family/user ownership', members.includes('activeFamilyRef.current !== familyId') && members.includes('activeUserUidRef.current !== requestUid'));
check('Scheduler tracks readyAt and claimed tasks', scheduler.includes('readyAt: number') && scheduler.includes('claimed: boolean'));
check('Scheduler keeps claimed idle task cancellable', scheduler.includes('pending.get(task.key) !== task') && scheduler.includes('Keep the claimed task in the map'));
check('Scheduler preserves an earlier wake over later delayed tasks', scheduler.includes('wakeAt <= target'));
check('Scheduler preserves non-cancellable task key ownership', scheduler.includes('previous?.canCancel === false') && scheduler.includes('return () => undefined'));
check('Scheduler interaction window drains immediately for high-priority work', scheduler.includes('if (pending.size) scheduleDrain(0)'));
check('Scheduler contains background task errors without unhandled rejection', scheduler.includes('task.onError?.(error)'));
check('Family Graph visual/layout caches are bounded', graphWarm.includes('MAX_VISUAL_CACHE_ENTRIES') && graphWarm.includes('MAX_LAYOUT_CACHE_ENTRIES') && graphWarm.includes('setBoundedVisualCache'));
check('Family Graph full warm records are memory-bounded', graphWarm.includes('MAX_FAMILY_WARM_RECORDS') && graphWarm.includes('setBoundedWarmRecord'));
check('Family feature warm records are memory-bounded', warmCache.includes('MAX_MEMORY_FAMILY_RECORDS') && warmCache.includes('setBoundedMemoryRecord'));
check('Signal store removes empty subscriber buckets', signalStore.includes('bucket.size === 0') && signalStore.includes('subscribers.delete(key)'));
check('Family Graph connector route types are explicitly declared', routing.includes('export type FamilyGraphConnectorRouteStrategy') && routing.includes('export type FamilyGraphConnectorRoute ='));

const syntaxFiles = [
  'src/app/(tabs)/index.tsx',
  'src/hooks/family/useFamilyMembers.ts',
  'src/hooks/moments/useFamilyMoments.ts',
  'src/hooks/family/useFamilyEvents.ts',
  'src/services/performance/bloomTaskScheduler.ts',
  'src/components/familyGraph/familyGraphWarmCache.ts',
  'src/components/familyGraph/familyGraphConnectorRouting.ts',
  'src/services/bootstrap/familyHomeWarmCache.ts',
  'src/services/realtime/uiSignalStore.ts',
];
const syntaxErrors = [];
for (const file of syntaxFiles) {
  const output = ts.transpileModule(read(file), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    reportDiagnostics: true,
    fileName: file,
  });
  for (const diagnostic of output.diagnostics || []) {
    if (diagnostic.category === ts.DiagnosticCategory.Error) syntaxErrors.push(`${file}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`);
  }
}
check(`P2.1 changed files syntax clean (${syntaxFiles.length} files)`, syntaxErrors.length === 0, syntaxErrors.slice(0, 3).join(' | '));

async function schedulerRuntimeAudit() {
  const file = path.join(root, 'src/services/performance/bloomTaskScheduler.ts');
  let idleCallbacks = [];
  const originalLoad = Module._load;
  Module._load = function(request, parent, isMain) {
    if (request === 'react-native') {
      return { InteractionManager: { runAfterInteractions(callback) { idleCallbacks.push(callback); return { cancel() {} }; } } };
    }
    if (parent && parent.filename === file && request === './uiFrameBudget') {
      return { beginUiCriticalWindow() {}, getUiFrameBudgetSnapshot() { return { critical: false }; } };
    }
    return originalLoad.apply(this, arguments);
  };
  try {
    const js = ts.transpileModule(read('src/services/performance/bloomTaskScheduler.ts'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      fileName: file,
    }).outputText;
    const mod = new Module(file, module);
    mod.filename = file;
    mod.paths = Module._nodeModulePaths(path.dirname(file));
    mod._compile(js, file);
    const taskScheduler = mod.exports.bloomTaskScheduler;

    let visibleRan = false;
    taskScheduler.schedule({ key: 'visible', priority: 'VISIBLE', run() { visibleRan = true; } });
    taskScheduler.schedule({ key: 'late-idle', priority: 'IDLE', delayMs: 120, run() {} });
    await sleep(25);
    check('Scheduler runtime: delayed IDLE cannot postpone ready VISIBLE work', visibleRan);

    taskScheduler.resetForTests(); idleCallbacks = [];
    let idleRan = false;
    taskScheduler.schedule({ key: 'cancel-me', priority: 'IDLE', run() { idleRan = true; } });
    await sleep(15);
    const claimedCancel = taskScheduler.cancel('cancel-me');
    idleCallbacks.splice(0).forEach((callback) => callback());
    await sleep(10);
    check('Scheduler runtime: claimed IDLE task can be cancelled before callback', claimedCancel && !idleRan);

    taskScheduler.resetForTests(); idleCallbacks = [];
    let oldRan = false, newRan = false;
    taskScheduler.schedule({ key: 'replace', priority: 'IDLE', run() { oldRan = true; } });
    await sleep(15);
    taskScheduler.schedule({ key: 'replace', priority: 'VISIBLE', run() { newRan = true; } });
    await sleep(15);
    idleCallbacks.splice(0).forEach((callback) => callback());
    await sleep(10);
    check('Scheduler runtime: same-key replacement suppresses stale claimed task', !oldRan && newRan);

    taskScheduler.resetForTests(); idleCallbacks = [];
    let protectedRan = false, replacementRan = false;
    taskScheduler.schedule({ key: 'protected', priority: 'VISIBLE', canCancel: false, delayMs: 20, run() { protectedRan = true; } });
    taskScheduler.schedule({ key: 'protected', priority: 'INTERACTION', run() { replacementRan = true; } });
    await sleep(35);
    check('Scheduler runtime: non-cancellable same-key task cannot be replaced', protectedRan && !replacementRan);

    taskScheduler.resetForTests(); idleCallbacks = [];
    let visibleDuringInteraction = false;
    taskScheduler.schedule({ key: 'already-visible', priority: 'VISIBLE', delayMs: 20, run() { visibleDuringInteraction = true; } });
    taskScheduler.beginInteraction(120);
    await sleep(35);
    check('Scheduler runtime: interaction window does not postpone VISIBLE work', visibleDuringInteraction);

    taskScheduler.resetForTests(); idleCallbacks = [];
    let observedError = false, afterErrorRan = false;
    taskScheduler.schedule({ key: 'rejecting', priority: 'VISIBLE', async run() { throw new Error('expected-test-error'); }, onError() { observedError = true; } });
    await sleep(15);
    taskScheduler.schedule({ key: 'after-error', priority: 'VISIBLE', run() { afterErrorRan = true; } });
    await sleep(15);
    check('Scheduler runtime: rejected task is contained and queue continues', observedError && afterErrorRan);
    taskScheduler.resetForTests();
  } catch (error) {
    check('Scheduler executable audit', false, error?.stack || String(error));
  } finally {
    Module._load = originalLoad;
  }
}

(async () => {
  await schedulerRuntimeAudit();
  const pkg = JSON.parse(read('package.json'));
  check('P2.1 gate is registered in package scripts', pkg.scripts?.['phaseP2_1:check'] === 'node ./scripts/test-phase-p2_1-architecture-audit-fixes.js');
  check('P2.1 gate runs in post-copy updater', read('scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat').includes('test-phase-p2_1-architecture-audit-fixes.js'));
  check('P2.1 gate runs in Android Debug build', read('scripts/android/dev/Family_Bloom_Android_Debug_Build_And_Run.bat').includes('phaseP2_1:check'));
  check('P2.1 gate runs in Android Release build', read('scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat').includes('phaseP2_1:check'));
  console.log(`\nFamily Bloom P2.1 Architecture Audit Fixes: ${pass}/${pass + fail} PASS`);
  process.exit(fail ? 1 : 0);
})();
