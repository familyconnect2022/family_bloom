const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
const fs = require('fs');
const path = require('path');

const file = path.join(__legacyScriptsDir, '..', 'modules', 'family-bloom-overlay', 'android', 'src', 'main', 'java', 'expo', 'modules', 'familybloomoverlay', 'FamilyBloomOverlayModule.kt');
const source = fs.readFileSync(file, 'utf8');
const checks = [
  ['emit uses non-null Map<String, Any>', /val payload = mutableMapOf<String, Any>\(/],
  ['nullable kind is conditionally inserted', /kind\?\.let \{ payload\["kind"\] = it \}/],
  ['nullable gameId is conditionally inserted', /gameId\?\.let \{ payload\["gameId"\] = it \}/],
  ['nullable extra values are filtered', /if \(value != null\) payload\[key\] = value/],
  ['diagnostic dispatch receives non-null payload map', /onDiagnostic\(payload\)/],
];
let passed = 0;
console.log('\nFamily Bloom P2.37R2C-H1 — Kotlin EventDispatcher payload contract\n');
for (const [name, rx] of checks) {
  if (!rx.test(source)) {
    console.error(`FAIL ${name}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS ${name}`);
    passed += 1;
  }
}
if (!process.exitCode) console.log(`\nP2.37R2C-H1 Kotlin payload contract: PASS (${passed}/${checks.length})`);
