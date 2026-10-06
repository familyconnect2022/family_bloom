const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let pass = 0;
let fail = 0;
const assert = (condition, label) => {
  if (condition) { console.log(`PASS ${label}`); pass += 1; }
  else { console.error(`FAIL ${label}`); fail += 1; }
};

const sweep = read('src/services/performance/appWidePerformanceService.ts');
const perf = read('src/services/performance/performanceTestService.ts');
const driver = read('src/components/system/AppWidePerformanceDriver.tsx');
const rootLayout = read('src/app/_layout.tsx');
const lab = read('src/app/(internal)/performance-test.tsx');
const graph = read('src/app/(internal)/performance-graph-test.tsx');
const data = read('src/app/(internal)/performance-data-test.tsx');
const whisper = read('src/features/home/whispers/WhisperFeaturePanel.tsx');
const poll = read('src/features/home/polls/PollFeaturePanel.tsx');
const fund = read('src/app/(home)/(fund)/home-fund.tsx');
const notifications = read('src/app/(activity)/(notifications)/notifications.tsx');
const gateway = read('src/app/(family)/(membership)/family-gateway.tsx');
const pkg = JSON.parse(read('package.json'));
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
const psRunner = read('scripts/android/Family_Bloom_Phase15B_Performance_Run.ps1');
const batRunner = read('scripts/android/Family_Bloom_Phase15B_Performance_Run.bat');

const routeSteps = (sweep.match(/\{ type: "route", category:/g) || []).length;
const graphSteps = (sweep.match(/\{ type: "graph", count:/g) || []).length;
const stressSteps = (sweep.match(/\{ type: "stress", kind:/g) || []).length;

assert(routeSteps === 29, 'app sweep covers 29 real signed-in routes');
assert(graphSteps === 5 && /count: 500/.test(sweep), 'app sweep keeps Graph 50/100/200/300/500 RAM matrix');
assert(stressSteps === 8, 'app sweep keeps 8 RAM-only long-list stress cases');
assert(routeSteps + graphSteps + stressSteps === 42, 'one run executes 42 automated steps');
assert(sweep.includes('noWriteMode: true') && sweep.includes('isNoWriteMode'), 'app sweep exposes a no-write runtime guard');
assert(sweep.includes('App route first usable frame') && sweep.includes('settled_double_frame'), 'route latency uses a double-frame first-usable marker');
assert(sweep.indexOf('App route first usable frame') < sweep.indexOf('finishRouteStep ='), 'route first-usable latency is recorded before observation dwell completes');
assert(sweep.includes('listenerPeak: snapshot.peakListenerTotal') && sweep.includes('reactMaxMs'), 'summary records listener peak and React commit cost');
assert(sweep.includes('routeP95Ms') && sweep.includes('JS session → app ready'), 'summary keeps startup context and route p95');
assert(sweep.includes('beginSyntheticStep') && sweep.includes('activeSynthetic'), 'synthetic matrix records real per-step duration');
assert(sweep.includes('App sweep event-loop delay p95') && sweep.includes('App sweep event-loop delay max'), 'summary scores normalized JS event-loop p95 and max');
assert(perf.includes('"app_sweep"') && perf.includes('recordReactCommit') && perf.includes('peakListenerTotal'), 'performance service supports app-sweep probe, React commits, and listener peaks');
assert(perf.includes('sampleMemory') && perf.includes('usedJSHeapSize') && perf.includes('totalJSHeapSize'), 'performance service samples JS heap when Hermes exposes it');

assert(driver.includes('if (!PERFORMANCE_TEST_BUILD) return null') && driver.includes('EnabledAppWidePerformanceDriver'), 'release build keeps the app-wide driver hook-free');
assert(driver.includes('router.replace(route as never)') && !driver.includes('router.navigate(route as never)'), 'driver keeps one visible route owner with replace-only state-machine navigation');
assert(driver.includes('requestAnimationFrame') && driver.includes('finishRouteStep'), 'global driver waits for stable frames then observes async route work');
assert(rootLayout.includes('<AppWidePerformanceDriver />') && rootLayout.includes('<Profiler'), 'root mounts the global driver and development React Profiler');
assert(rootLayout.includes('recordReactCommit(pathname || "/"'), 'Profiler attributes commits to the active route');

assert(graph.includes('appSweep') && graph.includes('markSyntheticStep'), 'Graph screen participates in Phase 15B automation');
assert(data.includes('appSweep') && data.includes('markSyntheticStep'), 'long-list stress screen participates in Phase 15B automation');
assert(lab.includes('Kiểm tra toàn app tự động') && lab.includes('29 màn production thật'), 'Performance Lab exposes one-button 29-route automatic sweep');
assert(lab.includes('autoStart') && lab.includes('appWidePerformanceService.start()'), 'Performance Lab supports deep-link auto-start for Windows runner');

for (const [name, content] of [
  ['Whisper cleanup', whisper],
  ['Poll cleanup', poll],
  ['Fund initialization', fund],
  ['Notification seen state', notifications],
  ['Family gateway auto-switch', gateway],
]) assert(content.includes('appWidePerformanceService.isNoWriteMode()'), `${name} honors Phase 15B no-write mode`);

assert(pkg.scripts['phase15b:check'] === 'node ./scripts/test-phase15b-app-wide-performance.js', 'package exposes phase15b:check');
assert(debugBat.includes('call npm run phase15b:check'), 'Debug build runs Phase 15B static gate');
assert(releaseBat.includes('call npm run phase15b:check'), 'Release build runs Phase 15B static gate');
assert(batRunner.includes('Family_Bloom_Phase15B_Performance_Run.ps1'), 'Windows one-click runner launches the Phase 15B PowerShell monitor');
assert(psRunner.includes('familybloom://performance-test?autoStart=1') && psRunner.includes('dumpsys meminfo'), 'Windows runner deep-links auto-start and samples native Android PSS');
assert(psRunner.includes('FB_PERF_SWEEP\\] COMPLETE') && psRunner.includes('phase15b-native-memory'), 'Windows runner waits for completion marker and writes a native-memory report');

console.log(`Phase 15B App-wide Performance Diagnostic: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
