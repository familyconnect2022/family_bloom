#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
let failed = 0; let passed = 0;
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));
const check = (cond, msg) => { if (cond) { passed++; console.log(`PASS ${msg}`); } else { failed++; console.error(`FAIL ${msg}`); } };

console.log('\nFamily Bloom P2.37R1 — native binary proof gate\n');
const pkg = json('package.json');
const app = json('app.json');
const modPkg = json('modules/family-bloom-overlay/package.json');
const cfg = json('modules/family-bloom-overlay/expo-module.config.json');
const native = read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt');
const ts = read('modules/family-bloom-overlay/index.ts');
const svc = read('src/services/games/boardGameNativeOverlay.ts');
const screen = read('src/app/(internal)/board-game-bot-test.tsx');
const easBat = read('scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat');
const clean = read('scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat');
const easIgnore = read('.easignore');

check(pkg.dependencies?.['family-bloom-overlay'] === 'file:modules/family-bloom-overlay', 'FamilyBloomOverlay is a direct file: app dependency');
check(pkg.expo?.autolinking?.nativeModulesDir === './modules', 'Expo local nativeModulesDir remains explicit');
check(modPkg.version === '1.2.0' && modPkg.name === 'family-bloom-overlay', 'local native module package identity is versioned for R1');
check(cfg.android?.modules?.includes('expo.modules.familybloomoverlay.FamilyBloomOverlayModule'), 'Expo module config registers Kotlin module');
check(native.includes('P2.37R1-native-1'), 'Kotlin binary embeds immutable R1 native identity');
check(native.includes('AsyncFunction("getNativeIdentity")') && native.includes('AsyncFunction("proveHost")'), 'native module exposes binary identity + host proof APIs');
check(native.includes('NATIVE HOST OK') && native.includes('NATIVE_BINARY_PROOF_VISIBLE'), 'native host itself paints a visible proof badge');
check(ts.includes('getFamilyBloomOverlayNativeIdentity') && ts.includes('proveFamilyBloomOverlayNativeHost'), 'JS module wrapper exposes native identity/proof');
check(svc.includes('getBoardGameNativeBinaryIdentity') && svc.includes('runBoardGameNativeBinaryProof') && svc.includes('from "family-bloom-overlay"'), 'game-native service uses the direct native package and has explicit binary proof flow');
check(screen.includes('JS phase: P2.37R1') && screen.includes('FamilyBloomOverlay:') && screen.includes('1. Kiểm tra Native Host R1'), 'Developer test UI shows JS/native identity and proof step 1');
check(app.expo?.android?.versionCode === 143013 && app.expo?.version === '1.3.3', 'Android binary version bumped for R1 rebuild');
check(pkg.scripts?.['eas-build-post-install']?.includes('check-p2_37r1-native-package.js'), 'EAS post-install hard gate validates native package after prebuild');
check(pkg.scripts?.['eas-build-on-success']?.includes('check-p2_37r1-eas-apk-proof.js'), 'EAS on-success hook scans built APK');
check(easBat.includes('--clear-cache') && easBat.includes('--require-node-module --require-resolve'), 'EAS helper forces clean native build + local dependency resolver proof');
check(clean.includes('node_modules\\family-bloom-overlay\\package.json') && clean.includes('phaseP2_37R1:check'), 'CLEAN APPLY forces local module install and R1 gate');
check(easIgnore.includes('!modules/**'), '.easignore explicitly uploads local native modules');
check(read('scripts/setup/check-p2_37r1-apk-native-proof.js').includes('FamilyBloomOverlayHostView') && read('scripts/setup/check-p2_37r1-apk-native-proof.js').includes('P2.37R1-native-1'), 'APK DEX proof requires module + HostView + native identity');
check(read('scripts/setup/check-p2_37r1-native-package.js').includes('Gradle project graph contains family-bloom-overlay'), 'native preflight can prove Gradle subproject is linked');
check(!native.includes('PopupWindow'), 'R1 keeps authenticated native sibling architecture; Activity PopupWindow remains retired');

console.log(`\nP2.37R1 native binary proof gate: ${failed ? 'FAIL' : 'PASS'} (${passed}/${passed+failed})\n`);
process.exit(failed ? 1 : 0);
