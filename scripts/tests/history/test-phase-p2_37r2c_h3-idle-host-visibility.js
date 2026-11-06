const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__legacyScriptsDir, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass = 0, fail = 0;
const check = (ok, msg) => { if (ok) { pass++; console.log(`[PASS] ${msg}`); } else { fail++; console.error(`[FAIL] ${msg}`); } };

console.log('\nFamily Bloom P2.37R2C-H3 — idle native host visibility/isolation gate\n');
const kt = read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt');
const rootAndroid = read('src/components/games/BoardGamePresentationRoot.android.tsx');
const screen = read('src/app/(internal)/board-game-bot-test.tsx');
const app = JSON.parse(read('app.json'));
const mod = JSON.parse(read('modules/family-bloom-overlay/package.json'));

check(kt.includes('import expo.modules.kotlin.functions.Queues') && (kt.match(/\.runOnQueue\(Queues\.MAIN\)/g) || []).length >= 4, 'H2 MAIN-thread fix remains enforced for host AsyncFunctions');
check(kt.includes('NATIVE_HOST_LAYOUT_READY') && kt.includes('hasHostSize()'), 'H2 non-zero host layout gate remains enforced');
check(kt.includes('confirmFullVisible(') && kt.includes('fullContainer.width > 0') && kt.includes('fullContainer.height > 0'), 'H2 Full Surface visible-confirmation remains enforced');
check(kt.includes('visibility = View.INVISIBLE') && kt.includes('overlayRoot.visibility = View.INVISIBLE'), 'host root + overlayRoot start INVISIBLE');
check(kt.includes('setBackgroundColor(Color.TRANSPARENT)') && kt.includes('overlayRoot.setBackgroundColor(Color.TRANSPARENT)'), 'host root + overlayRoot are explicitly transparent');
check(!/onAttachedToWindow\(\)[\s\S]{0,420}promoteAboveScreenStack\("attach/.test(kt), 'onAttachedToWindow never promotes the idle host');
check(kt.includes('if (mode == "idle") hideHostRoot("attach-idle")'), 'attach path explicitly hides root while idle');
check(kt.includes('revealHostForPresentation("presentation-full")') && kt.includes('revealHostForPresentation("presentation-mini")'), 'Full/Mini reveal host only when presentation is active');
check(kt.includes('nativeProofVisible = true') && kt.includes('revealHostForPresentation("native-proof")'), 'native proof explicitly reveals host instead of relying on attach promotion');
check(kt.includes('hideHostRoot("native-proof-ended")'), 'native proof returns idle host to INVISIBLE');
check(kt.includes('NATIVE_HOST_IDLE_HIDDEN') && kt.includes('NATIVE_HOST_PRESENTATION_VISIBLE'), 'diagnostics expose idle-hidden vs presentation-visible states');
check(kt.includes('elevation = 0f') && kt.includes('translationZ = 0f'), 'idle root drops native Z/elevation to zero');
check(kt.includes('hostVisibility') && kt.includes('overlayVisibility') && kt.includes('backgroundTransparent'), 'diagnostics include root visibility + transparency metadata');
check(rootAndroid.includes('backgroundColor: "transparent"'), 'React native host style is explicitly transparent too');
check(app.expo?.version === '1.3.8' && app.expo?.android?.versionCode === 143018, 'H3 Android identity = 1.3.8 / 143018');
check(mod.version === '1.3.4', 'native module version = 1.3.4');
check(kt.includes('P2.37R2C-H3-native-1'), 'Kotlin native identity = P2.37R2C-H3-native-1');
check(screen.includes('143018') && screen.includes('P2.37R2C-H3-native-1'), 'developer test screen requires H3 binary identity');

console.log(`\nP2.37R2C-H3 idle-host gate: ${fail ? 'FAIL' : 'PASS'} (${pass}/${pass + fail})\n`);
process.exit(fail ? 1 : 0);
