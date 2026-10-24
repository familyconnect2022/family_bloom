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
check('all three decor images pass through touches',()=>{
  for (const id of ['SCENE_SEALED','SCENE_OPENING','SCENE_REVEALED']) {
    assert(new RegExp(`Animated\\.Image pointerEvents="none" source=\\{${id}\\}`).test(code),id);
  }
});
check('real touch cover is a concrete topmost native pressable',()=>{
  assert(code.includes('<Pressable\n            collapsable={false}'));
  assert(code.includes('onPressIn={openLetter}'));
  assert(code.includes('onPress={openLetter}'));
  assert(code.includes('testID="welcome-envelope-open"'));
  assert(code.includes('zIndex: 100, elevation: 100'));
  assert(code.indexOf('testID="welcome-envelope-open"')>code.indexOf('</Animated.View>}'));
});
check('reader is not mounted while the envelope is sealed',()=>{
  assert(code.includes("{phase !== 'sealed' && <Animated.View"));
  assert(code.includes("{phase !== 'sealed' && <Animated.View\n          pointerEvents={phase === 'reading' ? 'auto' : 'none'}"));
});
check('visible CTA gives finger feedback',()=>{
  for (const text of ['Mở Thư Ngỏ','styles.realOpenButton','styles.touchPressed','Đang mở lá thư yêu thương'])assert(code.includes(text),text);
});
check('synchronous double-tap guard and readable end state',()=>{
  for (const text of ['openingLock.current = true', "setPhase('opening')", "setPhase('reading')", 'openingWatchdog.current = setTimeout'])assert(code.includes(text));
  assert(code.includes("if (openingLock.current || phase !== 'sealed') return;"));
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
check('unchanged root Android identity and 4 root BAT wrappers',()=>{
  assert.equal(JSON.parse(read('app.json')).expo.android.package,'com.familybloom.android');
  assert.equal(fs.readdirSync(root).filter(x=>x.toLowerCase().endsWith('.bat')).length,4);
});
console.log(`R3R14R1 STATIC TOUCH: ${passed}/${passed} PASS`);
