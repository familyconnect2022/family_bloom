#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  classifyDoctorResult,
  KNOWN_CHECK_TITLE,
  KNOWN_DETAIL,
  PROJECT_ROOT,
} = require('./setup/run-expo-doctor-native-policy');

let pass = 0;
let fail = 0;
function check(name, condition) {
  if (condition) { pass += 1; console.log(`PASS ${name}`); }
  else { fail += 1; console.log(`FAIL ${name}`); }
}

const knownWarning = `20/21 checks passed. 1 checks failed. Possible issues detected:\n${KNOWN_CHECK_TITLE}\n${KNOWN_DETAIL}\nWhen the android/ios folders are present, use Prebuild in your build pipeline.`;
const unknownWarning = `20/21 checks passed. 1 checks failed. Possible issues detected:\nCheck dependencies for packages that should not be installed directly`;
const twoFailures = `19/21 checks passed. 2 checks failed. Possible issues detected:\n${KNOWN_CHECK_TITLE}\n${KNOWN_DETAIL}\nPrebuild\nAnother failing check`;
const patchDriftWarning = `5 packages out of date.\nAdvice:\nUse 'npx expo install --check' to review and upgrade your dependencies.\n1 check failed, indicating possible issues with the project.`;

check('doctor success stays pass', classifyDoctorResult('21/21 checks passed.', 0).ok === true);
check('known non-CNG warning is tolerated', classifyDoctorResult(knownWarning, 1).ok === true);
check('known warning is explicitly classified', classifyDoctorResult(knownWarning, 1).ignoredKnownNativeSyncWarning === true);
check('unknown doctor failure remains blocking', classifyDoctorResult(unknownWarning, 1).ok === false);
check('multiple doctor failures remain blocking', classifyDoctorResult(twoFailures, 1).ok === false);
check('compatible patch drift advisory is tolerated', classifyDoctorResult(patchDriftWarning, 1).ok === true);

const root = path.resolve(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const wrapper = fs.readFileSync(path.join(root, 'scripts/setup/run-expo-doctor-native-policy.js'), 'utf8');
check('package exposes doctor native policy command', packageJson.scripts['doctor:native-check'] === 'node ./scripts/setup/run-expo-doctor-native-policy.js');
check('doctor root is anchored to script location', PROJECT_ROOT === root && wrapper.includes("path.resolve(__dirname, '..', '..')"));
check('doctor launcher uses pinned package bin metadata', wrapper.includes('manifest.bin') && wrapper.includes("node_modules', 'expo-doctor"));
check('doctor launcher uses Node CLI without shell', wrapper.includes('command: process.execPath') && wrapper.includes('shell: false'));
check('doctor launcher does not invoke npx or .cmd', !/npx\s+expo-doctor/i.test(wrapper) && !wrapper.includes('expo-doctor.cmd'));

const expectedBatFiles = [
  'scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat',
  'scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat',
  'scripts/setup/Family_Bloom_Install_And_Doctor.bat',
];
for (const rel of expectedBatFiles) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  check(`${rel} uses native doctor policy`, text.includes('npm run doctor:native-check') && !text.includes('call npx expo-doctor'));
}

const debug = fs.readFileSync(path.join(root, 'scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat'), 'utf8');
const release = fs.readFileSync(path.join(root, 'scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat'), 'utf8');
check('debug still runs prebuild clean after doctor', debug.includes('expo prebuild --platform android --clean'));
check('release still runs prebuild clean after doctor', release.includes('expo prebuild --platform android --clean'));

console.log(`Phase 15A.2 Native Expo Doctor Policy: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
