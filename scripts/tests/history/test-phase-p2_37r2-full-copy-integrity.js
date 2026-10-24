#!/usr/bin/env node
'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const root = path.resolve(__legacyScriptsDir, '..');
let failed = 0; let passed = 0;
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));
const exists = (rel) => fs.existsSync(path.join(root, rel));
const check = (cond, msg) => { if (cond) { passed++; console.log(`PASS ${msg}`); } else { failed++; console.error(`FAIL ${msg}`); } };

console.log('\nFamily Bloom P2.37R2C-H6 — FULL copy/import/native integrity gate\n');
const pkg = json('package.json');
const app = json('app.json');
const modPkg = json('modules/family-bloom-overlay/package.json');
const cfg = json('modules/family-bloom-overlay/expo-module.config.json');
const native = read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt');
const moduleTs = read('modules/family-bloom-overlay/index.ts');
const androidRoot = read('src/components/games/BoardGamePresentationRoot.android.tsx');
const nativeSvc = read('src/services/games/boardGameNativeOverlay.ts');
const screen = read('src/app/(internal)/board-game-bot-test.tsx');
const preCopy = read('scripts/android/maintenance/Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const clean = read('scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat');
const easBat = read('scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat');
const cleaner = read('scripts/setup/cleanup-overlay-routes.js');
const easIgnore = read('.easignore');

const critical = [
  'src/components/games/BoardGamePresentationRoot.tsx',
  'src/components/games/BoardGamePresentationRoot.android.tsx',
  'src/services/games/boardGamePresentationStore.ts',
  'src/services/games/boardGamePresentationBridge.ts',
  'src/services/games/boardGameNativeOverlay.ts',
  'src/services/chess/chessSocketService.ts',
  'src/services/xiangqi/xiangqiSocketService.ts',
  'src/services/xiangqi/xiangqiLocalRules.ts',
  'modules/family-bloom-overlay/index.ts',
  'modules/family-bloom-overlay/package.json',
  'modules/family-bloom-overlay/expo-module.config.json',
  'modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt',
];
check(critical.every(exists), 'all game presentation/socket/native critical files are present in FULL source');

const forbiddenDeleteDirs = ['src\\components\\games', 'src\\services\\chess', 'src\\services\\xiangqi'];
check(forbiddenDeleteDirs.every((x) => !preCopy.includes(`"${x}"`)), 'PRE_COPY never deletes current game presentation/socket directories');
const quotedTargets = [...preCopy.matchAll(/"((?:src|assets)\\[^"\r\n]+)"/g)].map((m) => m[1].replace(/\\/g, '/'));
const liveTargets = quotedTargets.filter((rel) => exists(rel));
check(liveTargets.length === 0, `PRE_COPY destructive target list contains no path that exists in the P2.37R2C-H6 FULL tree${liveTargets.length ? `: ${liveTargets.join(', ')}` : ''}`);

check(!cleaner.includes('pruneDirectoryExcept') && cleaner.includes('retiredGameServiceFiles') && cleaner.includes('xiangqiSessionBootstrap.ts'), 'post-overlay cleaner retires named legacy services only, never prunes current Chess/Xiangqi service directories');
check(!cleaner.includes("'src/components/games',") && !cleaner.includes('"src/components/games"'), 'post-overlay cleaner does not retire current game presentation directory');

check(!androidRoot.includes('family-bloom-overlay') && nativeSvc.includes('../../../modules/family-bloom-overlay'), 'Android controller renders no native wrapper; service imports local native module API directly');
check(!androidRoot.includes('from "family-bloom-overlay"') && !nativeSvc.includes('from "family-bloom-overlay"'), 'Metro no longer requires bare family-bloom-overlay import for runtime source');
check(exists('scripts/setup/check-source-import-integrity.js'), 'source import integrity scanner is packaged');
check(exists('scripts/setup/check-ts-syntax-transpile.js'), 'full TS/TSX syntax transpile scanner is packaged');
check(clean.includes('check-source-import-integrity.js') && easBat.includes('check-source-import-integrity.js'), 'CLEAN APPLY and EAS build both hard-gate the source import graph');
check(clean.includes('check-ts-syntax-transpile.js') && easBat.includes('check-ts-syntax-transpile.js'), 'CLEAN APPLY and EAS build hard-gate TS/TSX syntax after dependency install');

const importGate = spawnSync(process.execPath, [path.join(root, 'scripts/setup/check-source-import-integrity.js')], { cwd: root, encoding: 'utf8' });
check(importGate.status === 0, 'FULL source import graph resolves before packaging');

check(pkg.dependencies?.['family-bloom-overlay'] === 'file:modules/family-bloom-overlay', 'native package remains a direct file: dependency for Expo/Gradle autolinking');
check(pkg.expo?.autolinking?.nativeModulesDir === './modules', 'Expo nativeModulesDir explicitly points at ./modules');
check(modPkg.name === 'family-bloom-overlay' && modPkg.version === '1.3.18', 'local native module identity/version = family-bloom-overlay@1.3.18');
check(cfg.android?.modules?.includes('expo.modules.familybloomoverlay.FamilyBloomOverlayModule'), 'Expo module config registers FamilyBloomOverlayModule');
check(native.includes('P2.37R2C-H25-native-3') && native.includes('class FamilyBloomOverlayRail'), 'Kotlin source contains R2C native identity + decor rail');
check(native.includes('NATIVE HOST OK') && native.includes('NATIVE_BINARY_PROOF_VISIBLE'), 'native decor rail contains independent visible proof');
check(!native.includes('PopupWindow'), 'Activity-global PopupWindow remains retired');
check(moduleTs.includes('requireOptionalNativeModule') && !moduleTs.includes('requireNativeViewManager') && moduleTs.includes('setFamilyBloomOverlayPresentation'), 'local JS wrapper is module/event only; no native ViewManager enters React tree');

check(screen.includes('JS phase: P2.37R2C-H22R9') && screen.includes('P2.37R2C-H25-native-3'), 'Developer test UI identifies current H22R8 JS/native proof step');
check(app.expo?.android?.versionCode === 143042 && app.expo?.version === '1.3.32', 'Android binary version bumped to 1.3.32 / 143042');
check(pkg.scripts?.['phaseP2_37R2:check']?.includes('test-phase-p2_37r2-full-copy-integrity.js'), 'package exposes current FULL integrity gate');
check(pkg.scripts?.['eas-build-post-install']?.includes('check-p2_37r2c-native-package.js'), 'EAS post-install uses R2C native autolink proof');
check(pkg.scripts?.['eas-build-on-success']?.includes('check-p2_37r2c-eas-apk-proof.js'), 'EAS success hook uses R2C APK/Dex proof');
check(easBat.includes('--clear-cache') && !easBat.includes('--no-wait') && easBat.includes('check-p2_37r2c-native-package.js'), 'EAS helper forces clean waited build + R2C native package proof');
check(clean.includes('node_modules\\family-bloom-overlay\\package.json') && clean.includes('phaseP2_37R2C_H6:check'), 'CLEAN APPLY installs local module when needed and runs H6 decor-rail gate');
check(easIgnore.includes('!modules/**'), '.easignore explicitly uploads local native modules');
const eas = json('eas.json');
check(eas.cli?.appVersionSource === 'local', 'EAS CLI locks appVersionSource=local so app.json versionCode reaches APK');
check(read('scripts/setup/check-p2_37r2c-apk-native-proof.js').includes('FamilyBloomOverlayRail') && read('scripts/setup/check-p2_37r2c-apk-native-proof.js').includes('P2.37R2C-H25-native-3'), 'APK DEX proof requires native module + decor rail + exact R2C identity');
const nativePreflight = read('scripts/setup/check-p2_37r2c-native-package.js');
check(nativePreflight.includes('graphHasOverlay') && nativePreflight.includes("process.env.ComSpec") && nativePreflight.includes("'gradlew.bat', 'projects', '--console=plain'") && !nativePreflight.includes('shell: true'), 'native preflight proves Gradle project graph with Windows-space-safe cmd invocation');

console.log(`\nP2.37R2C-H6 FULL copy/import/native integrity gate: ${failed ? 'FAIL' : 'PASS'} (${passed}/${passed + failed})\n`);
process.exit(failed ? 1 : 0);
