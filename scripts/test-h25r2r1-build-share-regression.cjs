#!/usr/bin/env node
'use strict';
/** H25R2R1: execute the old Chess controller mock gates that previously broke
 * Windows Build & Share after AppState was introduced. Node-only; no APK claim.
 * Must run after the root TypeScript dependency gate.
 */
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const source = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const guards = [
  ['H11 ready phase + Full/Mini', 'scripts/test-phase-p2_37r2c_h11-chess-full-mini-flow.js'],
  ['H13 result dismissal + bridge', 'scripts/test-phase-p2_37r2c_h13-bloom-results-return.js'],
  ['H14 black piece permission', 'scripts/test-phase-p2_37r2c_h14-chess-color-mini-edge.js'],
  ['H15 release authority', 'scripts/test-phase-p2_37r2c_h15-chess-authority-dev-release.js'],
  ['H17 optimistic controller', 'scripts/test-phase-p2_37r2c_h17-chess-optimistic-authority.js'],
];
const bats = [
  'scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat',
  'scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat',
  'scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat',
  'scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat',
];
for (const bat of bats) {
  const data = fs.readFileSync(path.join(root, bat));
  const content = data.toString('utf8');
  if (/(?<!\r)\n/.test(content) ||
      !content.includes('node scripts\\test-h25r2r1-build-share-regression.cjs\r\nif errorlevel 1 goto :fail')) {
    console.error('[FAIL] Missing/faulty regression gate or CRLF in ' + bat);
    process.exit(1);
  }
  const ensure = content.indexOf('Family_Bloom_ENSURE_GATE_DEPENDENCIES.bat');
  const run = content.indexOf('node scripts\\test-h25r2r1-build-share-regression.cjs');
  if (ensure < 0 || run <= ensure) {
    console.error('[FAIL] Gate must run after TypeScript dependencies: ' + bat);
    process.exit(1);
  }
}
for (const [name, file] of guards) {
  // The controller now imports React Native AppState, so a Node-only VM test
  // must provide a deterministic AppState mock. No real RN needs to load.
  const s = source(file);
  // H11 exercises store and server READY guards, not the controller.
  if (!file.includes('h11-chess-full-mini') &&
      (!s.includes("'react-native'") || !s.includes('AppState') || !s.includes('addEventListener'))) {
    console.error(`[FAIL] ${name}: test is missing a React Native AppState mock`);
    process.exit(1);
  }
  const r = spawnSync(process.execPath, [path.join(root, file)], {
    cwd: root, env: process.env, encoding: 'utf8', timeout: 30000,
  });
  if (r.error || r.status !== 0) {
    console.error(`[FAIL] ${name}: ${r.error?.message || `exit ${r.status}`}`);
    console.error(r.stdout || '');
    console.error(r.stderr || '');
    process.exit(1);
  }
  const summary = (r.stdout || '').trim().split(/\r?\n/).at(-1);
  console.log(`[PASS] ${name}: ${summary}`);
}
console.log('[PASS] H25R2R1 Build & Share mock/READY regression: 5/5 executable gates, 4/4 BAT entrypoints');
