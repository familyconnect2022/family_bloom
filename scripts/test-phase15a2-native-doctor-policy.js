#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { classifyDoctorResult, KNOWN_CHECK_TITLE, KNOWN_DETAIL, buildDoctorInvocations } = require('./setup/run-expo-doctor-native-policy');

let pass = 0;
let fail = 0;
function check(name, condition) {
  if (condition) {
    pass += 1;
    console.log(`PASS ${name}`);
  } else {
    fail += 1;
    console.log(`FAIL ${name}`);
  }
}

const knownWarning = `20/21 checks passed. 1 checks failed. Possible issues detected:\n${KNOWN_CHECK_TITLE}\n${KNOWN_DETAIL}\nWhen the android/ios folders are present, use Prebuild in your build pipeline.`;
const unknownWarning = `20/21 checks passed. 1 checks failed. Possible issues detected:\nCheck dependencies for packages that should not be installed directly`;
const twoFailures = `19/21 checks passed. 2 checks failed. Possible issues detected:\n${KNOWN_CHECK_TITLE}\n${KNOWN_DETAIL}\nPrebuild\nAnother failing check`;

check('doctor success stays pass', classifyDoctorResult('21/21 checks passed.', 0).ok === true);
check('known non-CNG warning is tolerated', classifyDoctorResult(knownWarning, 1).ok === true);
check('known warning is explicitly classified', classifyDoctorResult(knownWarning, 1).ignoredKnownNativeSyncWarning === true);
check('unknown doctor failure remains blocking', classifyDoctorResult(unknownWarning, 1).ok === false);
check('multiple doctor failures remain blocking', classifyDoctorResult(twoFailures, 1).ok === false);

const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
check('package exposes doctor native policy command', packageJson.scripts['doctor:native-check'] === 'node ./scripts/setup/run-expo-doctor-native-policy.js');

const winDoctor = buildDoctorInvocations('win32', { ComSpec: 'C:\\Windows\\System32\\cmd.exe' });
check('Windows doctor uses cmd.exe instead of spawning npx.cmd directly', winDoctor[0].command.toLowerCase().endsWith('cmd.exe') && !winDoctor.some((item) => item.command.toLowerCase() === 'npx.cmd'));
check('Windows doctor invokes npx through cmd /c', winDoctor[0].args.includes('/c') && winDoctor[0].args.includes('npx expo-doctor'));
check('Windows doctor has shell fallback', winDoctor.length >= 2 && winDoctor[1].shell === true);
const posixDoctor = buildDoctorInvocations('linux', {});
check('non-Windows doctor still invokes npx directly', posixDoctor.length === 1 && posixDoctor[0].command === 'npx' && posixDoctor[0].args[0] === 'expo-doctor');

const expectedBatFiles = [
  'scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat',
  'scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat',
  'scripts/setup/Family_Bloom_Install_And_Doctor.bat',
  'scripts/setup/settup.bat',
];
for (const rel of expectedBatFiles) {
  const text = fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
  check(`${rel} uses native doctor policy`, text.includes('npm run doctor:native-check') && !text.includes('call npx expo-doctor'));
}

const debug = fs.readFileSync(path.join(process.cwd(), 'scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat'), 'utf8');
const release = fs.readFileSync(path.join(process.cwd(), 'scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat'), 'utf8');
check('debug still runs prebuild clean after doctor', debug.includes('expo prebuild --platform android --clean'));
check('release still runs prebuild clean after doctor', release.includes('expo prebuild --platform android --clean'));

console.log(`Phase 15A.2 Native Expo Doctor Policy: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
