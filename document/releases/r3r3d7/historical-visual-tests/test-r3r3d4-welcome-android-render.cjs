#!/usr/bin/env node
'use strict';
// Preserve D4 security/pressable/no-elevation guarantees while accepting D6's
// persistently mounted scene layers (the old phase-only images caused a flash).
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const base=path.resolve(__dirname,'../../..'),read=f=>fs.readFileSync(path.join(base,f),'utf8');
const w=read('src/components/onboarding/WelcomeModal.tsx'),gate=read('src/app/session-gate.tsx'),layout=read('src/app/_layout.tsx'),auth=read('src/context/AuthContext.tsx');
let n=0;function check(name,fn){fn();console.log(`PASS D4 compatible ${++n}: ${name}`);}
check('sealed Pressable is actual touch surface',()=>assert(w.includes('testID="welcome-envelope-open"')&&w.includes('onPress={openLetter}')));
check('sealed image remains native and inside Pressable',()=>{let a=w.indexOf("{phase === 'sealed' && (");let b=w.indexOf("{phase === 'opening' &&",a);let section=w.slice(a,b<0?undefined:b);assert(section.includes('<Image source={SCENE_SEALED}'));assert(section.indexOf('<Pressable')<section.indexOf('<Image source={SCENE_SEALED}'));});
check('no elevated transparent hit surface',()=>assert(!w.includes('elevation: 100')&&!w.includes('touchCover:')));
check('local image has onLoad and onError',()=>assert(w.includes('sealed-artwork-decoded')&&w.includes('sealed-artwork-fallback')));
check('image failure has native accessible fallback',()=>assert(w.includes('sealedImageFailed')&&w.includes('styles.sceneFallback')));
check('all three original assets retained',()=>{for(let name of ['sealed','opening','revealed']){const b=fs.readFileSync(path.join(base,`assets/images/onboarding/time-letter/${name}.jpg`));assert(b.length>100000&&b[0]===255&&b[1]===216)}});
check('opening has watchdog and generation guard',()=>assert(w.includes('openingWatchdog.current = setTimeout')&&w.includes('run !== animationRun.current')));
check('native readable text rather than image-only letter',()=>assert(w.includes('testID="welcome-native-reader"')&&w.includes('LETTER.map(')&&w.includes('testID="welcome-letter-scroll"')));
check('full 14 paragraphs preserved',()=>{const arr=JSON.parse(read('document/releases/r3r14/approved-letter-paragraphs.snapshot.json'));assert.equal(arr.length,14);for(const x of arr)assert(w.includes(x))});
check('acknowledgment explicitly gated',()=>assert(w.includes('onPress={continueIntoFamily}')&&auth.includes('await welcomeLedger.markSeen(target.uid, membership);')));
check('verified user and family gating retained',()=>assert(gate.includes('authStatus === "signed-in" && verifiedFamily')&&layout.includes('<Stack.Protected guard={allowFamilyRoutes}>')));
check('D3 diagnostics retained without adding network requests',()=>assert(layout.includes('splash-hide-resolved')&&gate.includes('d3-gate-visual-probe')&&!w.includes('fetch(')&&!w.includes('getDoc(')&&!w.includes('<Modal')));
console.log(`D4 compatible: ${n}/${n} PASS (source only)`);
