#!/usr/bin/env node
'use strict';
/** Source regression for R3R3D7R2R2. Runtime visual approval still needs APK. */
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const base = path.resolve(__dirname, '../../..');
const read = x => fs.readFileSync(path.join(base, x), 'utf8');
const files = {
  main: read('src/components/familyGraph/FamilyGraphPrototype.tsx'),
  focus: read('src/components/familyGraph/FamilyGraphFocusView.tsx'),
  focusHost: read('src/components/familyGraph/FamilyGraphFocusHost.tsx'),
  route: read('src/app/(family)/(graph)/family-graph.tsx'),
  portrait: read('src/components/familyGraph/FamilyGraphPortrait.tsx'),
  dock: read('src/app/(tabs)/_layout.tsx'),
  font: read('src/theme/createBloomStyles.ts'),
  palette: read('src/theme/palette.ts'),
};
const checks = [
  ['Main graph paints an image with an initials fallback', /<FamilyGraphPortrait/.test(files.main) && files.main.includes('person.avatarUrl || memberAvatarUrl')],
  ['Focus graph paints an image with fallback', files.focus.includes('person.avatarUrl || memberAvatarUrl')],
  ['Focus host forwards member portraits', files.focusHost.includes('memberAvatarByUid={memberAvatarByUid}')],
  ['Member images resolved from already-normalized family member model', files.route.includes('useFamilyMembers(familyId)') && files.route.includes('memberAvatarByUid')],
  ['Only valid HTTPS graph photos are requested', files.portrait.includes('^https:') && files.portrait.includes('onError={() => setFailed(valid)}')],
  ['Outer dock transparent', files.dock.includes('backgroundColor: "transparent"')],
  ['Navigator no longer reserves an opaque footer', files.dock.includes('sceneStyle: styles.tabScene') && !files.dock.includes('paddingBottom: reservedTabBarHeight')],
  ['Dock pill remains theme-colored and opaque', files.dock.includes('backgroundColor: dockColors.surface') && files.palette.includes('getBloomDockColors')],
  ['Default typography uses increased accessible scale', files.font.includes('1.15 * fontScale / 100')],
  ['All five tabs retain independent scroll-safe bottom padding', ['index','moments','planner','family','play'].every(name => {
    const src = read(`src/app/(tabs)/${name}.tsx`);
    return /paddingBottom: 1(?:5[0-9]|6[0-9])/.test(src);
  })],
];
for (const [name, ok] of checks) { assert.ok(ok, name); console.log('PASS', name); }
console.log(`R3R3D7R2R2 VISUAL SOURCE CONTRACT ${checks.length}/${checks.length} PASS`);
