#!/usr/bin/env node
'use strict';
/** Full-coverage source/art regression tests. Do not equate static PASS with APK visual approval. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
let n=0;function check(label,ok){assert.ok(ok,label);n++;console.log('PASS',label)}
const registry=read('src/theme/storybookHeroRegistry.ts');const hero=read('src/components/ui/BloomHeroHeader.tsx');const picker=read('src/components/ui/BloomThemeSettingsPanel.tsx');
const scenes=['home','family','moments','learning','events','settings'];const themes=['rose','garden','heritage','midnight'];
for(const scene of scenes){
 check(`Central section ${scene} mapped to scene`,registry.includes('  '+scene+': {'));
 for(const theme of themes){
  const relative=`assets/images/storybook/heroes/v2/${scene}_${theme}.webp`;
  check(`${relative} included through Metro static require`,registry.includes(`require('../../${relative}')`));
  const bytes=fs.readFileSync(path.join(root,relative));
  check(`${relative} nonempty WebP`,bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP'&&bytes.length>20000);
 }
}
check('Actual scene resolution is central, not copied hard-coded palette maps',hero.includes('getBloomHeroArt(scene, palette)'));
check('Dark mode and compact child illustration support',hero.includes("theme.resolvedMode === 'dark'")&&hero.includes('storyImageLayerCompact')&&hero.includes('copyWithArtworkCompact'));
check('Theme picker shows the same actual art source as live Home',picker.includes("getBloomHeroArt('home', id)")&&picker.includes('<Image source=')&&picker.includes('setPalette(id)'));
check('Card artwork is theme aware',read('src/app/(tabs)/index.tsx').includes("getBloomHeroArt('moments', getBloomSelection().palette)")&&read('src/app/(tabs)/index.tsx').includes("getBloomHeroArt('events', getBloomSelection().palette)"));
check('Learning components no longer capture rose accents',!read('src/app/(home)/(learning)/learning-lesson.tsx').includes('#AD3F78')&&!read('src/features/study/StudyFormulaEditor.tsx').includes('#AE437A'));
check('Hub cards derive accents from active palette',!/<HubCard[^>]*accent="#[\da-f]{6}"/i.test(read('src/app/(tabs)/play.tsx')));
check('Global theme does not subscribe at root every tab touch',!read('src/app/_layout.tsx').split('export default function RootLayout()')[1]?.split('return')[0]?.includes('useBloomThemeRevision('));
console.log(`R8R4R4 THEME SCENE COVERAGE ${n}/${n} PASS`);
