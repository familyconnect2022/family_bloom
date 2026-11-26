#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const login=read('src/app/(auth)/login.tsx');
const button=read('src/components/ui/BloomButtonComponents/BloomButton.tsx');
const context=read('src/context/AuthContext.tsx');
const service=read('src/services/auth/authService.ts');
assert.match(login,/onPress=\{handleGoogle\}/);
assert.match(login,/googleBusyRef.current = true;\s*setIsLoadingGoogle\(true\)/);
assert.match(login,/finally \{\s*googleBusyRef.current = false;\s*setIsLoadingGoogle\(false\)/);
assert.match(login,/keepTextWhileLoading/);
assert.match(login,/textStyle=\{\{ color: __a3Colors.onPrimary \}\}/);
assert.match(login,/isLoadingGoogle \? "ĐANG KẾT NỐI GOOGLE…"/);
assert.doesNotMatch(login,/THỬ ĐỔI TÀI KHOẢN GOOGLE|chooseAccountButton/);
assert.match(button,/isLoading && keepTextWhileLoading/);
assert.match(button,/ActivityIndicator[\s\S]*?loadingSpinner[\s\S]*?<Text appearanceRole="body"/);
assert.match(service,/result.type === "cancelled"/);
assert.match(service,/AUTH_GOOGLE_CANCELLED/);
assert.match(context,/finally \{[\s\S]*?setGoogleLoginPhase\(null\);/);
assert.doesNotMatch(context,/signInWithGoogleChooser/);
assert.match(service,/async signOutFirebaseOnly\(\)/);
assert.match(service,/GoogleSignin\.signOut\(\)/);
console.log('[ANDROID R16R11R10 GOOGLE CANCEL/UI PASS] single CTA, spinner+label, cancellation reset, SDK account choice');

assert.match(login,/function LoginButton/);assert.match(login,/<NativeText[^>]*>\{title\}<\/NativeText>/);assert.match(login,/<View collapsable=\{false\}/);assert.doesNotMatch(login,/<BloomRouteEntrance kind="login" delayMs=/);
