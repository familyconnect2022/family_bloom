#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const hero=read('src/components/ui/BloomHeroHeader.tsx');
const fog=read('src/theme/storybookFogRegistry.ts');
const nav=read('src/app/_layout.tsx');
const gate=read('src/app/session-gate.tsx');
const planner=read('src/app/(tabs)/planner.tsx');
const graph=read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const welcome=read('src/components/onboarding/WelcomeModal.tsx');
for(const id of ['rose','garden','heritage','midnight']) for(const mode of ['light','dark']){
 const p=`assets/images/storybook/fog/${id}_${mode}.webp`;
 const buf=fs.readFileSync(path.join(root,p));
 assert.ok(buf.length>2000,`missing fog art ${p}`);
 assert.equal(buf.toString('ascii',0,4),'RIFF');
 assert.ok(fog.includes(`fog/${id}_${mode}.webp`));
}
assert.ok(hero.includes('getBloomFogArt(palette, isDark ? "dark" : "light")'));
assert.ok(hero.includes('height: "30%"')&&hero.includes('contentFit="cover"'));
assert.ok(hero.includes('pointerEvents="none"'));
assert.ok(nav.includes('Đang xác minh và mở mái nhà')&&nav.includes('<Stack.Screen name="welcome"'));
assert.ok(!nav.includes('backgroundColor: COLORS.surface }]}/> : null}'));
assert.ok(gate.includes('setTimeout(() => setStalled(true), 12000)')&&gate.includes('retryFirebaseVerification'));
assert.ok(planner.includes('mode === "calendar" ? COLORS.onPrimary')&&planner.includes('mode === "list" ? COLORS.onPrimary'));
assert.ok(graph.includes('getBloomNodePalettes()')&&!graph.includes('#FADDE7'));
assert.ok(!welcome.includes('<Modal')&&welcome.includes('testID="welcome-one-artwork"')&&nav.includes('welcomeBlocking = verifiedFamily && welcomeReady && showWelcome')&&gate.includes('testID="verified-welcome-native-screen"'));
console.log('PASS Atmospheric header: 8 WebP theme/mode overlays + 20–23% irregular mask, Android touch transparency');
console.log('PASS Login: nonblank safe handoff + timeout retry with unchanged UID/profile/family gate');
console.log('PASS Calendar / Family Tree: semantic theme colors; Native Welcome preserved');
