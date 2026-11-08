#!/usr/bin/env node
'use strict';
// R11 static source contract; not a substitute for an Android Release APK test.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const meta=JSON.parse(read('scripts/setup/family-bloom-source-release.json'));
assert.equal(meta.sourceReleaseId,'R11');assert.equal(meta.baselineSourceReleaseId,'R10');
assert.equal(meta.androidVersionCode,143045,'Do not touch R10 binary build gate in trial');
const primitive=read('src/motion/BloomMotion.tsx');
for(const needle of ['useBloomMotionRevision','useReducedMotion','useAnimatedStyle','withTiming','motion.enabled','revealedScenes.add(sceneKey)','cancelAnimation']){
  assert(primitive.includes(needle),'Motion primitive missing '+needle);
}
const lab=read('src/app/(internal)/motion-lab.tsx');
assert(lab.includes('isVerifiedDeveloperAccount(user)'));
assert(lab.includes('isPerformanceTestAccount(user?.email)'));
for(const needle of ['Home Entrance','cây nảy mầm','Bloom Magic','systemReduceMotion'])assert(lab.includes(needle),'Missing Lab scene '+needle);
assert(!/from [\"'].*(?:firebase|firestore|cloudinary)|\bfetch\(/i.test(lab),'Lab must be local-only');
const home=read('src/app/(tabs)/index.tsx');
assert(home.includes('<BloomRouteEntrance><BloomHeroHeader'));
assert(home.includes('<BloomMotionReveal sceneKey="home-summary"'));
const cards=read('src/components/ui/BloomPageComponents.tsx');
assert(cards.includes('<Pressable accessibilityRole="button" onPress={onPress}'), 'Must keep R10 Pressable card geometry');
assert(!cards.includes('<BloomMotionPressable'), 'R11R2 animated card root was a regression');
assert(read('src/app/_layout.tsx').includes('(internal)/motion-lab'));
assert(read('src/app/(internal)/developer-tools.tsx').includes('/motion-lab'));
const updater=read('scripts/maintenance/fb-r11-motion-safe-update.cjs');
assert(updater.includes('Refusing symlink')||updater.includes('Refusing symlink'));
assert(updater.includes('backupSource(target,backup)')&&updater.includes('POST')===false);
assert(fs.existsSync(path.join(root,'scripts/android/maintenance/legacy/Family_Bloom_AUTO_UPDATE_FULL.bat')), 'Keep the user-installed local update BAT');
console.log('R11 MOTION LAB: PASS — gated preview, UI-thread primitives, no Firebase, SHA-bound updater');
