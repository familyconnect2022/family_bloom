#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { buildDoctorInvocations, classifyDoctorResult, KNOWN_CHECK_TITLE, KNOWN_DETAIL } = require('./setup/run-expo-doctor-native-policy');
let pass=0, fail=0;
function check(name, ok){ if(ok){pass++; console.log(`PASS ${name}`)} else {fail++; console.log(`FAIL ${name}`)} }
const wrapper = fs.readFileSync(path.join(process.cwd(),'scripts/setup/run-expo-doctor-native-policy.js'),'utf8');
check('wrapper no longer spawns npx.cmd directly', !wrapper.includes("? 'npx.cmd'") && !/spawnSync\(\s*['\"]npx\.cmd/i.test(wrapper));
const win = buildDoctorInvocations('win32', { ComSpec: 'C:\\Windows\\System32\\cmd.exe' });
check('primary Windows launch uses ComSpec', win[0].command === 'C:\\Windows\\System32\\cmd.exe');
check('primary Windows launch uses cmd /d /s /c', JSON.stringify(win[0].args) === JSON.stringify(['/d','/s','/c','npx expo-doctor']));
check('Windows fallback uses shell command', win[1].command === 'npx expo-doctor' && win[1].shell === true);
const known = `20/21 checks passed. 1 checks failed. Possible issues detected:\n${KNOWN_CHECK_TITLE}\n${KNOWN_DETAIL}\nUse Prebuild in your build pipeline.`;
check('known non-CNG warning still tolerated', classifyDoctorResult(known,1).ok === true);
check('unknown doctor failure still blocks', classifyDoctorResult('20/21 checks passed. 1 checks failed.\nUnknown failure',1).ok === false);
const pkg=JSON.parse(fs.readFileSync(path.join(process.cwd(),'package.json'),'utf8'));
check('doctor script still routes through wrapper', pkg.scripts['doctor:native-check'] === 'node ./scripts/setup/run-expo-doctor-native-policy.js');
for (const rel of ['scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat','scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat']) {
 const text=fs.readFileSync(path.join(process.cwd(),rel),'utf8');
 check(`${rel} still uses doctor policy`, text.includes('npm run doctor:native-check'));
}
console.log(`Phase 15A.3 Windows Expo Doctor Launch: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
