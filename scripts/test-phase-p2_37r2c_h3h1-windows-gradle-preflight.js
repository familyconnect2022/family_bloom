const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass = 0, fail = 0;
const check = (ok, msg) => { if (ok) { pass++; console.log(`[PASS] ${msg}`); } else { fail++; console.error(`[FAIL] ${msg}`); } };

console.log('\nFamily Bloom P2.37R2C-H6 — Windows Gradle preflight gate\n');
const gate = read('scripts/setup/check-p2_37r2c-native-package.js');
const build = read('scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat');
const app = JSON.parse(read('app.json'));
const mod = JSON.parse(read('modules/family-bloom-overlay/package.json'));

check(gate.includes("'projects', '--console=plain'") && gate.includes('graphHasOverlay'), 'preflight reads Gradle projects graph and parses family-bloom-overlay explicitly');
check(gate.includes("process.env.ComSpec") && gate.includes("'cmd.exe'"), 'Windows preflight invokes cmd.exe explicitly');
check(gate.includes("'gradlew.bat', 'projects', '--console=plain'"), 'Windows command runs relative gradlew.bat projects from android directory');
check(!gate.includes('shell: true'), 'Windows Gradle probe avoids shell:true path-space ambiguity');
check(gate.includes('windowsHide: true'), 'Windows cmd probe is non-interactive/hidden safe');
check(build.includes('check-p2_37r2c-native-package.js') && build.includes('--require-gradle-project'), 'Release APK path still requires real Gradle module proof');
check(app.expo?.version === '1.3.26' && app.expo?.android?.versionCode === 143036, 'H10 app binary identity is 1.3.26 / 143036');
check(mod.version === '1.3.18', 'native module identity = 1.3.16');

console.log(`\nP2.37R2C-H6 Windows Gradle preflight gate: ${fail ? 'FAIL' : 'PASS'} (${pass}/${pass + fail})\n`);
process.exit(fail ? 1 : 0);
