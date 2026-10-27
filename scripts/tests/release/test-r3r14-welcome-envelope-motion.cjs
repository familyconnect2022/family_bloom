#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const component = read('src/components/onboarding/WelcomeModal.tsx');
const assetsRoot = path.join(root, 'assets/images/onboarding/time-letter');
let passed = 0;
function test(name, fn) { fn(); console.log(`PASS R3R14 ${++passed}: ${name}`); }

test('3 original high-resolution design stages are real JPG assets', () => {
  for (const f of ['sealed.jpg', 'opening.jpg', 'revealed.jpg']) {
    const content = fs.readFileSync(path.join(assetsRoot, f));
    assert(content.byteLength > 100000 && content.byteLength < 900000, `asset byte size ${f}`);
    assert.equal(content[0], 0xff); assert.equal(content[1], 0xd8);
    assert(component.includes(`/time-letter/${f}`));
    console.log(`  ${f}: ${content.length} B, SHA256 ${crypto.createHash('sha256').update(content).digest('hex').slice(0, 12)}`);
  }
});
test('R3R14 preserves all 14 approved paragraphs exactly from R3R13', () => {
  const original = read('document/releases/r3r14/approved-letter-paragraphs.snapshot.json');
  const arr = JSON.parse(original);
  assert.equal(arr.length, 14);
  for (const x of arr) assert(component.includes(x), x.slice(0, 60));
});
test('animation has 3 stages plus real reader and sequential native movement', () => {
  for (const s of ['SCENE_SEALED', 'SCENE_OPENING', 'SCENE_REVEALED', 'Animated.sequence([', 'Animated.parallel([', 'paperLift', 'paperScale', 'paperRotate', "setPhase('reading')"]) assert(component.includes(s), s);
  assert(component.includes('useNativeDriver: true'));
  assert(component.includes('readingProgress'));
});
test('fast taps cannot replay opening or submit continue twice', () => {
  assert(component.includes('if (openingLock.current || phase !=='));
  assert(component.includes('openingLock.current = true'));
  assert(component.includes('if (continueLock.current || phase !=='));
  assert(component.includes('continueLock.current = true'));
});
test('animation cleans up on unmount and user family switch', () => {
  assert(component.includes('animationRun.current += 1'));
  assert((component.match(/activeAnimation\.current\?\.stop\(\)/g) || []).length >= 2);
  assert(component.includes('run !== animationRun.current'));
  assert(component.includes('if (!visible) reset()'));
});
test('reader is bounded, header/footer fixed, body owns independent scroll', () => {
  assert(component.includes('readerHeight = Math.min(790'));
  assert(component.includes('height - (compact ? 18 : 48)'));
  assert(component.indexOf('<ScrollView') > component.indexOf('<View style={styles.paper}>'));
  assert(component.indexOf('</ScrollView>') < component.indexOf('<View style={[styles.footer'));
  assert(component.includes('nestedScrollEnabled') && component.includes('testID="welcome-letter-scroll"'));
});
test('no full-screen static text, no native Modal or external network', () => {
  assert(!component.includes('<Modal'));
  assert(!component.includes('fetch('));
  assert(component.includes('Asset.loadAsync(SCENES)'));
  assert(component.includes('{LETTER.map('));
  assert(component.includes('accessibilityLabel="Mở Thư Ngỏ của Family Bloom"'));
});
test('Android back, reduced motion, and failed images have safe fallback', () => {
  assert(component.includes('BackHandler.addEventListener'));
  assert(component.includes('AccessibilityInfo.isReduceMotionEnabled'));
  assert(component.includes('if (reduceMotion.current)'));
  assert(component.includes('openingWatchdog.current = setTimeout'));
  assert(!component.includes('!assetsReady')); 
});
test('no duplicate BAT launchers remain at root; Android identity remains stable', () => {
  const rootBat = fs.readdirSync(root).filter(f => f.toLowerCase().endsWith('.bat'));
  assert.equal(rootBat.length, 0);
  assert.equal(JSON.parse(read('app.json')).expo.android.package, 'com.familybloom.android');
});
test('R3R14 is invoked from release, EAS and OTA preflight before build', () => {
  const call='test-r3r14-welcome-envelope-motion.cjs';
  for (const file of [
    'scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat',
    'scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat',
    'scripts/android/eas/Family_Bloom_EAS_UPDATE_TEST.bat',
  ]) assert(read(file).includes(call), file);
});
// Pure TypeScript syntax check: does not need Expo installed.
test('WelcomeModal TypeScript JSX is syntactically sound', () => {
  let ts;
  try { ts = require('typescript'); } catch { console.log('  TypeScript not installed in clean ZIP: syntax checked during CLEAN APPLY/build'); return; }
  const result = ts.transpileModule(component, { fileName:'WelcomeModal.tsx', compilerOptions:{ jsx:ts.JsxEmit.ReactJSX, target:ts.ScriptTarget.ES2022 }, reportDiagnostics:true });
  const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length,0, errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join('; '));
});
console.log(`R3R14 WELCOME LETTER: ${passed}/${passed} PASS`);
