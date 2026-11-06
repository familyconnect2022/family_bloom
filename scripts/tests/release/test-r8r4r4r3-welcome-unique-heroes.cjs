#!/usr/bin/env node
'use strict';
// Android *source* regression check. A PASS is not evidence of real-device touch success.
const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto'), assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const rd=p=>fs.readFileSync(path.join(root,p),'utf8');
let count=0;function test(name,ok){assert.ok(ok,name);console.log('PASS:',name);count++;}
const code=rd('src/components/onboarding/WelcomeModal.tsx');
test('Welcome owns an authenticated in-stack native foreground screen, no overlay Modal',
  !code.includes('<Modal') && rd('src/app/_layout.tsx').includes('welcomeBlocking = verifiedFamily && welcomeReady && showWelcome')
  && rd('src/app/session-gate.tsx').includes('testID="verified-welcome-native-screen"') && rd('src/app/_layout.tsx').includes('name="welcome"'));
test('Envelope is a full-screen native Pressable containing its static image',code.includes('Image source={WELCOME_PAGE}') && code.includes('resizeMode="cover"') && code.includes('testID="welcome-one-artwork"') && !code.includes('elevation: 100'));
test('Reader still guarded, scrollable and animated with a timeout',code.includes('single-paper-image-timeout-fallback') && code.includes('testID="welcome-letter-scroll"') && code.includes('onPress={continueIntoFamily}'));
test('No extra pink open button',!code.includes('styles.realOpenButton'));
const scenes=['family','moments','learning','events','settings'];const palettes=['rose','garden','heritage','midnight'];
const hashes=new Set();
for(const theme of palettes) {
 const homePath=path.join(root,`assets/images/storybook/heroes/v2/home_${theme}.webp`);
 const homeHash=crypto.createHash('sha256').update(fs.readFileSync(homePath)).digest('hex');
 for(const scene of scenes){
   const file=path.join(root,`assets/images/storybook/heroes/v2/${scene}_${theme}.webp`);
   const bytes=fs.readFileSync(file);const hash=crypto.createHash('sha256').update(bytes).digest('hex');
   test(`${scene}/${theme} has its own physical scene asset`,hash!==homeHash && bytes.length>20000 && !hashes.has(hash));
   hashes.add(hash);
 }
}
const registry=rd('src/theme/storybookHeroRegistry.ts');
test('Five sections map to their own scene files',scenes.every(scene=>registry.includes(`${scene}: {`)));
console.log(`R8R4R4R3 WELCOME + INDEPENDENT SCENE SOURCE CONTRACT: ${count}/${count} PASS`);
