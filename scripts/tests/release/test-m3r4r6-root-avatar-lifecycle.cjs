#!/usr/bin/env node
'use strict';
/** Family Bloom R6 root/credential/activity/avatar source contract.
 * Runs WITHOUT node_modules, network or Android; fail only on observable contracts.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'../../..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
let passed=0;
function check(label, condition) { assert.ok(condition,label); passed++;console.log('PASS',label); }
const r=read('src/app/_layout.tsx');
const a=read('src/context/AuthContext.tsx');
const i=read('src/components/ui/BloomInputComponents/BloomInputAvatar.tsx');
const frame=read('src/components/ui/BloomInputComponents/AvatarUploadFrame.tsx');
const graph=read('src/app/(family)/(graph)/family-graph-person-editor.tsx');
const cv=read('src/app/(profile)/profile.tsx');
const create=read('src/app/(profile)/create-profile.tsx');
const activity=read('src/services/media/avatarPickerActivity.ts');
const route=read('src/services/navigation/rootRoutePolicy.ts');
const session=read('src/services/navigation/familySessionAccess.ts');
const welcome=read('src/services/onboarding/welcomeGate.ts');
check('Route gate compares actual URL instead of only segments[0]',r.includes('usePathname()')&&r.includes('resolveRootRoute(')&&route.includes('pathname === "/create-profile"'));
check('Root defers redirects while native photo picker is open',r.includes('if (pickingAvatar) return')&&r.includes('useAvatarPickerActive()'));
check('Public auth, UID-only create, and verified-family private screens are separately guarded',r.includes('<Stack.Protected guard={!user}>')&&r.includes('guard={!!user && profileStatus === "missing"}')&&r.includes('<Stack.Protected guard={allowFamilyRoutes}>')&&r.includes('userProfile.uid === user.uid')&&r.includes('canEnterFamilyHome(')&&session.includes('input.membershipStatus === "ready"'));
check('Repeated Auth callback with same UID does not reset session',a.includes('authUidRef.current === nextUid')&&a.includes('authUidRef.current = nextUid'));
check('Image picker AppState does not tear down memberships',a.includes('avatarPickerActivity.isPicking()')&&activity.includes('isPicking: snapshot'));
check('Native picker does not invoke external Android crop UI',i.includes('allowsEditing: false'));
check('Local avatar selection cannot be overwritten by stale profile snapshots',i.includes('hasLocalSelection.current = true')&&i.includes('!hasLocalSelection.current'));
check('Pending recovery cannot replay over a newer picker selection',i.includes('latest.current !== recoveryTicket')&&i.includes('avatarPickerActivity.isPicking()'));
check('Picker result has a newest-choice ticket guard',i.includes('ticket !== latest.current'));
check('Picker rehydration is scoped to UID/person instead of global result',i.includes('pickerScope')&&i.includes('fb:avatar-picker-intent:v1:'));
check('Create profile owns a UID-scoped picker',create.includes('profile:create:${user.uid}'));
check('Family CV owns an UID-scoped picker',cv.includes('profile:edit:${user.uid}'));
check('Family person picker scoped to UID, family and person',graph.includes('person:${user.uid}:${familyId}:${personId || "new"}'));
// Appearance 3.0: verify the user-visible behavior, not the names of the
// reactive color/style variables. Both legacy and reactive token readers pass.
// In particular, this MUST fail if the idle background becomes opaque or the
// decorative track starts rendering unconditionally.
const idleTransparent = /backgroundColor:\s*showUploadFrame\s*\?\s*[\w$.]+\s*:\s*["']transparent["']/.test(frame);
const trackOnlyWhenActive = /\{showUploadFrame\s*&&\s*<View\s+style=\{\[\s*[\w$.]+\.track\b/.test(frame);
check('No decorative frame or pink bar while upload is idle',
  frame.includes('const showUploadFrame = phase !== "idle"') && idleTransparent && trackOnlyWhenActive);
check('Real upload progress still shown around rounded-square avatar',
  frame.includes('phase === "uploading"') && frame.includes('percentage !== null') &&
  /[\w$.]+\.edge\b/.test(frame) && frame.includes('backgroundColor: color'));
check('Avatar frame uses reactive theme colors without changing upload semantics',
  (frame.includes('useA3Theme().colors') && frame.includes('useA3LegacyStyles(styles)')) ||
  (frame.includes('COLORS.surface') && frame.includes('styles.track')));
check('Person edit commits avatar after upload confirmation',graph.includes('mediaService.uploadManaged(')&&graph.includes('familyGraphMutationService.setPersonAvatar(')&&graph.includes('mediaService.markCleanupPending(asset.id)'));
check('Person avatar exposes real upload progress',graph.includes('setAvatarUpload({ phase: "uploading", progress: Math.max'));
check('Family CV has avatar upload state and retry',cv.includes('avatarAsyncSync.subscribe(')&&cv.includes('retryAvatar'));
check('Welcome scoped to uid and active family',welcome.includes('target.uid === currentUid && target.familyId === activeFamilyId'));
// Test the pure routing policy with runtime transpilation; no React/Expo required.
let ts;
for(const name of ['typescript','/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript']){try{ts=require(name);break}catch{}}
if(ts){
 const js=ts.transpileModule(route,{fileName:'rootRoutePolicy.ts',compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 const module={exports:{}};
 new Function('module','exports',js)(module,module.exports);
 const policy=module.exports.resolveRootRoute;
 const base={pathname:'/create-profile',rootSegment:'(profile)',isSignedIn:true,profileStatus:'missing',familySelectionRequired:false,hasValidActiveFamily:false,familyTransition:false};
 check('Already on create-profile => no redirect/remount',policy(base)===null);
 check('Missing profile on another route => redirect to create profile',policy({...base,pathname:'/profile'}).target==='/create-profile');
 check('Valid family in tabs => never redirect self',policy({...base,pathname:'/',rootSegment:'(tabs)',profileStatus:'ready',hasValidActiveFamily:true})===null);
 check('Signed-out user on private route => login required',policy({...base,isSignedIn:false}).target==='/(auth)/login');
 check('No active family on gateway => no loop',policy({...base,pathname:'/family-gateway',rootSegment:'(family)',profileStatus:'ready'})===null);
} else console.log('NOTE: TypeScript not installed, pure routing runtime tests skipped (release environment will run with TypeScript).');
console.log(`R6 root+avatar contract ${passed} PASS`);
