#!/usr/bin/env node
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const root = path.resolve(__legacyScriptsDir, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
let pass = 0, fail = 0;
function check(ok, label) {
  if (ok) { pass++; console.log(`PASS ${String(pass+fail).padStart(2,'0')} - ${label}`); }
  else { fail++; console.error(`FAIL ${String(pass+fail).padStart(2,'0')} - ${label}`); }
}

console.log('\nFamily Bloom P2.36 — Android Native Presentation Plane\n');
const native = read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt');
const config = JSON.parse(read('modules/family-bloom-overlay/expo-module.config.json'));
const androidRoot = read('src/components/games/BoardGamePresentationRoot.android.tsx');
const fallbackRoot = read('src/components/games/BoardGamePresentationRoot.tsx');
const nativeBridge = read('src/services/games/boardGameNativeOverlay.ts');
const diagnostics = read('src/services/games/boardGamePresentationDiagnostics.ts');
const store = read('src/services/games/boardGamePresentationStore.ts');
const bridge = read('src/services/games/boardGamePresentationBridge.ts');
const testScreen = read('src/app/(internal)/board-game-bot-test.tsx');
const clean = read('scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat');
const pkg = JSON.parse(read('package.json'));
const app = JSON.parse(read('app.json'));

check(config.platforms?.includes('android') && config.android?.modules?.includes('expo.modules.familybloomoverlay.FamilyBloomOverlayModule'), 'Local Expo module autolinks Android native presentation module');
check(native.includes('PopupWindow') && native.includes('showAtLocation'), 'Android plane uses Activity-attached PopupWindow instead of React sibling zIndex');
check(native.includes('setTouchModal(false)') && native.includes('Build.VERSION_CODES.Q'), 'Android mini window allows touches outside its own bounds on modern Android');
check(native.includes('fullContainer') && native.includes('miniContainer') && native.includes('NATIVE_CONTAINERS_CREATED'), 'Persistent Full + Mini native containers are created once');
check(native.includes('0.85f') && native.includes('0.90f'), 'Native geometry keeps Full=85% screen and game layers=90% Full');
check(native.includes('#D94F87') && native.includes('#D3A11F'), 'Native Chess pink and Xiangqi gold layers are retained');
check(native.includes('POPUP_SHOW_REQUEST') && native.includes('POPUP_SHOWN') && native.includes('POPUP_FIRST_LAYOUT') && native.includes('POPUP_SHOW_FAILED'), 'Native plane emits attach/layout/failure diagnostics');
check(native.includes('PROBE_VISIBLE') && native.includes('PROBE_RESTORED'), 'Independent native-plane probe is implemented');
check(native.includes('MINI_SNAPPED') && native.includes('action("restore"'), 'Native Mini remains draggable/snapping and tap restores Full');

check(androidRoot.includes('return null;') && !androidRoot.includes('<View'), 'Android root is controller-only and no longer renders a sibling React Surface');
check(androidRoot.includes('setBoardGameNativePresentation') && androidRoot.includes('ROOT_RECEIVED_STORE'), 'Android root forwards store snapshots directly to native plane with diagnostics');
check(androidRoot.includes('subscribeBoardGameNativeActions') && androidRoot.includes('minimizeBoardGamePresentation') && androidRoot.includes('restoreBoardGamePresentation'), 'Native minimize/restore/close actions feed the canonical store');
check(nativeBridge.includes('NATIVE_MODULE_MISSING') && read('modules/family-bloom-overlay/index.ts').includes('requireOptionalNativeModule'), 'Old binaries fail diagnostically instead of crashing when native module is absent');

check(diagnostics.includes('subscribeBoardGamePresentationDiagnostics') && diagnostics.includes('recent = [event, ...recent].slice(0, 80)'), 'Presentation diagnostics bus retains 80 precise events');
check(store.includes('STORE_PUBLISH') && bridge.includes('CHESS_STATE_RECEIVED') && bridge.includes('XIANGQI_STATE_RECEIVED'), 'Store and independent Chess/Xiangqi bridges emit stage-specific diagnostics');
check(testScreen.includes('scope: "Chess" | "Xiangqi" | "Surface"') && testScreen.includes('Native Surface P2.36'), 'Developer test screen exposes Surface-specific logs');
check(testScreen.includes('Test Surface Chess (1,8 giây)') && testScreen.includes('Test Surface Cờ tướng (1,8 giây)'), 'Developer test screen has direct native-plane probes independent of server/session');
check(fallbackRoot.includes('width: "90%"') && fallbackRoot.includes('height: "90%"'), 'Non-Android fallback keeps the P2.34 stacked 90% views');

let syntax = true;
for (const file of [
  'src/components/games/BoardGamePresentationRoot.android.tsx',
  'src/services/games/boardGameNativeOverlay.ts',
  'src/services/games/boardGamePresentationDiagnostics.ts',
  'src/services/games/boardGamePresentationStore.ts',
  'src/services/games/boardGamePresentationBridge.ts',
  'src/app/(internal)/board-game-bot-test.tsx',
  'modules/family-bloom-overlay/index.ts',
]) {
  const result = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX }, reportDiagnostics: true, fileName: file });
  if ((result.diagnostics || []).some((d) => d.category === ts.DiagnosticCategory.Error)) syntax = false;
}
check(syntax, 'P2.36 TS/TSX sources transpile without syntax diagnostics');
check(pkg.scripts?.['phaseP2_36:check'] === 'node ./scripts/tests/history/test-phase-p2_36-android-native-presentation-plane.js', 'P2.36 regression gate is registered');
check(clean.includes('phaseP2_36:check'), 'CLEAN APPLY executes P2.36 native-plane gate');
check(app.expo?.android?.versionCode === 143011, 'Android versionCode bumped because P2.36 adds native code');

console.log(`\nP2.36 native presentation plane: ${pass}/${pass+fail} PASS`);
process.exit(fail ? 1 : 0);
