#!/usr/bin/env node
'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
// H23R3 regression: Guard TypeScript prerequisites BEFORE dependency-based release gates.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__legacyScriptsDir,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
let count=0;
const test=(label,fn)=>{fn();count++;console.log('PASS H23R3 '+String(count).padStart(2,'0')+' - '+label);};
const helper='scripts/android/maintenance/Family_Bloom_ENSURE_GATE_DEPENDENCIES.bat';
const callLine='call "%PROJECT_ROOT%\\scripts\\android\\maintenance\\Family_Bloom_ENSURE_GATE_DEPENDENCIES.bat"';
const share='scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat';
const release='scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat';
const eas='scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat';
const clean='scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat';
const bat=read(helper);
test('TypeScript helper shipped in canonical BAT manifest',()=>assert(JSON.parse(read('scripts/setup/bat-entrypoints-manifest.json')).batFiles.includes(helper)));
test('helper resolves project root with quoted path',()=>assert(bat.includes('cd /d "%PROJECT_ROOT%"')));
test('helper checks root TypeScript independently of server fallback',()=>assert(bat.includes('require.resolve(\'typescript\')')));
test('helper installs development dependencies when TypeScript is absent',()=>assert(bat.includes('call npm install --include=dev --no-audit --no-fund')));
test('helper rechecks TypeScript after installation',()=>assert(bat.split('require.resolve(\'typescript\')').length===3));
test('helper stops safely on npm failure',()=>assert(bat.includes('if errorlevel 1 (')&&bat.includes('APK compilation NOT started')));
for(const [name,rel,firstGate] of [
  ['Build and Share',share,'node scripts\\tests\\release\\test-h22-xiangqi-parity.cjs'],
  ['direct Release',release,'node scripts\\tests\\release\\test-h22-xiangqi-parity.cjs'],
  ['EAS Build',eas,'node scripts\\setup\\check-ts-syntax-transpile.js'],
  ['Clean Apply',clean,'node scripts\\tests\\release\\test-h22-xiangqi-parity.cjs'],
]) {
  test(name+' calls helper before TypeScript-dependent gate',()=>{
    const src=read(rel), i=src.indexOf(callLine), j=src.indexOf(firstGate);
    assert(i>0 && j>i, name+' dependency order broken');
    assert(src.slice(i,i+callLine.length+60).includes('if errorlevel 1 goto :fail'),name+' must stop on error');
  });
}
test('Clean Apply recognizes missing TypeScript as reason to install',()=>assert(read(clean).includes('if not exist "node_modules\\typescript\\package.json" set "NEED_INSTALL=1"')));
test('H23R2 Xiangqi runtime parity script remains present',()=>assert(fs.existsSync(path.join(root,'scripts/tests/release/test-h22-xiangqi-parity.cjs'))));
test('H23R2 dual app runtime regression script remains present',()=>assert(fs.existsSync(path.join(root,'scripts/tests/release/test-h23r2-dual-app-presence.cjs'))));
test('Root package declares TypeScript as devDependency',()=>assert(require(path.join(root,'package.json')).devDependencies.typescript));
console.log('PASS H23R3 dependency bootstrap: '+count+'/'+count);
