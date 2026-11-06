#!/usr/bin/env node
'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
/** Assert the P2.34 release regression is blocked before modifying any old source. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__legacyScriptsDir, '..');
const read = name => fs.readFileSync(path.join(root,name),'utf8');
const assert = (okay,msg) => { if (!okay) throw new Error(msg); console.log('PASS '+msg); };
const updater = read('scripts/maintenance/auto-update-full.cjs');
const auto = read('scripts/android/maintenance/Family_Bloom_AUTO_UPDATE_FULL.bat');
const clean = read('scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat');
const release = read('scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat');
const debug = read('scripts/android/dev/Family_Bloom_Android_Debug_Build_And_Run.bat');
const pkg = JSON.parse(read('package.json'));
const preflight = read('scripts/tests/release/test-h25r2r2-release-preflight.cjs');
const checkCmd = 'node scripts\\tests\\release\\test-h25r2r2-release-preflight.cjs\r\nif errorlevel 1 goto :fail';
assert(updater.includes("if(mode==='check')") && updater.includes('scripts/tests/release/test-h25r2r2-release-preflight.cjs'),
  'automatic updater validates extracted release source');
assert(auto.indexOf('auto-update-full.cjs" check') < auto.indexOf('[1/6] Backing up') &&
       auto.indexOf('[1/6] Backing up') < auto.indexOf('auto-update-full.cjs" overlay'),
  'preflight occurs before backup, cleanup, and overlay');
assert(preflight.includes('test-phase-p2_34-session-presentation-bridge-stacked-views.js') &&
       preflight.includes('test-phase-p2_35-already-in-game-recovery-surface.js'),
  'source-only preflight includes both old failing and next presentation gates');
for (const [name,bat] of [['CLEAN APPLY',clean],['Build & Share',release],['Debug',debug]]) {
  assert(bat.includes(checkCmd) && !/(?<!\r)\n/.test(bat),`${name} runs H25R2R2 gate with Windows CRLF`);
}
assert(pkg.scripts['eas-build-post-install'].startsWith('node scripts/tests/release/test-h25r2r2-release-preflight.cjs &&'),
  'EAS post-install runs current preflight');
assert(read('src/app/(home)/(games)/home-games.tsx').includes('router.push("/home-xiangqi" as never)'),
  'Home Xiangqi card still opens the live lobby');
console.log('H25R2R2 updater/build wiring PASS (8/8)');
