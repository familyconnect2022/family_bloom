#!/usr/bin/env node
'use strict';
// Source-only preflight, works without node_modules and on Windows.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=JSON.parse(read('package.json'));
for(const name of ['expo-image-manipulator','expo-file-system']){
  assert(pkg.dependencies?.[name]?.startsWith('~57.'),`${name} must match Expo SDK 57`);
  for(const rel of ['scripts/setup/check-expo-dependencies.js','scripts/setup/check-package-lock.js']){
    assert(read(rel).includes(`'${name}'`),`${rel} must enforce ${name}`);
  }
  assert(read('scripts/android/maintenance/Family_Bloom_ENSURE_GATE_DEPENDENCIES.bat').includes(`node_modules\\${name}\\package.json`),`bootstrap must check ${name}`);
}
assert(read('src/components/ui/BloomInputComponents/AvatarCropEditor.tsx').includes('"expo-image-manipulator"'));
assert(read('src/services/media/avatarAsyncSync.ts').includes('"expo-file-system"'));
const build=read('scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat');
assert(build.includes('test-m3r4r5r1-avatar-build-deps.cjs'));
assert(build.indexOf('test-m3r4r5r1-avatar-build-deps.cjs')<build.indexOf(':app:assembleRelease') || !build.includes(':app:assembleRelease'));
const ensure=read('scripts/android/maintenance/Family_Bloom_ENSURE_GATE_DEPENDENCIES.bat');
assert(ensure.includes('call npm install --include=dev --no-audit --no-fund'));
assert(ensure.includes('if errorlevel 1'));
console.log('[PASS] R5R1 native avatar dependencies declared, watched, and preflighted before build.');
