#!/usr/bin/env node
'use strict';
/** Low-cost, dependency-free release gate. Safe to run from CLEAN APPLY and
 * Build & Share before npm install. It must fail only for missing contracts,
 * never for expected user-facing Vietnamese copy or historical version text. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const checks=[
  ['Welcome intent scoped to uid and family','src/services/onboarding/welcomeGate.ts',/target\.uid === currentUid && target\.familyId === activeFamilyId/],
  ['Family create arms welcome immediately','src/app/(family)/(membership)/family-gateway.tsx',/createFamilyForUser\(user\.uid, name\)[\s\S]*requestWelcomeForFamily\(result\.familyId\)/],
  ['Create success Enter also arms welcome','src/app/(family)/(membership)/family-gateway.tsx',/requestWelcomeForFamily\(createdFamily\.familyId\)/],
  ['New secondary family arms welcome after entry','src/app/(family)/(membership)/family-memberships.tsx',/createdFamily\?\.familyId === familyId\) requestWelcomeForFamily\(familyId\)/],
  ['Protected welcome is routed before tabs mount','src/app/_layout.tsx',/<Stack.Screen name="welcome"[^>]*\/>/],
  ['Join action buttons have breathing space','src/app/(family)/(membership)/family-gateway.tsx',/formActions:\s*\{[^}]*gap: 14/],
  ['Toast info is visually distinct from error','src/components/ui/BloomToast.tsx',/info:\s*\{\s*bg:\s*COLORS\.surface[\s\S]*?bar:\s*COLORS\.primary/],
  ['Toast success retains semantic positive indicator','src/components/ui/BloomToast.tsx',/success:\s*\{\s*bg:\s*COLORS\.surface[\s\S]*?bar:\s*COLORS\.positive/],
  ['Toast warning retains semantic attention indicator','src/components/ui/BloomToast.tsx',/warning:\s*\{\s*bg:\s*COLORS\.surface[\s\S]*?bar:\s*COLORS\.attention/],
  ['Toast error retains semantic destructive indicator','src/components/ui/BloomToast.tsx',/error:\s*\{\s*bg:\s*COLORS\.surface[\s\S]*?bar:\s*COLORS\.destructive/],
  ['Native picker does not launch external crop Activity','src/components/ui/BloomInputComponents/BloomInputAvatar.tsx',/allowsEditing:\s*false/],
  ['Avatar preview is rendered without cache','src/components/ui/BloomButtonComponents/BloomAvatarButton.tsx',/cachePolicy="none"/],
  ['CV saves text independently of avatar sync','src/app/(profile)/profile.tsx',/await profileService\.update\(user\.uid[\s\S]*avatarAsyncSync\.enqueue\(/],
  ['Avatar crop writes real square JPEG','src/components/ui/BloomInputComponents/AvatarCropEditor.tsx',/ImageManipulator\.manipulateAsync\([\s\S]*\{ crop: rect \}[\s\S]*AVATAR_OUTPUT/],
  ['Avatar upload cannot commit superseded job','src/services/media/avatarAsyncSync.ts',/canCommit: async \(\) =>/],
  ['Background avatar persists in app documents','src/services/media/avatarAsyncSync.ts',/new Directory\(Paths\.document/],
];
let failed=0;
for(const [label,file,pattern] of checks){let ok=false;try{ok=pattern.test(read(file))}catch{};console.log(`${ok?'PASS':'FAIL'} ${label}`);if(!ok)failed++}
const app=JSON.parse(read('app.json'));const pkg=JSON.parse(read('package.json'));
const identity=app.expo?.android?.package==='com.familybloom.android'&&pkg.main==='expo-router/entry';
console.log(`${identity?'PASS':'FAIL'} Android package and Expo Router identity`);if(!identity)failed++;
console.log(`R2/R4 integration PRECHECK ${checks.length+1-failed}/${checks.length+1}`);process.exitCode=failed?1:0;
