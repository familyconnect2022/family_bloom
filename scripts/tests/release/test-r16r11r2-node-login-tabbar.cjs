#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const node=read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const focus=read('src/components/familyGraph/FamilyGraphFocusView.tsx');
const auth=read('src/services/auth/authService.ts');
const ctx=read('src/context/AuthContext.tsx');
const login=read('src/app/(auth)/login.tsx');
const dock=read('src/app/(tabs)/_layout.tsx');
for (const [name,source] of [['main',node],['focus',focus]]) {
 assert(!source.includes('<FamilyGraphRelationPlate'),name+' must not render floating title plate');
 assert(source.includes('nodeName')&&source.includes('nodeYears'),name+' must preserve in-card name and years');
 assert(source.includes('relationLabel'),name+' must retain relationship metadata');
}
assert(auth.includes("await withGoogleDeadline(GoogleSignin.signOut(), 'play-services', 5000);"),'reset Google SDK account selection before picker');
assert(auth.indexOf('GoogleSignin.signOut()')<auth.indexOf('GoogleSignin.signIn()'),'picker must follow account reset');
assert(auth.includes('async signOutFirebaseOnly()')&&auth.includes('await signOut(getAuth());'),'remote eviction remains Firebase-only');
assert(ctx.includes('await authService.signOut();'),'manual logout clears SDK account');
assert(login.includes('CHỌN TÀI KHOẢN GOOGLE'),'explicit chooser label');
assert(dock.includes('TAB_OUTER_MARGIN = 8')&&dock.includes('TAB_FLOAT_GAP = 4.5'),'halve three free edge gaps');
assert(dock.includes('Math.max(8, insets.bottom) + TAB_FLOAT_GAP'),'preserve safe area');
const release=JSON.parse(read('app.json')).expo;assert(Number(release.version.split('.').pop())>=46,'Android version must not decrease');assert(release.android.versionCode>=143056,'Android versionCode must not decrease');
console.log('PASS R16R11R2: node without external nameplate, safe explicit account chooser, native three-edge dock spacing, unique APK version');
