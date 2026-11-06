#!/usr/bin/env node
'use strict';
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const read=r=>fs.readFileSync(path.join(root,r),'utf8');
let passed=0;function check(label,condition){assert.ok(condition,label);passed++;console.log('PASS',label)}
const inputs=read('src/components/ui/BloomInputComponents/shared.ts');
const buttons=read('src/components/ui/BloomButtonComponents/shared.ts');
for (const [name,value] of [['Input',inputs],['Button',buttons]]) {
  check(name+' palette is semantic',value.includes("from '../../../constants/theme'") && !/#[A-Fa-f0-9]{6}/.test(value));
}
const textInput=read('src/components/ui/BloomInputComponents/BloomTextInput.tsx');
check('Focus border follows semantic tokens',textInput.includes('COLORS.inputBorderFocus') && !textInput.includes('#DA668C'));
check('Input background follows semantic tokens',textInput.includes('COLORS.inputSurfaceFocus') && !textInput.includes('#FFFBFC'));
check('Text input is an isolated theme subscriber',textInput.includes('useBloomThemeRevision();'));
const button=read('src/components/ui/BloomButtonComponents/BloomButton.tsx');
const hero=read('src/components/ui/BloomHeroHeader.tsx');
check('Button and header subscribe independently',button.includes('useBloomThemeRevision();')&&hero.includes('useBloomThemeRevision();'));
const rootLayout=read('src/app/_layout.tsx');
check('Root provider is not a theme subscriber',!/export default function RootLayout\(\)\s*\{\s*useBloomThemeRevision\(\)/.test(rootLayout));
check('Navigator and game shell stay isolated from theme toggles',rootLayout.includes('const RootNavigator =')&&!rootLayout.includes('  useBloomThemeRevision();')&&rootLayout.includes('<FamilySession criticalVisualAssetsReady='));
const tab=read('src/app/(tabs)/_layout.tsx');
check('Tab press does not update appearance store',!/(updateBloomPalette|updateBloomMode|applyBloomSelection|applyLivingAppearance|appearanceUserEdited)/.test(tab));
check('Persistent dock and immediate scene navigation stay isolated',tab.includes('PersistentTabBarController')&&tab.includes('persistentTabBarController.press(safeIndex)')&&!tab.includes('pendingCommitDelayRef.current + 8'));
check('Tab dock obeys still motion and has spring feedback',tab.includes('stillMotion')&&tab.includes('withSpring(')&&tab.includes('getBloomMotionLevel()'));

const welcome=read('src/components/onboarding/WelcomeModal.tsx');
check('Sealed envelope hint has no opaque button',!welcome.includes('realOpenButton')&&!welcome.includes('envelopeHint')&&welcome.includes('testID="welcome-one-artwork"'));
check('Sealed envelope has animated ripple and static accessibility fallback',!welcome.includes('hintWave')&&welcome.includes('imageReady')&&welcome.includes('styles.fallbackPaper'));
console.log(`R8R4R3 THEME + IMMEDIATE DOCK + WELCOME: ${passed}/${passed} PASS`);
