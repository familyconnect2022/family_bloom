#!/usr/bin/env node
'use strict';
// D5 contract updated for D6: enforce real centering, not the old almost
// screen-height flex sheet. No tests are skipped.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),vm=require('vm'),ts=require('typescript');
const root=path.resolve(__dirname,'../../..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const w=read('src/components/onboarding/WelcomeModal.tsx'),layout=read('src/app/_layout.tsx'),gate=read('src/app/session-gate.tsx'),auth=read('src/context/AuthContext.tsx');
const output=ts.transpileModule(read('src/services/navigation/welcomeModalGeometry.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const mod={exports:{}};vm.runInNewContext(output,mod);const geometry=mod.exports.computeWelcomeModalGeometry;
let n=0;function check(name,fn){fn();console.log(`PASS D5 compatible ${++n}: ${name}`);}
for(const [name,width,height] of [['small',280,330],['compact',360,560],['regular',393,760],['tall',430,970],['landscape',800,390]]){
 check(`${name} floating card has visible margins`,()=>{const g=geometry(width,height);assert(g.readerWidth>0&&g.readerHeight>0);assert(g.readerWidth<=width-32);assert(g.readerHeight<=Math.min(590,height*.80,height-64)+1);});
}
check('stage is measured via onLayout',()=>assert(w.includes('onLayout={onStageLayout}')&&w.includes('computeWelcomeModalGeometry(viewport.width, viewport.height)')));
check('modal uses actual centered pixel position',()=>assert(w.includes('left:Math.max(0,(viewport.width-readerWidth)/2)')&&w.includes('top:Math.max(0,(viewport.height-readerHeight)/2)')));
check('modal has explicit absolute positioning',()=>assert(w.includes("modalEntry: { position: 'absolute'")&&w.includes('testID="welcome-centered-modal-entry"')));
check('reader shade and independent card',()=>assert(w.includes('styles.readerShade')&&w.includes('style={styles.sheet}')&&w.includes('testID="welcome-native-reader"')));
check('scroll body and CTA footer are siblings',()=>assert(w.indexOf('testID="welcome-letter-scroll"')<w.indexOf('testID="welcome-fixed-cta-footer"')&&w.includes('onPress={continueIntoFamily}')));
check('native static image loads before hint',()=>assert(w.includes('setSealedImageReady(true)')&&w.includes('{sealedImageReady && (')&&w.includes('styles.envelopeHint')));
check('single decorative hint and baked caption mask',()=>assert(w.includes("hintWords = ['Chạm nhẹ', 'để mở', 'Thư Ngõ']")&&w.includes('artworkCaptionMask')&&!w.includes('hintSubtext')));
check('transition remains bounded and reduce-motion friendly',()=>assert(w.includes('AccessibilityInfo.isReduceMotionEnabled()')&&w.includes('openingWatchdog.current = setTimeout')&&w.includes("if (reduceMotion.current || getBloomMotionLevel() === 'still')")));
check('approved letter, verified family and welcome ledger retained',()=>{const arr=JSON.parse(read('document/releases/r3r14/approved-letter-paragraphs.snapshot.json'));assert.equal(arr.length,14);for(const a of arr)assert(w.includes(a));assert(auth.includes('await welcomeLedger.markSeen(target.uid, membership);'));assert(gate.includes('verifiedFamily && welcomeReady && showWelcome'));assert(layout.includes('<Stack.Protected guard={allowFamilyRoutes}>'));});
console.log(`D5 compatible ${n}/${n} PASS (geometry model, not device pixels)`);
