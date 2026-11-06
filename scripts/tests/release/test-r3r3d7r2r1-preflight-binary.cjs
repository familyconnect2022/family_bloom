#!/usr/bin/env node
'use strict';
/** Regression for the R3R3D7R2R1 source-only Windows Auto Update preflight.
 * Checks the CURRENT binary identity without bypassing historical H13 gameplay gates.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const rd = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const app = JSON.parse(rd('app.json')).expo;
const pkg = JSON.parse(rd('package.json'));
assert.equal(app.version, '1.3.35', 'Expo Android source version must be the release version');
assert.equal(pkg.version, '1.3.35', 'package.json and app.json must agree');
assert.equal(app.android.versionCode, 143045, 'New Android APK must retain its unique versionCode');
assert.equal(app.android.package, 'com.familybloom.android');
const kotlin = rd('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt');
assert(kotlin.includes('P2.37R2C-H25-native-3'), 'Native Kotlin game overlay identity must remain intact');
for (const rel of [
  'scripts/setup/check-p2_37r2c-native-package.js',
  'scripts/setup/check-p2_37r2c-apk-native-proof.js',
  'scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat',
  'scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat',
  'src/app/(internal)/board-game-bot-test.tsx'
]) {
  const text = rd(rel);
  assert(text.includes('143045'), rel + ' does not verify the current binary');
  assert(!text.includes('143044'), rel + ' still references the previous APK version');
}
const helper = rd('scripts/android/maintenance/Family_Bloom_ENSURE_GATE_DEPENDENCIES.bat');
for (const module of ['typescript','expo-image-manipulator','expo-file-system','@expo-google-fonts/lora']) {
  assert(helper.includes(`'${module}'`), 'Missing install verification: ' + module);
}
// Execute the actual H13 native/JS controller source test, not a mocked PASS.
const h13 = cp.spawnSync(process.execPath, ['scripts/tests/history/test-phase-p2_37r2c_h13-bloom-results-return.js'], {
  cwd:root, encoding:'utf8', timeout:30000, env:{...process.env, NODE_PATH:path.join(root,'scripts/vendor')}
});
assert.equal(h13.status, 0, `${h13.stderr || ''}\n${h13.stdout || ''}`);
assert(h13.stdout.includes('H13 Bloom UI + immediate-return gate: PASS (20/20)'));
console.log('R3R3D7R2R1 BINARY + H13 PRECHECK PASS (1.3.35 / 143045, 20/20 H13)');
