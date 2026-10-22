#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass = 0, fail = 0;
const check = (ok, msg) => { if (ok) { pass++; console.log(`PASS ${msg}`); } else { fail++; console.error(`FAIL ${msg}`); } };

console.log('\nFamily Bloom P2.37R2C-H5 — root Slot + offscreen IDLE host guard\n');
const rootLayout = read('src/app/_layout.tsx');
const authLayout = read('src/app/(auth)/_layout.tsx');
const tabs = read('src/app/(tabs)/_layout.tsx');
const gameHost = read('src/components/games/BoardGamePresentationRoot.android.tsx');
const eas = read('scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat');

check(rootLayout.includes('import { Slot, useRouter, useSegments } from "expo-router"') && rootLayout.includes('const navigationSurface = <Slot />'), 'root shell uses Slot instead of native Stack');
check(!rootLayout.includes('<Stack') && !authLayout.includes('<Stack'), 'root and auth layouts create no native ScreenStack');
check(rootLayout.includes('navigationPlane: { ...StyleSheet.absoluteFillObject'), 'root navigation plane is absolute full-screen');
check(authLayout.includes('<View style={styles.root} collapsable={false}>') && authLayout.includes('root: { flex: 1'), 'auth Slot has a non-collapsable full-height host');
check(tabs.includes('<View style={styles.navigatorRoot} collapsable={false}>') && tabs.includes('navigatorRoot: { ...StyleSheet.absoluteFillObject'), 'tabs navigator is pinned to the full workspace');
check(gameHost.includes('presentation.mode === "idle"') && gameHost.includes('left: -10000') && gameHost.includes('width: 1') && gameHost.includes('opacity: 0'), 'persistent native game host is physically parked offscreen while IDLE');
check(eas.includes('143040') && eas.includes('P2.37R2C-H25-native-1') && !eas.includes('P2.37R2C-H4-native-1'), 'EAS helper prints exact current binary/native identity');

console.log(`\nP2.37R2C-H5 root stability gate: ${fail ? 'FAIL' : 'PASS'} (${pass}/${pass + fail})\n`);
process.exit(fail ? 1 : 0);
