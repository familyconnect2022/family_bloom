const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__legacyScriptsDir, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const pkg = JSON.parse(read('package.json'));
const depCheck = read('scripts/setup/check-expo-dependencies.js');
const lockCheck = read('scripts/setup/check-package-lock.js');
const configCheck = read('scripts/setup/check-effective-expo-config.js');
const debugBat = read('scripts/android/dev/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat');
const cleanBat = read('scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat');
const shareBat = read('scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat');

let pass = 0;
let fail = 0;
function check(name, condition, detail = '') {
  if (condition) { pass += 1; console.log(`PASS ${name}`); }
  else { fail += 1; console.error(`FAIL ${name}${detail ? ` :: ${detail}` : ''}`); }
}

check('expo-asset is a direct SDK57 dependency', pkg.dependencies?.['expo-asset'] === '~57.0.19');
check('expo-audio remains SDK57', pkg.dependencies?.['expo-audio'] === '~57.0.5');
check('Dependency checker watches expo-asset', depCheck.includes("'expo-asset'"));
check('Lock checker watches expo-asset', lockCheck.includes("'expo-asset'"));
check('Effective config validator requires direct expo-asset peer', configCheck.includes("package.json directly installs expo-asset peer for expo-audio"));
check('expo-asset is not incorrectly forced into app config plugins', !read('app.config.js').includes("'expo-asset'") && !(JSON.parse(read('app.json')).expo.plugins || []).some((p) => (Array.isArray(p) ? p[0] : p) === 'expo-asset'));

for (const [name, bat] of [['Debug', debugBat], ['Release', releaseBat]]) {
  check(`${name} bootstrap checks expo-asset`, bat.includes('node_modules\\expo-asset\\package.json'));
  check(`${name} runs P2.12.7 gate`, bat.includes('phaseP2_12_7:check'));
}
check('Clean apply bootstraps expo-asset', cleanBat.includes('node_modules\\expo-asset\\package.json'));
check('Clean apply runs P2.12.7 gate', cleanBat.includes('test-phase-p2_12_7-expo-asset-peer-contract.js'));
check('Share build runs P2.12.7 gate', shareBat.includes('test-phase-p2_12_7-expo-asset-peer-contract.js'));
check('P2.12.7 package script registered', pkg.scripts?.['phaseP2_12_7:check']?.includes('test-phase-p2_12_7-expo-asset-peer-contract.js'));

console.log(`\nP2.12.7 Expo Asset Peer Contract: ${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
