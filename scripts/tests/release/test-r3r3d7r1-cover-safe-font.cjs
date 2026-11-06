#!/usr/bin/env node
const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');const path=require('node:path');
const base=path.resolve(__dirname,'../../..');const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const src=read('src/services/navigation/welcomePaperGeometry.ts');const code=read('src/components/onboarding/WelcomeModal.tsx');
const sandbox={exports:{}};vm.runInNewContext(ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,sandbox);
const go=sandbox.exports.computeWelcomePaperGeometry;let n=0;function check(name,fn){fn();++n;console.log(`PASS D7R1 ${n} ${name}`)}
check('cover used and contain prohibited',()=>{assert(code.includes('resizeMode="cover"'));assert(!code.includes('resizeMode="contain"'));});
check('source safe area between two ornamental lines',()=>{const p=sandbox.exports.WELCOME_SAFE_PAPER;assert(p.left>100&&p.right<820&&p.top>350&&p.bottom<1450)});
for(const [name,w,h] of [['compact',320,720],['android',393,900],['long',360,900],['ultralong',360,1050],['short',360,640],['tablet',800,1280],['landscape',800,360]])check('cover geometry '+name,()=>{const r=go(w,h);assert(r.imageWidth+1e-4>=w&&r.imageHeight+1e-4>=h);assert(r.paperLeft>=17);assert(r.paperLeft+r.paperWidth<=w-17+1e-4);assert(r.paperTop>=12);assert(r.paperTop+r.paperHeight<=h-12+1e-4);assert(r.paperWidth>=0&&r.paperHeight>=0)});
check('Lora title scrolls with content; fixed CTA outside ScrollView',()=>{const start=code.indexOf('<Animated.ScrollView');const end=code.indexOf('</Animated.ScrollView>');assert(start>0&&end>start&&code.indexOf('testID="welcome-fixed-cta-footer"')>end);});
check('Lora Vietnamese and accessible reading toggle',()=>{assert(code.includes('Lora_400Regular')&&code.includes('Lora_700Bold'));assert(code.includes('welcome-font-mode-toggle'));assert(code.includes('styles.clearParagraph')&&code.includes('welcome-pink-scrollbar'));});
check('full 14 paragraphs unchanged',()=>{const list=JSON.parse(read('document/releases/r3r14/approved-letter-paragraphs.snapshot.json'));assert.equal(list.length,14);list.forEach(s=>assert(code.includes(s)));});
console.log(`${n}/${n} PASS`);
