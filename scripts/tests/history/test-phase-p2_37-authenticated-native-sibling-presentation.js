#!/usr/bin/env node
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__legacyScriptsDir, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass = 0, fail = 0;
function check(ok, label) {
  if (ok) { pass++; console.log(`PASS ${String(pass+fail).padStart(2,'0')} - ${label}`); }
  else { fail++; console.error(`FAIL ${String(pass+fail).padStart(2,'0')} - ${label}`); }
}

console.log('\nFamily Bloom P2.37 — Authenticated Native Sibling Presentation\n');
const layout = read('src/app/_layout.tsx');
const rootAndroid = read('src/components/games/BoardGamePresentationRoot.android.tsx');
const native = read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt');
const moduleTs = read('modules/family-bloom-overlay/index.ts');
const nativeBridge = read('src/services/games/boardGameNativeOverlay.ts');
const testScreen = read('src/app/(internal)/board-game-bot-test.tsx');
const app = JSON.parse(read('app.json'));
const pkg = JSON.parse(read('package.json'));
const config = JSON.parse(read('modules/family-bloom-overlay/expo-module.config.json'));
const localPkg = JSON.parse(read('modules/family-bloom-overlay/package.json'));

check(layout.includes('authenticatedGameShellReady = !!user && !!activeFamilyId'), 'Game presentation host is gated by authenticated user + active family');
check(layout.includes('{authenticatedGameShellReady ? <BoardGamePresentationRoot') && layout.indexOf('<DeferredFamilyPrewarm') < layout.indexOf('{authenticatedGameShellReady ? <BoardGamePresentationRoot'), 'Native game host is mounted last in authenticated FamilySession after navigator/prewarm siblings');
check(layout.includes('if (authenticatedGameShellReady) return;') && layout.includes('closeBoardGamePresentation();'), 'Logout/no-family deterministically clears presentation before host disappears');
check(!rootAndroid.includes('PopupWindow') && rootAndroid.includes('<FamilyBloomOverlayHost'), 'Android presentation root renders native host View instead of Activity PopupWindow');
check(rootAndroid.includes('pointerEvents="box-none"') && rootAndroid.includes('StyleSheet.absoluteFillObject'), 'Full-screen native host lets touches outside Full/Mini pass through to authenticated routes');
check(rootAndroid.includes('AUTH_PRESENTATION_ROOT_MOUNTED') && rootAndroid.includes('ROOT_RECEIVED_STORE'), 'JS root emits authenticated mount and store diagnostics');

check(native.includes('class FamilyBloomOverlayHostView') && native.includes(': ExpoView'), 'Presentation plane is an Expo native View sibling');
check(native.includes('bringToFront()') && native.includes('translationZ') && native.includes('elevation'), 'Native host promotes itself above ScreenStack using native hierarchy/Z, not React zIndex');
check(native.includes('siblingPayload()') && native.includes('childIndex') && native.includes('siblings'), 'Native diagnostics report parent class, child index/count and sibling native classes');
check(native.includes('NATIVE_HOST_ATTACHED') && native.includes('NATIVE_HOST_FIRST_LAYOUT') && native.includes('NATIVE_HOST_PROMOTED'), 'Native attach/layout/promotion stages are explicitly logged');
check(native.includes('NATIVE_HOST_FULL_VISIBLE') && native.includes('NATIVE_HOST_MINI_VISIBLE') && native.includes('NATIVE_HOST_IDLE'), 'Native visibility state is logged for Full/Mini/Idle');
check(native.includes('fullContainer') && native.includes('miniContainer') && native.includes('NATIVE_HOST_CONTAINERS_CREATED'), 'Persistent Full + Mini containers are created once inside native host');
check(native.includes('0.85f') && native.includes('0.90f'), 'Full remains 85% host and each game layer 90% Full');
check(native.includes('#D94F87') && native.includes('#D3A11F'), 'Chess deep pink and Xiangqi deep gold layers remain separate');
check(native.includes('NATIVE_HOST_DESTROYED') && native.includes('NATIVE_HOST_DETACHED'), 'Native host cleanup is explicit when authenticated shell is removed');
check(native.includes('onInterceptTouchEvent') && native.includes('onTouchEvent'), 'Native host does not intercept background route touches itself');

check(moduleTs.includes('requireNativeViewManager') && moduleTs.includes('requireOptionalNativeModule'), 'JS binding requires real native ViewManager and safely diagnoses missing binaries');
check(localPkg.name === 'family-bloom-overlay', 'Local Expo native module has explicit package identity');
check(config.android?.modules?.includes('expo.modules.familybloomoverlay.FamilyBloomOverlayModule'), 'Expo module config registers Android module class');
check(pkg.expo?.autolinking?.nativeModulesDir === './modules', 'Root package explicitly pins local native module directory');
check(pkg.scripts?.['eas-build-post-install']?.includes('check-p2_37-native-autolink.js --require-resolve') || pkg.scripts?.['eas-build-post-install']?.includes('check-p2_37r1-native-package.js') || pkg.scripts?.['eas-build-post-install']?.includes('check-p2_37r2-native-package.js') || pkg.scripts?.['eas-build-post-install']?.includes('check-p2_37r2c-native-package.js'), 'EAS Android post-install hook hard-fails if native autolink resolution misses module');
check(pkg.scripts?.['phaseP2_37:check'] === 'node ./scripts/tests/history/test-phase-p2_37-authenticated-native-sibling-presentation.js', 'P2.37 regression gate is registered');
check((app.expo?.android?.versionCode ?? 0) >= 143012, 'Android versionCode bumped for new native host binary');

check(nativeBridge.includes('NATIVE_HOST_STATUS') && nativeBridge.includes('AUTH_HOST_PROBE_ACCEPTED'), 'Native host service reports mounted status and probe acceptance precisely');
check(testScreen.includes('Native Surface P2.37') && testScreen.includes('NATIVE_HOST_ATTACHED') && testScreen.includes('NATIVE_HOST_FULL_VISIBLE'), 'Developer test screen explains exact P2.37 native sibling checkpoints');
check(testScreen.includes('runBoardGameNativePlaneProbe("chess")') && testScreen.includes('runBoardGameNativePlaneProbe("xiangqi")'), 'Independent Chess/Xiangqi native-host probes remain available');

check(fs.existsSync(path.join(root, 'scripts/setup/check-p2_37-native-autolink.js')), 'Native autolink hard-gate script is packaged');
check(fs.existsSync(path.join(root, 'scripts/setup/check-p2_37-apk-native-class.js')), 'APK DEX native-class verifier is packaged');

console.log(`\nP2.37 authenticated native sibling: ${pass}/${pass+fail} PASS`);
process.exit(fail ? 1 : 0);
