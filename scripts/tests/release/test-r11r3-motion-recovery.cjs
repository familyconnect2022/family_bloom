#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const home=read('src/app/(tabs)/index.tsx'),cards=read('src/components/ui/BloomPageComponents.tsx');
const upcoming=home.slice(home.indexOf('const HomeUpcomingIsland'),home.indexOf('const HomeMomentsIsland'));
assert(upcoming.includes('eventTicketList')&&upcoming.includes('<DashboardEventRow'));
assert(!upcoming.includes('<BloomCard'),'R11R3 must remove Home outer event card');
assert(upcoming.includes('events.slice(0, 3)'));
assert(home.includes('active={homeFocused}')&&home.includes('useFocusEffect'),'Home entrance must await focus');
assert(cards.includes('<Pressable accessibilityRole="button" onPress={onPress}'),'Card root must use R10 Pressable');
assert(!cards.includes('<BloomMotionPressable'),'Card borders must not use animated Pressable');
const z=require('node:fs').readFileSync(path.join(root,'scripts/setup/family-bloom-source-release.json'));
const rel=JSON.parse(z);assert.equal(rel.sourceReleaseId,'R11');assert(['R11R3','R11R4'].includes(rel.patchReleaseId));
const welcome=read('src/components/onboarding/WelcomeModal.tsx');
assert(welcome.includes('Animated.Image')&&welcome.includes('imageReady')&&welcome.includes('AccessibilityInfo.isReduceMotionEnabled()'));
assert(welcome.includes('testID="welcome-fixed-cta-footer"')&&welcome.includes('testID="welcome-letter-scroll"'));
const graph=read('src/app/(family)/(graph)/family-graph.tsx');
assert(graph.includes('sceneKey="graph-hero"'));
assert(!graph.includes('<BloomMotionReveal sceneKey="graph-canvas"'));
assert(read('src/app/(family)/(graph)/family-graph-admin.tsx').includes('magicMoment: true'));
const toast=read('src/components/ui/BloomToast.tsx');
assert(toast.includes('currentToast.magicMoment && currentToast.type === \'success\'')&&!/\bfetch\(/.test(toast));
const m=JSON.parse(read('document/releases/fb-r11r3-motion-manifest.json'));
// Historical R11R3 source hashes remain enforceable only for files not revised
// by later forward-only motion releases; R11R4 uses its own before/after hashes.
const forwardModified=new Set([
  'src/motion/BloomMotion.tsx', 'src/app/(tabs)/index.tsx',
  'src/components/onboarding/WelcomeModal.tsx',
  'scripts/setup/family-bloom-source-release.json',
  'scripts/tests/release/test-r11-motion-lab-contract.cjs',
  'scripts/tests/release/test-r11r3-motion-recovery.cjs',
]);
for(const f of m.files){if(!forwardModified.has(f.path))assert.equal(hash(fs.readFileSync(path.join(root,f.path))),f.after,f.path+' SHA');}
for(const preserved of ['.env','Family_Bloom_AUTO_UPDATE_FULL.bat'])assert(m.preserve.includes(preserved));
const updater=read('scripts/maintenance/fb-r11r3-recovery.cjs');
for(const word of ['[SHA MISMATCH]','[PRESERVE]','[ROLLBACK]','[BACKUP]','[CHECK PASS]'])assert(updater.includes(word));
console.log('R11R3 RECOVERY CONTRACT: PASS — R10 card root, independent events, focus Home, Welcome, graph/magic success, safe updater');
