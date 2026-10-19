#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { classifyDoctorResult } = require('./setup/run-expo-doctor-native-policy');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const depCheck = fs.readFileSync(path.join(root, 'scripts/setup/check-expo-dependencies.js'), 'utf8');
const lockCheck = fs.readFileSync(path.join(root, 'scripts/setup/check-package-lock.js'), 'utf8');
const clean = fs.readFileSync(path.join(root, 'scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat'), 'utf8');
const release = fs.readFileSync(path.join(root, 'scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat'), 'utf8');
const debug = fs.readFileSync(path.join(root, 'scripts/android/dev/Family_Bloom_Android_Debug_Build_And_Run.bat'), 'utf8');

let pass = 0;
let fail = 0;
function check(name, condition) {
  if (condition) { pass += 1; console.log(`PASS ${name}`); }
  else { fail += 1; console.error(`FAIL ${name}`); }
}

const currentDoctorPatchDrift = `
The following packages should be updated for best compatibility with the installed expo version:
  expo                 ~57.0.28  57.0.27
  expo-dev-client      ~57.0.20  57.0.19
  expo-router          ~57.0.26  57.0.25
  expo-splash-screen   ~57.0.10  57.0.9
5 packages out of date.
Advice:
Use 'npx expo install --check' to review and upgrade your dependencies.
1 check failed, indicating possible issues with the project.
`;

const classified = classifyDoctorResult(currentDoctorPatchDrift, 1);
check('Doctor new singular summary is parsed', classified.ok === true);
check('Compatible SDK patch drift is advisory', classified.ignoredCompatiblePatchDrift === true);
check('Unrelated single Doctor failure is still blocking', classifyDoctorResult('1 check failed, indicating possible issues with the project.\nCheck invalid native dependency', 1).ok === false);
check('Multiple Doctor failures remain blocking', classifyDoctorResult('2 checks failed, indicating possible issues with the project.\n5 packages out of date.\nAdvice:\nUse npx expo install --check', 1).ok === false);

check('Expo package floor updated to Doctor recommendation', pkg.dependencies.expo === '~57.0.28');
check('Dev client floor updated to Doctor recommendation', pkg.dependencies['expo-dev-client'] === '~57.0.20');
check('Router floor updated to Doctor recommendation', pkg.dependencies['expo-router'] === '~57.0.26');
check('Splash floor updated to Doctor recommendation', pkg.dependencies['expo-splash-screen'] === '~57.0.10');

for (const name of ['expo', 'expo-dev-client', 'expo-router', 'expo-splash-screen']) {
  check(`Dependency checker watches ${name}`, depCheck.includes(`'${name}'`));
  check(`Lock checker watches ${name}`, lockCheck.includes(`'${name}'`));
}
check('Clean apply re-evaluates dependency contract before deciding install', clean.includes('check-expo-dependencies.js >nul 2>nul') && clean.includes('if errorlevel 1 set "NEED_INSTALL=1"'));
check('Clean apply re-evaluates lock before deciding install', clean.includes('check-package-lock.js >nul 2>nul') && clean.includes('if errorlevel 1 set "NEED_INSTALL=1"'));
check('Release build runs P2.15.5.1 before Doctor', release.indexOf('phaseP2_15_5_1:check') >= 0 && release.indexOf('phaseP2_15_5_1:check') < release.indexOf('doctor:native-check'));
check('Debug build runs P2.15.5.1 before Doctor', debug.indexOf('phaseP2_15_5_1:check') >= 0 && debug.indexOf('phaseP2_15_5_1:check') < debug.indexOf('doctor:native-check'));
check('P2.15.5.1 npm script registered', pkg.scripts['phaseP2_15_5_1:check']?.includes('test-phase-p2_15_5_1-build-share-doctor-patch-drift.js'));

console.log(`\nP2.15.5.1 Build Share Doctor Patch Drift: ${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
