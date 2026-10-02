const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
let pass = 0;
let fail = 0;
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const check = (name, ok) => {
  if (ok) { console.log(`PASS ${name}`); pass += 1; }
  else { console.error(`FAIL ${name}`); fail += 1; }
};

const appConfig = read('app.config.js');
const app = JSON.parse(read('app.json'));
const pkg = JSON.parse(read('package.json'));
const google = JSON.parse(read('google-services.json'));
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
const master = read('document/FAMILY_BLOOM_MASTER_HANDOFF_PROMPT_CURRENT.md');

const googlePackages = google.client.map(c => c?.client_info?.android_client_info?.package_name).filter(Boolean);
const rootTxt = fs.readdirSync(root).filter(name => name.toLowerCase().endsWith('.txt'));

check('single Android package is canonical', app.expo.android.package === 'com.familybloom.android');
check('dynamic config keeps the same canonical package', /package:\s*'com\.familybloom\.android'/.test(appConfig));
check('dual APP_VARIANT selector is removed', !/APP_VARIANT|isProductionVariant|development\s*=/.test(appConfig));
check('DEV Android package is removed from active config', !/com\.familybloom\.android\.dev/.test(appConfig));
check('only canonical Firebase Android client is shipped', googlePackages.length === 1 && googlePackages[0] === 'com.familybloom.android');
check('legacy DEV Firebase file is absent', !fs.existsSync(path.join(root, 'config/firebase/google-services.dev.json')));
check('legacy DEV branding folder is absent', !fs.existsSync(path.join(root, 'assets/branding/dev')));
check('debug suffix plugin is absent', !fs.existsSync(path.join(root, 'plugins/withBloomDebugApplicationIdSuffix.js')));
check('legacy DEV build script is absent', !fs.existsSync(path.join(root, 'scripts/android/Family_Bloom_Android_DEV_Build_And_Run.bat')));
check('new DEBUG script uses canonical package', /APP_PACKAGE=com\.familybloom\.android/.test(debugBat));
check('new DEBUG script uses the same root Firebase config', /google-services\.json/.test(debugBat) && !/google-services\.dev/.test(debugBat));
check('DEBUG build has no side-by-side install claim', !/Side-by-side|RELEASE_WAS_INSTALLED|\.dev/.test(debugBat));
check('RELEASE build has no APP_VARIANT dependency', !/APP_VARIANT/.test(releaseBat));
check('RELEASE build no longer validates debug suffix', !/check-generated-android-debug-suffix/.test(releaseBat));
check('root contains no txt files', rootTxt.length === 0);
check('patch notes are managed under document history', fs.existsSync(path.join(root, 'document/history/patches/PATCH_README_PHASE_14T.txt')));
check('device checklist is managed under reports/device', fs.existsSync(path.join(root, 'reports/device/PHASE_14T_DEVICE_CHECKLIST.txt')));
check('current handoff supersedes the dual-app decision', /SINGLE ANDROID IDENTITY/.test(master) && /dual-app decision is retired/i.test(master));
check('chess architecture checkpoint is recorded', /CHESS ARCHITECTURE DECISION — CONFIRMED/.test(master));
check('cleanup gate registered', pkg.scripts?.['phase14t0a:check'] === 'node ./scripts/test-phase14t0a-single-android-cleanup.js');
check('version advanced to cleanup baseline', app.expo.version === '1.3.1' && app.expo.android.versionCode >= 143010 && Number(app.expo.ios.buildNumber) >= 11 && pkg.version === '1.3.1');

console.log(`Phase14T.0A single Android identity cleanup: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
