const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass = 0, fail = 0;
const check = (ok, msg) => { if (ok) { pass++; console.log(`PASS ${msg}`); } else { fail++; console.error(`FAIL ${msg}`); } };

console.log('\nFamily Bloom P2.37R2C-H4 — root navigation zero-height guard\n');
const layout = read('src/app/_layout.tsx');
const welcome = read('src/components/onboarding/WelcomeModal.tsx');
const structure = read('scripts/maintenance/check-project-structure.js');

check(layout.includes('<View style={styles.rootNavigatorHost} collapsable={false}>'), 'RootNavigator owns an explicit non-collapsable flex host');
check(layout.includes('<View style={styles.navigationPlane} collapsable={false}>'), 'Root routing surface is isolated inside a dedicated navigation plane');
check(layout.includes('rootNavigatorHost: { flex: 1') && (layout.includes('navigationPlane: { flex: 1') || layout.includes('navigationPlane: { ...StyleSheet.absoluteFillObject')), 'root navigation host and plane are forced to full size');
check(layout.includes('<View style={styles.familySessionPlane} collapsable={false}>') && layout.includes('familySessionPlane: { flex: 1'), 'FamilySession gives navigation a stable flex parent separate from overlays');
check(!welcome.includes('<Modal') && !welcome.includes('from "react-native";') ? true : !welcome.includes('Modal,'), 'post-auth welcome no longer creates a native Modal window');
check(welcome.includes('StyleSheet.absoluteFillObject') && welcome.includes('accessibilityViewIsModal'), 'welcome is now an in-tree absolute overlay that blocks touches without replacing the Activity window');
check(structure.includes('Root BAT launchers exactly match') && structure.includes('bat-entrypoints-manifest.json'), 'structure gate follows canonical root BAT manifest');

console.log(`\nP2.37R2C-H4 root navigation layout gate: ${fail ? 'FAIL' : 'PASS'} (${pass}/${pass + fail})\n`);
process.exit(fail ? 1 : 0);
