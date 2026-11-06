#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const code = read('src/components/onboarding/WelcomeModal.tsx');
let passed=0;
const check=(label,fn)=>{fn();console.log(`PASS R3R14R1 STATIC ${++passed}: ${label}`);};
check('all three JPG scenes are bundled and sealed image is native/static',()=>{
  for (const id of ['SCENE_SEALED','SCENE_OPENING','SCENE_REVEALED']) assert(code.includes(id));
  assert(code.includes('Image source={SCENE_SEALED}'));
  assert(code.includes('Image source={SCENE_OPENING}'));
  assert(code.includes('Image source={SCENE_REVEALED}'));
});
check('sealed image is drawn as a child of its non-elevated Pressable',()=>{
  const sealed=code.slice(code.indexOf("{phase === 'sealed' && ("),code.indexOf("{phase === 'opening' &&"));
  assert(sealed.includes('<Pressable') && sealed.includes('Image source={SCENE_SEALED}'));
  assert(sealed.includes('onPress={openLetter}') && !sealed.includes('onPressIn={openLetter}')); // D6 single tap avoids duplicate events
  assert(sealed.includes('testID="welcome-envelope-open"'));
  assert(!code.includes('elevation: 100') && !code.includes('zIndex: 100'));
  assert(code.includes('sealedInteractiveScene: { ...StyleSheet.absoluteFillObject')); // D6 fixed overlay over permanently mounted art
});
check('reading surface is plain View and only mounted while reading',()=>{
  const reader=code.slice(code.indexOf("{(phase === 'opening' || phase === 'reading') && ("));
  assert(reader.includes('testID="welcome-native-reader"'));
  assert(reader.includes('testID="welcome-letter-scroll"'));
  assert(reader.includes('style={styles.sheet}')); // Plain native reader; outer entry only adds subtle scale.
});
check('visible CTA gives finger feedback',()=>{
  // R8R4R2 supersedes the opaque CTA: transparent full-envelope tap cover,
  // with subtle animated copy. Old releases keep the original pill contract.
  if (code.includes('styles.envelopeHint')) {
    for (const text of ['styles.envelopeHint', 'hintWords', 'hintWave', 'rippleOpacity', 'Đang mở lá thư yêu thương']) assert(code.includes(text),text);
    assert(!code.includes('styles.realOpenButton'), 'opaque open CTA must be absent');
  } else {
    for (const text of ['Mở Thư Ngỏ','styles.realOpenButton','styles.touchPressed','Đang mở lá thư yêu thương'])assert(code.includes(text),text);
  }
});
check('synchronous double-tap guard and readable end state',()=>{
  for (const text of ['openingLock.current = true', "setPhase('opening')", "setPhase('reading')", 'openingWatchdog.current = setTimeout'])assert(code.includes(text));
  assert(code.includes("if (phase !== 'sealed' || openingLock.current || !sealedImageReady) return;"));
  assert(code.includes('testID="welcome-letter-scroll"'));
});
check('stale animations cannot commit after user switch',()=>{
  assert(code.includes('run !== animationRun.current'));
  assert(code.includes('mounted.current'));
  assert(code.includes('clearTimeout(openingWatchdog.current)'));
});
check('the welcome letter keeps all 14 approved paragraphs',()=>{
  for(const text of JSON.parse(read('document/releases/r3r14/approved-letter-paragraphs.snapshot.json'))) assert(code.includes(text),text.slice(0,40));
});
check('unchanged Android identity and no duplicate root BAT wrappers',()=>{
  assert.equal(JSON.parse(read('app.json')).expo.android.package,'com.familybloom.android');
  assert.equal(new Set(fs.readdirSync(root).filter(x=>x.toLowerCase().endsWith('.bat')).map(x=>x.toLowerCase())).size,2);
});
console.log(`R3R14R1 STATIC TOUCH: ${passed}/${passed} PASS`);
