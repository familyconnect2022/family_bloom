#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const ts = require('typescript');
const base = path.resolve(__dirname, '../../..');
const read = f => fs.readFileSync(path.join(base,f),'utf8');
const code = read('src/components/onboarding/WelcomeModal.tsx');
const pure = read('src/services/navigation/welcomePaperGeometry.ts');
const layout = read('src/app/_layout.tsx');
const gate = read('src/app/session-gate.tsx');
const auth = read('src/context/AuthContext.tsx');
const asset = fs.readFileSync(path.join(base,'assets/images/onboarding/time-letter/welcome-single-paper.webp'));
let count=0;const check=(description,test)=>{test();console.log(`PASS D7 ${++count}: ${description}`)};
const model={exports:{}};
vm.runInNewContext(ts.transpileModule(pure,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,model);
const G=model.exports.computeWelcomePaperGeometry;
check('single local design image is a genuine WebP and no media fetch',()=>{
 assert.equal(asset.toString('ascii',0,4),'RIFF');assert.equal(asset.toString('ascii',8,12),'WEBP');
 assert(asset.length>30000);assert(!code.includes('fetch(')&&!code.includes('Asset.loadAsync(SCENES)'));
});
check('exactly ONE runtime on-screen artwork; no video, three-scene stack or fake opening',()=>{
 const runtime = [...code.matchAll(/require\(['"]([^'"]+time-letter\/[^'"]+)['"]\)/g)];
 assert.equal(runtime.length,1);assert(runtime[0][1].endsWith('/welcome-single-paper.webp'));
 for(const disallowed of ['SCENE_SEALED','SCENE_OPENING','SCENE_REVEALED','openingOpacity','sealedOpacity',"setPhase('opening')",'<Modal']) assert(!code.includes(disallowed),disallowed);
});
check('R11R4 motion remains a non-blocking decoration on a single-paper reader',()=>{
 assert(code.includes('Animated.sequence(['));
 assert(code.includes('if (!visible || !imageReady || !animateLetter) {'),
   'Welcome motion must begin only after the artwork is ready and respect reduced motion');
 assert(code.includes('useNativeDriver: true'), 'Native-driver motion required');
 assert(code.includes('pointerEvents="none"') && code.includes('testID="r11r4-welcome-magic-sparkle"'),
   'Sparkle must never intercept Welcome taps');
 assert(!code.includes('setPhase(') && !code.includes('setTimeout(openLetter'),
   'Decoration must not reintroduce envelope phase or a delayed touch gate');
});
check('approved image ratio and inside-border source-space letter inset',()=>{
 assert.equal(model.exports.WELCOME_ART.width,941);assert.equal(model.exports.WELCOME_ART.height,1672);
 const p=model.exports.WELCOME_SAFE_PAPER;
 assert(p.left>100 && p.right<820 && p.top>365 && p.bottom<1430);
});
const devices=[['narrow',320,568],['regular',360,780],['tall',393,900],['very-tall',440,1050],['short',360,600],['tablet',800,1200],['landscape',760,360],['tiny',240,360]];
for(const [label,w,h] of devices){
 check(`cover image and inset coordinates stay clipped on ${label}`,()=>{
  const r=G(w,h);
  assert(r.imageWidth>=w-0.001 && r.imageHeight>=h-0.001);
  assert(r.imageLeft<=0.001 && r.imageTop<=0.001);
  assert(r.paperLeft>=16 && r.paperTop>=11);
  assert(r.paperLeft+r.paperWidth<=w-16+0.001);
  assert(r.paperTop+r.paperHeight<=h-11+0.001);
  assert(r.paperLeft >= r.imageLeft+model.exports.WELCOME_SAFE_PAPER.left*r.scale-0.001);
  assert(r.paperLeft+r.paperWidth <= r.imageLeft+model.exports.WELCOME_SAFE_PAPER.right*r.scale+0.001);
  assert(Math.abs(r.imageLeft*2+r.imageWidth-w)<.01);
  assert(Math.abs(r.imageTop*2+r.imageHeight-h)<.01);
  if(label==='tiny'||label==='landscape')assert(r.compactFallback);
 });
}
check('image and text share the same COVER coordinate transform',()=>{
 assert(code.includes('computeWelcomePaperGeometry(viewport.width, viewport.height)'));
 assert(code.includes('left:geometry.imageLeft')&&code.includes('width:geometry.imageWidth'));
 assert(code.includes('left: geometry.paperLeft')&&code.includes('height: geometry.paperHeight'));
 assert(code.includes('resizeMode="cover"')&&code.includes('onLayout={onLayoutStage}'));
 assert(!code.includes('resizeMode="contain"'));
});
check('title and body scroll together, footer is outside ScrollView',()=>{
 const s=code.indexOf('<Animated.ScrollView'),e=code.indexOf('</Animated.ScrollView>'),f=code.indexOf('testID="welcome-fixed-cta-footer"');
 assert(s>0&&e>s&&f>e);
 assert(code.includes('nestedScrollEnabled')&&code.includes('testID="welcome-letter-scroll"'));
 assert(code.includes('style={styles.scroll}')&&code.includes('scroll: {flex:1,minHeight:0}'));
});
check('14 exact approved paragraphs remain native, selectable and wrap',()=>{
 const p=JSON.parse(read('document/releases/r3r14/approved-letter-paragraphs.snapshot.json'));
 assert.equal(p.length,14);p.forEach(x=>assert(code.includes(x),x.slice(0,24)));
 assert(code.includes('<Text key={i} selectable'));
});
check('no visual sequence or touch gate before user can read the letter',()=>{
 assert(!code.includes('welcome-envelope-open') && !code.includes('onPress={openLetter}'));
 assert(code.includes('imageReady || imageFailed'));
 assert(code.includes('single-paper-image-ready')&&code.includes('single-paper-image-error-fallback'));
});
check('image timeout and tiny/landscape text-only reader remain usable',()=>{
 assert(code.includes('setImageFailed(true)')&&code.includes('5500'));
 assert(code.includes('imageFailed || geometry.compactFallback')&&code.includes('window.fontScale'));
 assert(code.includes('styles.fallbackPaper'));
});
check('continue button locks against double tap and failed ack does not open Home',()=>{
 assert(code.includes('if (inFlight.current) return;')&&code.includes('inFlight.current = true'));
 assert(code.includes('onPress={continueIntoFamily}') && code.includes('onContinue()'));
 assert(code.includes('single-paper-ack-failed') && code.includes('Alert.alert('));
 assert(auth.includes('await welcomeLedger.markSeen(target.uid, membership);'));
});
check('Auth/UID/Family gate unchanged; no unverified Home bypass',()=>{
 assert(gate.includes('authStatus === "signed-in" && verifiedFamily && welcomeReady && showWelcome'));
 assert(layout.includes('const allowFamilyRoutes = verifiedFamily && welcomeReady && !welcomeBlocking;'));
 assert(layout.includes('<Stack.Protected guard={allowFamilyRoutes}>'));
});
check('no AuthContext/Firestore/Render/Vercel calls introduced in Welcome',()=>{
 for(const forbidden of ['getDoc(','getDocs(','getDocFromServer','getDocsFromServer','firestore(','fetch(','axios(','router.push(','router.replace('])assert(!code.includes(forbidden),forbidden);
});
check('source TSX and coordinate helper have no syntax errors',()=>{
 for(const [file,input] of [['WelcomeModal.tsx',code],['welcomePaperGeometry.ts',pure]]){
  const tr=ts.transpileModule(input,{fileName:file,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
  const errors=(tr.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
  assert.equal(errors.length,0,errors.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')).join('; '));
 }
});
check('Lora Vietnamese and high readability toggle are both available',()=>{assert(code.includes("Lora_400Regular")&&code.includes("Lora_700Bold")&&code.includes('welcome-font-mode-toggle')&&code.includes('styles.clearParagraph'));});
console.log(`D7 single image geometry: ${count}/${count} PASS (source-only; APK not built)`);
