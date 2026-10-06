const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass = 0, fail = 0;
const assert = (cond, label) => { if (cond) { console.log('PASS', label); pass++; } else { console.error('FAIL', label); fail++; } };
const lab = read('src/app/(internal)/performance-test.tsx');
const driver = read('src/components/system/AppWidePerformanceDriver.tsx');
const service = read('src/services/performance/appWidePerformanceService.ts');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

assert(!lab.split('const startAppWideSweep = () => {')[1].split('const copyAppWideSweepReport')[0].includes('router.'), 'Phase 15B Lab has no competing startup navigation owner');
assert(driver.includes('const target = appWidePerformanceService.routeForStep') && driver.includes('router.replace(target as never)'), 'global driver directly opens the first public route');
assert(driver.includes('useSyncExternalStore') && driver.includes('appWidePerformanceService.getRevision'), 'global driver uses React external-store subscription');
assert(service.includes('private revision = 0') && service.includes('getRevision = () => this.revision'), 'performance service exposes stable revision snapshot');
assert(service.includes('private armHardWatchdog') && service.includes('driver watchdog >'), 'service has an independent per-step hard watchdog');
assert(service.includes('this.armHardWatchdog();') && service.includes('this.clearHardWatchdog();'), 'watchdog is armed and cleaned across the run lifecycle');
assert(driver.includes('[FB_PERF_DRIVER] ACTIVE'), 'driver emits an explicit liveness marker for device logs');
assert(debugBat.includes('phase15b2:check'), 'Debug build runs Phase 15B.2 liveness guard');
assert(releaseBat.includes('phase15b2:check'), 'Release build runs Phase 15B.2 liveness guard');
assert(service.includes('return () => {\n      this.subscribers.delete(subscriber);'), 'external-store unsubscribe cleanup returns void');

console.log(`Phase 15B.2 runner liveness hotfix: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
