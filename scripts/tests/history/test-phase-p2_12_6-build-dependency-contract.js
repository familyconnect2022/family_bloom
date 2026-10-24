const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { satisfiesRange } = require('../../setup/semver-contract');

const root = path.resolve(__legacyScriptsDir, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const pkg = JSON.parse(read('package.json'));
const depCheck = read('scripts/setup/check-expo-dependencies.js');
const lockCheck = read('scripts/setup/check-package-lock.js');
const debugBat = read('scripts/android/dev/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat');
const cleanBat = read('scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat');

let pass = 0;
let fail = 0;
function check(name, condition, detail = '') {
  if (condition) { pass += 1; console.log(`PASS ${name}`); }
  else { fail += 1; console.error(`FAIL ${name}${detail ? ` :: ${detail}` : ''}`); }
}

check('Tilde allows newer patch expo-linking', satisfiesRange('57.0.12', '~57.0.11'));
check('Tilde allows newer patch expo-router', satisfiesRange('57.0.27', '~57.0.26'));
check('Tilde allows newer patch expo-notifications', satisfiesRange('57.0.22', '~57.0.21'));
check('Tilde rejects next minor', !satisfiesRange('57.1.0', '~57.0.26'));
check('Caret allows compatible major-zero minor range', satisfiesRange('26.4.9', '^26.4.0'));
check('Exact Expo Doctor remains exact', satisfiesRange('1.20.4', '1.20.4') && !satisfiesRange('1.20.5', '1.20.4'));

check('Dependency checker reads package.json contract', depCheck.includes("require('./semver-contract')") && depCheck.includes("packageJson.dependencies?.[name]"));
check('Dependency checker has no duplicated exact Expo patch map', !depCheck.includes("'expo-linking': '57.0.11'") && !depCheck.includes("'expo-router': '57.0.24'") && !depCheck.includes("'expo-notifications': '57.0.21'"));
check('Lock checker validates locked version against package range', lockCheck.includes('satisfiesRange(lockedVersion, spec)'));
check('Lock checker verifies node_modules equals lock', lockCheck.includes('installedVersion !== lockedVersion'));
check('Missing lock remains a hard signal to run npm install', lockCheck.includes('MISSING package-lock.json'));

check('package.json still owns Expo patch ranges', pkg.dependencies['expo-linking'] === '~57.0.11' && pkg.dependencies['expo-router'] === '~57.0.26' && pkg.dependencies['expo-notifications'] === '~57.0.21');
check('P2.12.6 script is registered', pkg.scripts['phaseP2_12_6:check']?.includes('test-phase-p2_12_6-build-dependency-contract.js'));

for (const [name, bat] of [['Debug', debugBat], ['Release', releaseBat]]) {
  check(`${name} build runs dependency checker`, bat.includes('check-expo-dependencies.js'));
  check(`${name} build runs lock checker`, bat.includes('check-package-lock.js'));
  check(`${name} build runs P2.12.6 gate`, bat.includes('phaseP2_12_6:check'));
}
check('Clean apply runs P2.12.6 gate', cleanBat.includes('test-phase-p2_12_6-build-dependency-contract.js'));

console.log(`\nP2.12.6 Build Dependency Contract: ${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
