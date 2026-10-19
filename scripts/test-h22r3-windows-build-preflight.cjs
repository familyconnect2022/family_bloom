#!/usr/bin/env node
'use strict';
// H22R3: Run before CLEAN APPLY / APK Build & Share / direct Release / EAS.
// Validate the packaging contracts that broke the prior H22R2 Windows build.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const manifest = JSON.parse(read('scripts/setup/bat-entrypoints-manifest.json'));
const entrypoints = {
  share: 'scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat',
  release: 'scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat',
  clean: 'scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat',
  eas: 'scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat',
};
let passed = 0;
function check(label, fn) { fn(); passed++; console.log(`PASS ${label}`); }
check('canonical BAT manifest includes strict Render/server TypeScript verifier', () => {
  assert(manifest.batFiles.includes('scripts/android/maintenance/Family_Bloom_VERIFY_SERVER_TYPES.bat'));
});
check('all canonical Windows BAT files exist and have CRLF-only line endings', () => {
  assert(manifest.batFiles.length >= 33);
  for(const rel of manifest.batFiles) {
    const source = read(rel);
    assert(!/(^|[^\r])\n/.test(source), `Unexpected bare LF: ${rel}`);
    assert(source.includes('\r\n'), `Missing CRLF: ${rel}`);
  }
});
check('CLEAN APPLY, APK Build & Share, Release and EAS block on preflight errors', () => {
  for(const [kind,rel] of Object.entries(entrypoints)) {
    const bat = read(rel).replace(/\r\n/g, '\n');
    assert(bat.includes('node scripts\\test-h22r3-windows-build-preflight.cjs\nif errorlevel 1 goto :fail'),
      `${kind} is missing H22R3 gate`);
  }
});
check('the direct Release build keeps AAPT2 verification before Gradle compile', () => {
  const source=read(entrypoints.release).replace(/\r\n/g,'\n');
  const mustFind = [
    'check-android-resource-names.js --source-only',
    'expo prebuild --platform android',
    'stage-board-audio-native.js',
    'check-android-resource-names.js\nif errorlevel 1 goto :fail',
    'call gradlew.bat :app:assembleRelease',
  ];
  let previous=-1;
  for(const marker of mustFind) {
    const current=source.indexOf(marker,previous+1);
    assert(current > previous,`Bad Android preflight order or missing marker: ${marker}`);
    previous=current;
  }
});
check('AAPT2 regression test is invoked before Gradle by direct Release',()=>{
  const source=read(entrypoints.release);
  const test=source.indexOf('test-phase-p2_37r2c_h21r3-android-aapt-audio.cjs');
  const gradle=source.indexOf(':app:assembleRelease');
  assert(test>0 && gradle>test);
});
check('Build & Share delegates to guarded direct Release APK compiler',()=>{
  const source=read(entrypoints.share);
  assert(source.includes('Family_Bloom_Android_Test_App_RELEASE.bat'));
  assert(source.includes('verify-apk-copy-sha256.cjs'));
});
check('Windows BAT manifest structural audit passes in actual source tree',()=>{
  const r=spawnSync(process.execPath,[path.join(root,'scripts/setup/check-build-entrypoints.js')],{cwd:root,encoding:'utf8',timeout:20000});
  assert.strictEqual(r.status,0,(r.stdout||'')+'\n'+(r.stderr||''));
  assert(r.stdout.includes('0 unmanaged'), 'canonical BAT manifest has untracked scripts');
});
console.log(`H22R3 Windows Build & Share preflight: ${passed}/${passed} PASS`);
