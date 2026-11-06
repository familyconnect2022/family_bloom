#!/usr/bin/env node
'use strict';
/** Source-only gates, physical-device behavior not asserted here. */
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const release=JSON.parse(read('scripts/setup/family-bloom-source-release.json'));
assert.equal(release.sourceReleaseId,'R11');assert.equal(release.patchReleaseId,'R11R4');
assert.equal(release.baselineSourceReleaseId,'R10');assert.equal(release.androidVersionCode,143045);
const motion=read('src/motion/BloomMotion.tsx');
for(const needle of ['BloomRouteEntrance','useFocusEffect','useBloomMotionSetting','withDelay','useReducedMotion','cancelAnimation','Animated.View'])assert(motion.includes(needle),needle);
const login=read('src/app/(auth)/login.tsx');
assert(login.includes('<BloomRouteEntrance kind="login">'));
assert(login.includes('<BloomRouteEntrance kind="login" delayMs={120}>'));
const tabRoot=read('src/app/(tabs)/_layout.tsx');
assert(tabRoot.includes('animation: tabMotion.enabled ? "fade" : BLOOM_MOTION.tabs.animation'));
assert(tabRoot.includes('PersistentBloomTabBarHost'));
for(const route of ['index','family','moments','planner','play']){
  const page=read(`src/app/(tabs)/${route}.tsx`);
  assert(page.includes('<BloomRouteEntrance>'),route+' lacks focused Hero entrance');
  assert(page.includes('<BloomHeroHeader'),route+' hero gone');
}
const paper=read('src/components/onboarding/WelcomeModal.tsx');
for(const needle of ['preview = false','r11r4-welcome-magic-sparkle','welcome-paper-safe-text-region','welcome-letter-scroll','welcome-fixed-cta-footer','animateLetter'])assert(paper.includes(needle),'Missing '+needle);
const lab=read('src/app/(internal)/motion-lab.tsx');
assert(lab.includes('isPerformanceTestAccount(user?.email)')&&lab.includes('isVerifiedDeveloperAccount(user)'));
assert(lab.includes('r11r4-preview-welcome-button')&&lab.includes('<WelcomeModal visible={welcomePreview} preview onContinue={() => setWelcomePreview(false)} />'));
assert(!/\bfetch\(/.test(lab));
const cards=read('src/components/ui/BloomPageComponents.tsx');
assert(cards.includes('<Pressable accessibilityRole="button" onPress={onPress}'));
assert(!cards.includes('<BloomMotionPressable'));
const upcoming=read('src/app/(tabs)/index.tsx').split('const HomeUpcomingIsland')[1]?.split('const HomeMomentsIsland')[0]||'';
assert(upcoming.includes('eventTicketList')&&!upcoming.includes('<BloomCard'));
assert(!/from\s+["'].*firebase/i.test(motion));
const m=JSON.parse(read('document/releases/fb-r11r4-motion-manifest.json'));
for(const f of m.files)assert.equal(sha(f.path),f.after,'Wrong patch source file: '+f.path);
for(const safe of ['.env','Family_Bloom_AUTO_UPDATE_FULL.bat','android','firestore.rules'])assert(m.preserve.includes(safe));
console.log('R11R4 REAL ENTRY MOTION SOURCE CONTRACT: PASS');
