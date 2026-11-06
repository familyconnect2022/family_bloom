#!/usr/bin/env node
'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');

const fs = require('fs');
const path = require('path');
const { classifyDoctorResult, isRemoteDirectoryFailure, runDoctorWithDirectoryFallback } = require('../../setup/run-expo-doctor-native-policy');

const root = path.resolve(__legacyScriptsDir, '..');
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
4 packages out of date.
Advice:
Use 'npx expo install --check' to review and upgrade your dependencies.
1 check failed, indicating possible issues with the project.
`;

const classified = classifyDoctorResult(currentDoctorPatchDrift, 1);
check('Doctor new singular summary is parsed', classified.ok === true);
check('Compatible SDK patch drift is advisory', classified.ignoredCompatiblePatchDrift === true);
check('Major version drift remains build-blocking', classifyDoctorResult('expo ~57.0.31 58.0.0\n1 package out of date.\nAdvice:\nUse npx expo install --check\n1 check failed, indicating possible issues with the project.', 1).ok === false);
check('Unrelated single Doctor failure is still blocking', classifyDoctorResult('1 check failed, indicating possible issues with the project.\nCheck invalid native dependency', 1).ok === false);
check('Multiple Doctor failures remain blocking', classifyDoctorResult('2 checks failed, indicating possible issues with the project.\n5 packages out of date.\nAdvice:\nUse npx expo install --check', 1).ok === false);

function sdk57PatchAtLeast(range, floor) {
  const match = String(range || '').match(/^~57\.0\.(\d+)$/);
  return Boolean(match) && Number(match[1]) >= floor;
}
check('Expo package is SDK57 and at/above original floor', sdk57PatchAtLeast(pkg.dependencies.expo, 28));
check('Dev client package is SDK57 and at/above original floor', sdk57PatchAtLeast(pkg.dependencies['expo-dev-client'], 20));
check('Router package is SDK57 and at/above original floor', sdk57PatchAtLeast(pkg.dependencies['expo-router'], 26));
check('Splash package is SDK57 and at/above original floor', sdk57PatchAtLeast(pkg.dependencies['expo-splash-screen'], 10));
check('New compatible patch versions are allowed', sdk57PatchAtLeast('~57.0.31', 28) && sdk57PatchAtLeast('~57.0.29', 26));
check('Different Expo SDK minors are still rejected', !sdk57PatchAtLeast('~57.1.0', 28) && !sdk57PatchAtLeast('~58.0.0', 28));
check('Recognize only confirmed React Native Directory server error', isRemoteDirectoryFailure('Directory check failed with unexpected server response') && !isRemoteDirectoryFailure('React Native Directory reported unsafe package'));
const os = require('os');
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'FB Directory Network Test '));
try {
  const testPkg = path.join(fixtureRoot, 'node_modules', 'expo-doctor');
  fs.mkdirSync(path.join(testPkg, 'build'), { recursive: true });
  fs.writeFileSync(path.join(testPkg, 'package.json'), JSON.stringify({ name: 'expo-doctor', version: '1.20.4', bin: { 'expo-doctor': './build/index.js' } }));
  const fakeDoctor = [
    'const patch = "expo ~57.0.31 57.0.30\\nexpo-router ~57.0.29 57.0.28\\n2 packages out of date.\\nAdvice:\\nUse npx expo install --check to review and upgrade your dependencies.\\n1 check failed, indicating possible issues with the project.";',
    'if (process.env.EXPO_DOCTOR_ENABLE_DIRECTORY_CHECK === "0") { process.stdout.write(patch); }',
    'else { process.stdout.write("Directory check failed with unexpected server response\\n" + patch.replace("1 check failed", "2 checks failed")); }',
    'process.exit(1);',
  ].join('\n');
  fs.writeFileSync(path.join(testPkg, 'build', 'index.js'), fakeDoctor);
  const checkResult = runDoctorWithDirectoryFallback(fixtureRoot);
  check('Directory network failure triggers exactly one fallback', checkResult.retriedWithoutDirectory === true && checkResult.first.status === 1 && checkResult.final.status === 1);
  check('Retry retains and classifies patch advisory', classifyDoctorResult(checkResult.final.stdout, checkResult.final.status).ignoredCompatiblePatchDrift === true);
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

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
