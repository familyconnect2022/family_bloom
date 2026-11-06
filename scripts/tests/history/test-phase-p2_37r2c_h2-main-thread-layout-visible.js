const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__legacyScriptsDir, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass = 0, fail = 0;
const check = (ok, msg) => { if (ok) { pass++; console.log(`[PASS] ${msg}`); } else { fail++; console.error(`[FAIL] ${msg}`); } };

console.log('\nFamily Bloom P2.37R2C-H2 — native UI-thread + layout visibility gate\n');
const kt = read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt');
const rootAndroid = read('src/components/games/BoardGamePresentationRoot.android.tsx');
const screen = read('src/app/(internal)/board-game-bot-test.tsx');
const app = JSON.parse(read('app.json'));
const mod = JSON.parse(read('modules/family-bloom-overlay/package.json'));

check(kt.includes('import expo.modules.kotlin.functions.Queues'), 'Kotlin imports Expo Queues');
check((kt.match(/\.runOnQueue\(Queues\.MAIN\)/g) || []).length >= 4, 'all module host AsyncFunctions are forced onto MAIN queue');
check(kt.includes('NATIVE_HOST_LAYOUT_READY') && kt.includes('hasHostSize()'), 'host requires explicit non-zero layout readiness');
check(kt.includes('confirmFullVisible(') && kt.includes('fullContainer.width > 0') && kt.includes('fullContainer.height > 0'), 'Full Surface visibility is verified after native layout');
check(kt.includes('completeProbeIfVisible()') && kt.includes('NATIVE_HOST_PROBE_VISIBLE'), 'probe PASS is emitted only from confirmed Full visibility path');
check(!/applyPresentation\(\)\s*\n\s*emit\("NATIVE_HOST_PROBE_VISIBLE"/.test(kt), 'probe no longer emits false visible immediately after applyPresentation');
check(rootAndroid.includes('useWindowDimensions') && rootAndroid.includes('width: window.width') && rootAndroid.includes('height: window.height'), 'React gives native host explicit authenticated-window dimensions');
check(app.expo?.version === '1.3.7' && app.expo?.android?.versionCode === 143017, 'H2 Android identity = 1.3.7 / 143017');
check(mod.version === '1.3.3', 'native module version = 1.3.3');
check(kt.includes('P2.37R2C-H2-native-1'), 'Kotlin native identity = P2.37R2C-H2-native-1');
check(screen.includes('143017') && screen.includes('P2.37R2C-H2-native-1'), 'developer test screen requires H2 binary identity');

console.log(`\nP2.37R2C-H2 native thread/layout gate: ${fail ? 'FAIL' : 'PASS'} (${pass}/${pass + fail})\n`);
process.exit(fail ? 1 : 0);
