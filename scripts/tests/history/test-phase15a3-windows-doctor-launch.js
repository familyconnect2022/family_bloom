#!/usr/bin/env node
'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');

const fs = require('fs');
const path = require('path');
const { classifyDoctorResult, KNOWN_CHECK_TITLE, KNOWN_DETAIL } = require('../../setup/run-expo-doctor-native-policy');
let pass=0, fail=0;
function check(name, ok){ if(ok){pass++; console.log(`PASS ${name}`)} else {fail++; console.log(`FAIL ${name}`)} }
const root = path.resolve(__legacyScriptsDir, '..');
const wrapper = fs.readFileSync(path.join(root,'scripts/setup/run-expo-doctor-native-policy.js'),'utf8');
check('wrapper does not spawn npx.cmd directly', !wrapper.includes('npx.cmd'));
check('wrapper does not spawn expo-doctor.cmd directly', !wrapper.includes('expo-doctor.cmd'));
check('Windows-safe successor launches Doctor CLI through Node', wrapper.includes('command: process.execPath') && wrapper.includes('args: [doctor.cliPath]'));
check('successor launcher keeps shell disabled', wrapper.includes('shell: false') && !wrapper.includes('shell: true'));
check('successor launcher pins project cwd', wrapper.includes('cwd: projectRoot') || wrapper.includes('cwd: invocation.cwd'));
const known = `20/21 checks passed. 1 checks failed. Possible issues detected:\n${KNOWN_CHECK_TITLE}\n${KNOWN_DETAIL}\nUse Prebuild in your build pipeline.`;
check('known non-CNG warning still tolerated', classifyDoctorResult(known,1).ok === true);
check('unknown doctor failure still blocks', classifyDoctorResult('20/21 checks passed. 1 checks failed.\nUnknown failure',1).ok === false);
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
check('doctor script still routes through wrapper', pkg.scripts['doctor:native-check'] === 'node ./scripts/setup/run-expo-doctor-native-policy.js');
for (const rel of ['scripts/android/dev/Family_Bloom_Android_Debug_Build_And_Run.bat','scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat']) {
 const text=fs.readFileSync(path.join(root,rel),'utf8');
 check(`${rel} still uses doctor policy`, text.includes('npm run doctor:native-check'));
}
console.log(`Phase 15A.3 Windows Expo Doctor Launch: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
