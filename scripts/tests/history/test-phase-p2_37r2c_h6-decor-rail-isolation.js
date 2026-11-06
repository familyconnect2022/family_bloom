#!/usr/bin/env node
'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__legacyScriptsDir, '..');
let pass=0, fail=0;
const read=(r)=>fs.readFileSync(path.join(root,r),'utf8');
const json=(r)=>JSON.parse(read(r));
const check=(ok,msg)=>{ if(ok){pass++; console.log(`PASS ${msg}`);} else {fail++; console.error(`FAIL ${msg}`);} };
console.log('\nFamily Bloom P2.37R2C-H6 — Activity decor rail / React-Yoga isolation\n');
const rootLayout=read('src/app/_layout.tsx');
const authLayout=read('src/app/(auth)/_layout.tsx');
const presentation=read('src/components/games/BoardGamePresentationRoot.android.tsx');
const moduleIndex=read('modules/family-bloom-overlay/index.ts');
const native=read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt');
const mod=json('modules/family-bloom-overlay/package.json');
const eas=read('scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat');
// This historic gate must recognize the CURRENT navigation contract, not a
// stale literal from the pre-R8R1 route flow.  Missing conditions are not
// silently accepted: below we mutation-test the actual expressions to prove
// every safety predicate is required, especially the asynchronous Welcome
// verification barrier (welcomeReady).  Never remove a real app guard to
// satisfy a historical source test.
function hasVerifiedFamilyTabs(layout, access) {
  const groups = [...layout.matchAll(/<Stack\.Protected\s+guard=\{([^}]+)\}>([\s\S]*?)<\/Stack\.Protected>/g)];
  const tabsGroups = groups.filter(([, , body]) => /<Stack\.Screen\s+name=["']\(tabs\)["']/.test(body));
  const [,, tabsContent] = tabsGroups[0] || [];
  const tabsGuard = tabsGroups[0]?.[1];
  return layout.includes('import { Stack,') && layout.includes('usePathname') &&
    layout.includes('useRouter') && layout.includes('<Stack') &&
    groups.some(([,guard,body]) => guard === '!user' && body.includes('name="(auth)"')) &&
    groups.some(([,guard,body]) => guard === '!!user && profileStatus === "missing"' && body.includes('name="(profile)/create-profile"')) &&
    groups.some(([,guard,body]) => guard === 'verifiedProfile' && body.includes('name="(family)/(membership)/family-gateway"')) &&
    // Current protected-navigation contract: profile is UID-matched and read.
    /const\s+verifiedProfile\s*=\s*!!user\s*&&\s*!!userProfile\s*&&\s*userProfile\.uid\s*===\s*user\.uid\s*&&\s*authStatus\s*===\s*["']signed-in["']\s*&&\s*profileStatus\s*===\s*["']ready["']\s*;/.test(layout) &&
    tabsGroups.length === 1 && tabsGuard === 'allowFamilyRoutes' && !!tabsContent &&
    layout.includes('const verifiedFamily = authStatus === "signed-in" && canEnterFamilyHome({') &&
    // No Home until authoritative Welcome check finishes, even when showWelcome
    // is still false while Firestore has not resolved yet.
    /const\s+allowFamilyRoutes\s*=\s*verifiedFamily\s*&&\s*welcomeReady\s*&&\s*!welcomeBlocking\s*;/.test(layout) &&
    /const\s+welcomeBlocking\s*=\s*verifiedFamily\s*&&\s*welcomeReady\s*&&\s*showWelcome\s*;/.test(layout) &&
    /return\s+!!input\.uid\s*&&\s*input\.profileUid\s*===\s*input\.uid/.test(access) &&
    access.includes('input.profileStatus === "ready"') &&
    access.includes('input.membershipStatus === "ready"') &&
    access.includes('!!input.activeFamilyId') &&
    access.includes('input.verifiedMembershipFamilyIds.includes(input.activeFamilyId)') &&
    access.includes('!input.familySelectionRequired');
}
const familyAccess = read('src/services/navigation/familySessionAccess.ts');
const validGuard = hasVerifiedFamilyTabs(rootLayout, familyAccess);
const mutate = (from, to) => {
  if (!rootLayout.includes(from)) throw Error(`H6 mutation fixture missing: ${from}`);
  return rootLayout.replace(from, to);
};
const mutations = [
  // A false PASS on any of these mutations would break a safety requirement.
  [mutate('guard={allowFamilyRoutes}', 'guard={!!user}'), familyAccess],
  [mutate('const allowFamilyRoutes = verifiedFamily && welcomeReady && !welcomeBlocking;',
    'const allowFamilyRoutes = verifiedFamily && welcomeReady;'), familyAccess],
  [mutate('const allowFamilyRoutes = verifiedFamily && welcomeReady && !welcomeBlocking;',
    'const allowFamilyRoutes = verifiedFamily && !welcomeBlocking;'), familyAccess],
  [mutate('const allowFamilyRoutes = verifiedFamily && welcomeReady && !welcomeBlocking;',
    'const allowFamilyRoutes = !!user && welcomeReady && !welcomeBlocking;'), familyAccess],
  [mutate('guard={verifiedProfile}', 'guard={!!user}'), familyAccess],
  [mutate('userProfile.uid === user.uid', 'true'), familyAccess],
  [rootLayout, familyAccess.replace('input.profileStatus === "ready"', 'true')],
  [rootLayout, familyAccess.replace('input.membershipStatus === "ready"', 'true')],
  [rootLayout, familyAccess.replace('input.profileUid === input.uid', 'true')],
  [rootLayout, familyAccess.replace('input.verifiedMembershipFamilyIds.includes(input.activeFamilyId)', 'true')],
  [rootLayout, familyAccess.replace('!input.familySelectionRequired', 'true')],
  [rootLayout, familyAccess.replace('!!input.activeFamilyId', 'true')],
];
check(validGuard && mutations.every(([layout, access]) => !hasVerifiedFamilyTabs(layout, access)),
  'root navigation uses Stack with verified UID/profile/membership + Welcome verification guard');
check(authLayout.includes('import { Stack }') && authLayout.includes('<Stack'), 'auth navigation restored to Stack');
check(presentation.includes('return null;') && !presentation.includes('<FamilyBloomOverlayHost'), 'Android presentation controller renders no React/native View');
check(presentation.includes('setBoardGameNativePresentation') && presentation.includes('DECOR_RAIL_CONTROLLER_MOUNTED'), 'controller drives module API only');
check(!moduleIndex.includes('requireNativeViewManager') && moduleIndex.includes('setFamilyBloomOverlayPresentation'), 'module index exports functions/events only; no ViewManager');
check(native.includes('class FamilyBloomOverlayRail') && native.includes('activity.window.decorView') && native.includes('decor.addView(next'), 'native rail attaches directly to Activity.window.decorView');
check(!native.includes('View(FamilyBloomOverlayHostView::class)') && !native.includes(': ExpoView('), 'native source has no ExpoView in React/Yoga tree');
check(native.includes('P2.37R2C-H25-native-3') && mod.version==='1.3.18', 'current native identity/module version = P2.37R2C-H25-native-3 / 1.3.18');
check(native.includes('visibility = View.INVISIBLE') && native.includes('Full/Mini containers retained'), 'IDLE/background keeps persistent rail hidden without destroying containers');
check(native.includes('bringToFront()') && native.includes('Activity.window.decorView'), 'active presentation can rise only inside Android decor hierarchy');
check(eas.includes('143045') && eas.includes('P2.37R2C-H25-native-3'), 'EAS helper prints exact current app/native identity');
check(['scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat','scripts/android/eas/Family_Bloom_EAS_UPDATE_TEST.bat','scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat','scripts/android/maintenance/Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat','scripts/android/build/Family_Bloom_BUILD_APK_TO_SHARE.bat'].every((name)=>fs.existsSync(path.join(root,name))), 'EAS, maintenance, Build & Share helpers remain in managed folders');
console.log(`\nP2.37R2C-H6 decor rail gate: ${fail?'FAIL':'PASS'} (${pass}/${pass+fail})\n`);
process.exit(fail?1:0);
