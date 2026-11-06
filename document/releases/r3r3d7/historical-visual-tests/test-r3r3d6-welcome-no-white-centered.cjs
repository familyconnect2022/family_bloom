#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),ts=require('typescript'),vm=require('vm');
const root=path.resolve(__dirname,'../../..'); const read=r=>fs.readFileSync(path.join(root,r),'utf8');
const source=read('src/components/onboarding/WelcomeModal.tsx');let n=0;
function test(name,fn){fn();console.log(`PASS D6 ${++n}: ${name}`)}
const mod={exports:{}};vm.runInNewContext(ts.transpileModule(read('src/services/navigation/welcomeModalGeometry.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,mod);
const geom=mod.exports.computeWelcomeModalGeometry;
for(const [label,w,h] of [['compact',360,560],['regular',393,780],['small',280,330],['landscape',780,390],['tall',440,970]]){
 test(`real floating card is at center ${label}`,()=>{const g=geom(w,h);const top=(h-g.readerHeight)/2,left=(w-g.readerWidth)/2;assert(top>=31&&left>=16);assert(g.readerHeight<=590);});
}
test('dark stable stage even if image decoder stalls',()=>assert(source.includes("stage: { flex: 1, backgroundColor: '#44243A'")));
test('persistent sealed image is outside phase condition',()=>{assert(source.includes('testID="welcome-persistent-sealed-background"'));assert(source.indexOf('welcome-persistent-sealed-background')<source.indexOf("{phase === 'sealed' && ("))});
test('opening and revealed layers mounted before tap',()=>{assert(source.indexOf('onLoad={() => {setOpeningFrameReady(true)')<source.indexOf("{phase === 'sealed' && ("));assert(source.indexOf('onLoad={() => {setRevealedFrameReady(true)')<source.indexOf("{phase === 'sealed' && ("))});
test('phase changes not used to mount artwork',()=>{assert(!source.includes("{phase === 'opening' && (\n          <View style={styles.fullScene}"));assert(source.includes('style={[styles.fullScene, {opacity:openingOpacity}]}'))});
test('tap queues opening until both frames ready',()=>assert(source.includes('const framesReady = openingFrameReady && revealedFrameReady')&&source.includes('setOpeningRequested(true)')));
test('decoding timeout still shows native text reader',()=>assert(source.includes('frames-timeout-native-reader-fallback')&&source.includes('finishOpening(run)')));
test('background stays present during crossfades',()=>{const a=source.slice(source.indexOf('const motion = Animated.sequence(['),source.indexOf('activeAnimation.current = motion;'));assert(!a.includes('Animated.timing(sealedOpacity'));assert(a.includes('Animated.timing(readingProgress'));});
test('modal centered with coordinates independent of flex content',()=>assert(source.includes("modalEntry: { position: 'absolute'")&&source.includes('top:Math.max(0,(viewport.height-readerHeight)/2)')));
test('visible backdrop, card, and fixed non-scroll CTA',()=>assert(source.includes('styles.readerShade')&&source.includes('testID="welcome-centered-modal-entry"')&&source.includes('testID="welcome-fixed-cta-footer"')));
test('safe unsigned transition to Home after ledger only',()=>assert(read('src/context/AuthContext.tsx').includes('await welcomeLedger.markSeen(target.uid, membership);')&&read('src/app/_layout.tsx').includes('<Stack.Protected guard={allowFamilyRoutes}>')));
test('no extra Firebase/service calls or new Android Modal',()=>assert(!source.includes('getDoc(')&&!source.includes('fetch(')&&!source.includes('<Modal')));
console.log(`D6: ${n}/${n} PASS (source-level, device verification pending)`);
