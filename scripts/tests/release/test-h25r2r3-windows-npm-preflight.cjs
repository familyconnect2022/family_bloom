#!/usr/bin/env node
'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
// Pre-install regression: Windows .cmd is not a reliable child_process target;
// the preflight MUST NOT launch npm to locate TypeScript.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__legacyScriptsDir, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const source = read('scripts/tests/release/test-h25r2-xiangqi-black-turn-reconnect.cjs');
const preflight = read('scripts/tests/release/test-h25r2r2-release-preflight.cjs');
const update = read('scripts/android/maintenance/Family_Bloom_AUTO_UPDATE_FULL.bat');
const assertCheck=(name, fn)=>{fn();console.log('[PASS] '+name)};
assertCheck('dynamic test never spawns npm.exe or npm.cmd',()=>{
  assert(!/execFileSync\(\s*['"]npm/.test(source));
  assert(!/spawnSync\(\s*['"]npm/.test(source));
});
assertCheck('preflight explicitly selects dependency-free mode',()=>assert(preflight.includes("'scripts/tests/release/test-h25r2-xiangqi-black-turn-reconnect.cjs', ['--source-only']")));
assertCheck('runtime gate still requires local TS',()=>assert(source.includes("ts = require('typescript')")));
assertCheck('runtime gate is preserved after dependency bootstrap',()=>{
  for(const f of ['scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat','scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat','scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat','scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat']) {
    const s=read(f);
    assert(s.includes('Family_Bloom_ENSURE_GATE_DEPENDENCIES.bat'),f);
    assert(s.indexOf('Family_Bloom_ENSURE_GATE_DEPENDENCIES.bat') < s.indexOf('test-h25r2-xiangqi-black-turn-reconnect.cjs'),f);
  }
});
assertCheck('backup message does not use stale previous-run record',()=>assert(update.includes('FB_THIS_RUN_BACKUP') && update.includes('BEFORE any cleanup or overlay')));
const result = spawnSync(process.execPath, [path.join(root,'scripts/tests/release/test-h25r2-xiangqi-black-turn-reconnect.cjs'), '--source-only'], {cwd:root,encoding:'utf8',timeout:10000});
assertCheck('pre-install black input checks execute without npm',()=>assert.equal(result.status,0,result.stderr));
const releaseResult=spawnSync(process.execPath,[path.join(root,'scripts/tests/release/test-h25r2r2-release-preflight.cjs')],{cwd:root,encoding:'utf8',timeout:240000,maxBuffer:8*1024*1024});
assertCheck('fresh FULL release passes source-only preflight',()=>assert.equal(releaseResult.status,0,releaseResult.stderr+'\n'+releaseResult.stdout));
assertCheck('H25 Runtime claims is after TypeScript bootstrap in all release entrypoints',()=>{
  for(const f of ['scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat','scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat','scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat','scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat']) {
    const s=read(f);
    assert(s.indexOf('Family_Bloom_ENSURE_GATE_DEPENDENCIES.bat') < s.indexOf('test-h25-runtime-claims.cjs'),f);
  }
});
console.log('H25R2R3 WIN NODE24 PRE-INSTALL CONTRACT: 8/8 PASS');
