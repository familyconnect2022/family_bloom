#!/usr/bin/env node
'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
/**
 * Regression for the 22 Oct 2026 user-reported update stop:
 * A freshly extracted FULL source has neither root nor server node_modules.
 * `test-h25-firebase-invitation.cjs` must work without TypeScript; the dynamic
 * Chess READY VM must remain mandatory AFTER installing root dependencies.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__legacyScriptsDir,'..');
const read = rel => fs.readFileSync(path.join(root,rel),'utf8');
const sourceGate = read('scripts/tests/release/test-h25-firebase-invitation.cjs');
const runtimeGate = read('scripts/tests/release/test-h25r2r6r2-chess-ready-vm.cjs');
const releaseGate = read('scripts/tests/release/test-h25r2r2-release-preflight.cjs');
let pass=0;
const check=(name,fn)=>{fn();console.log(`[UPDATER PRE-INSTALL PASS ${++pass}] ${name}`)};
check('H25 source gate does not execute the TypeScript-dependent READY VM',()=>{
  assert(!/^\s*require\(['"]\.\/test-h25r2r6r2-chess-ready-vm\.cjs['"]\);?\s*$/m.test(sourceGate));
  assert(sourceGate.includes('test-h25r2r6r2-two-stage-ready.cjs'));
  assert(sourceGate.includes('test-h25r2r6r3-chess-native-orientation.cjs'));
});
check('source-only release preflight still requires H25 contracts',()=>{
  assert(releaseGate.includes('test-h25-firebase-invitation.cjs'));
  assert(releaseGate.includes('test-h25-source-package.cjs'));
});
check('dynamic READY VM still tests real ChessGameManager behavior using TypeScript',()=>{
  assert(runtimeGate.includes("ts=require('typescript')"));
  assert(runtimeGate.includes('ts.transpileModule('));
  assert(runtimeGate.includes('both playReady start exactly once'));
});
for(const f of [
  'scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat',
  'scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat',
  'scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat',
  'scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat',
]){
  check(`${path.basename(f)} executes dynamic READY VM only after dependency setup`,()=>{
    const data = read(f);
    const ensure = data.indexOf('Family_Bloom_ENSURE_GATE_DEPENDENCIES.bat');
    const vm = data.indexOf('node scripts\\tests\\release\\test-h25r2r6r2-chess-ready-vm.cjs');
    assert(ensure>=0 && vm>ensure,`${f}: VM must execute AFTER dependency bootstrap`);
    assert(data.slice(vm).includes('if errorlevel 1 goto :fail'),`${f}: fail-closed VM gate required`);
    assert(data.slice(0,ensure).includes('test-h25-firebase-invitation.cjs'),`${f}: source gate must run before dependency bootstrap`);
  });
}
const result = spawnSync(process.execPath,[
  '--no-global-search-paths',path.join(root,'scripts/tests/release/test-h25-firebase-invitation.cjs')
],{
  cwd:root, encoding:'utf8', timeout:90000, maxBuffer:8*1024*1024,
  env:{...process.env,NODE_PATH:''},
});
check('fresh FULL source passes H25 invitation/READY/orientation without installed TypeScript',()=>{
  assert.equal(result.status,0,`source-only test exited ${result.status}:\n${result.stderr}\n${result.stdout}`);
  assert(result.stdout.includes('TWO-STAGE READY REGRESSION: 14/14 PASS'));
  assert(result.stdout.includes('CHESS NATIVE ORIENTATION: 8/8 PASS'));
});
console.log(`H25R2R6R3R1 AUTO UPDATE TYPESCRIPT PREFLIGHT: ${pass}/${pass} PASS`);
