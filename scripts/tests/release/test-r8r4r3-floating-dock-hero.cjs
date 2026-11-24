#!/usr/bin/env node
'use strict';
/** R8R4R3 Storybook image-hero + immediate floating/dock gesture contract.
 * Dependency-free code/asset tests only; does not claim APK-level gesture latency. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const tab=read('src/app/(tabs)/_layout.tsx');
const hero=read('src/components/ui/BloomHeroHeader.tsx');
const home=read('src/app/(tabs)/index.tsx');
const registry=read('src/theme/storybookHeroRegistry.ts');
let n=0;function check(desc,ok){assert.ok(ok,desc);console.log('PASS',desc);n++;}
check('Tab dock is a navigator sibling and remains mounted',tab.includes('<PersistentBloomTabBarHost />')&&tab.includes('TabNavigatorControllerBridge'));
check('Release gesture uses nearest-anchor index',tab.includes('Gesture.Exclusive(')&&tab.includes('activateAfterLongPress(190)')&&tab.includes('clampIndex(e.x, dockWidth)'));
check('Only final gesture/tap selection requests scene navigation',tab.includes('runOnJS(chooseTab)(index)')&&tab.includes('persistentTabBarController.press(safeIndex)'));
check('No delayed commit or old sliding indicator',!tab.includes('pendingCommitTimerRef')&&!tab.includes('slidingIndicator')&&!tab.includes('commitDelayMs'));
check('Tab animation is UI-thread spring, not theme mutation',tab.includes('withSpring(')&&tab.includes('bubbleX.value')&&!/(updateBloomMode|updateBloomPalette|applyLivingAppearance)/.test(tab));
check('Motion setting supports still icon without spring',tab.includes('stillMotion ? bubbleAt(index, itemWidth)')&&tab.includes('if (!stillMotion) bounce.value'));
check('Tab dock floats away from device edges',tab.includes('TAB_OUTER_MARGIN = 8')&&tab.includes('TAB_FLOAT_GAP = 4.5')&&tab.includes('borderRadius: 34'));
check('Navigator still freezes/prewarms scenes and preserves restore gate',tab.includes('freezeOnBlur: true')&&tab.includes('bloomTaskScheduler.schedule')&&tab.includes('tabRuntime.restoreFocus(tabId)'));
check('Image header preserves illustration aspect ratio instead of excessive cover crop',hero.includes('contentFit="cover"')&&hero.includes('viewportHeight * 0.35')&&hero.includes('styles.storyImageLayer')&&hero.includes('styles.copyWithArtwork'));
check('Header image follows four palettes and dark mode',hero.includes('getBloomSelection().palette')&&hero.includes('getBloomResolvedMode()')&&hero.includes('getBloomHeroArt(scene, palette)')&&['rose','garden','heritage','midnight'].every(x=>registry.includes('home_'+x+'.webp')));
check('Home retains theme-colored seamless page body',home.includes('pageBody: { marginTop: -3')&&home.includes('backgroundColor: COLORS.background'));
for(const scene of ['home','event','moment','tree']) for(const theme of ['rose','garden','heritage','midnight']) {
 const rel=`assets/images/storybook/heroes/${scene}_${theme}.png`;
 const bytes=fs.readFileSync(path.join(root,rel));
 check('Packaged PNG: '+scene+' '+theme,bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a' && bytes.length>20000);
}
console.log(`R8R4R3 FLOATING DOCK + REAL ART HERO ${n}/${n} PASS`);
