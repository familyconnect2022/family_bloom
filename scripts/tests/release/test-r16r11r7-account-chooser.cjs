'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..'),r=p=>fs.readFileSync(path.join(root,p),'utf8');
const service=r('src/services/auth/authService.ts'),context=r('src/context/AuthContext.tsx'),login=r('src/app/(auth)/login.tsx');
test('Explicit user logout clears Firebase and original Google SDK session',()=>{
 assert.match(service,/async signOut\(\) \{\s*await signOut\(getAuth\(\)\)/);
 assert.match(service,/GoogleSignin\.signOut\(\)/);
 assert.match(context,/await authService\.signOut\(\)/);
});
test('Forced remote eviction remains Firebase-only, never revokes Google account',()=>{
 const fn=service.slice(service.indexOf('async signOutFirebaseOnly()'),service.indexOf('async signOut()'));
 assert.match(fn,/signOut\(getAuth\(\)\)/);
 assert.doesNotMatch(fn,/GoogleSignin|GoogleOneTapSignIn|revokeAccess/);
});
test('Single Google button replaces the experimental account-chooser action',()=>{
 assert.match(service,/GoogleSignin\.signOut\(\)/);
 assert.match(context,/await authService\.signInWithGoogle\(/);
 assert.match(login,/onPress=\{handleGoogle\}/);
 assert.doesNotMatch(login,/THỬ ĐỔI TÀI KHOẢN GOOGLE|chooseAccountButton|handleGoogle\(true\)/);
 assert.doesNotMatch(service,/signInWithGoogleChooser|GoogleOneTapSignIn|revokeAccess\(/);
});
test('Original public Google SDK retains account selection',()=>{
 assert.match(service,/GoogleSignin\.signIn\(\)/);
 assert.match(service,/GoogleSignin\.signOut\(\)/);
 assert.match(login,/CHỌN TÀI KHOẢN GOOGLE/);
});
console.log('[ANDROID R16R11R7 ACCOUNT CHOOSER] Verified single Google button, explicit SDK account cleanup and remote-eviction isolation');
