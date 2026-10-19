#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const read = (r) => fs.readFileSync(path.join(root, r), 'utf8');
const check = (ok, msg) => {
  if (ok) { pass++; console.log(`PASS ${msg}`); }
  else { fail++; console.error(`FAIL ${msg}`); }
};
console.log('\nFamily Bloom P2.37R2C-H7 — tab navigator flex layout regression guard\n');
const tabs = read('src/app/(tabs)/_layout.tsx');
const rootLayout = read('src/app/_layout.tsx');
const presentation = read('src/components/games/BoardGamePresentationRoot.android.tsx');
const native = read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt');
check(tabs.includes('workspaceRoot: { flex: 1, backgroundColor: COLORS.background, overflow: "hidden" }'), 'tab workspace owns a normal flex layout root');
check(tabs.includes('navigatorRoot: { flex: 1, backgroundColor: COLORS.background, overflow: "hidden" }'), 'tab navigator host restored to flex:1');
check(!tabs.includes('navigatorRoot: { ...StyleSheet.absoluteFillObject'), 'tab navigator host is not absoluteFillObject');
check(tabs.includes('<View style={styles.navigatorRoot} collapsable={false}>'), 'tab navigator host remains non-collapsable for stable native measurement');
check(tabs.includes('sceneStyle: [styles.tabScene, { paddingBottom: reservedTabBarHeight }]'), 'tab scene keeps reserved persistent-tabbar inset');
check(tabs.includes('tabScene: { flex: 1, backgroundColor: COLORS.background }'), 'each tab scene owns flex:1');
check(rootLayout.includes('<Stack') && rootLayout.includes('navigationPlane: { flex: 1'), 'root Stack remains on normal flex navigation plane');
check(presentation.includes('return null;') && !presentation.includes('<FamilyBloomOverlayHost'), 'React presentation controller still renders no overlay View');
check(native.includes('activity.window.decorView') && native.includes('P2.37R2C-H22-native-1'), 'H6 decor rail isolation remains the native binary contract');
console.log(`\nP2.37R2C-H7 tab navigator flex gate: ${fail ? 'FAIL' : 'PASS'} (${pass}/${pass+fail})\n`);
process.exit(fail ? 1 : 0);
