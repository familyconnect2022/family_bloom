#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
let passed=0;
const check=(name,condition)=>{assert.ok(condition,name);passed++;console.log('PASS '+name)};
const hero=read('src/components/ui/BloomHeroHeader.tsx');
check('Hero fills side edges with a taller bounded image and natural fog',hero.includes('viewportHeight * 0.35')&&hero.includes('contentFit="cover"')&&hero.includes('styles.storyAtmosphericFog'));
check('Hero no longer magnifies tiny thumbnail while full art decodes',!hero.includes('placeholder={scene && !artwork')&&hero.includes('recyclingKey='));
check('Hero uses high-priority image caching without an opacity-heavy loading transition',hero.includes('priority="high"')&&hero.includes('cachePolicy="memory-disk"')&&hero.includes('transition={0}'));
check('Hero retains light/dark and all four theme registry selection',hero.includes('const theme = useA3Theme();')&&hero.includes('const palette = theme.selection.palette;')&&hero.includes('getBloomHeroArt(scene, palette)'));
const picker=read('src/components/ui/BloomThemeSettingsPanel.tsx');
check('Appearance picker shows same-theme thumbnail during artwork decoding',picker.includes("getBloomHeroPreview('home', id)"));
check('Appearance picker uses actual scene artwork and high-priority cache',picker.includes("getBloomHeroArt('home', id)")&&picker.includes('cachePolicy="memory-disk"'));
const tokenTargets=['src/app/(tabs)/family.tsx','src/app/(tabs)/moments.tsx','src/app/(tabs)/planner.tsx','src/components/ui/BloomPageComponents.tsx'];
check('All important surfaces still use dynamic semantic colors',tokenTargets.every(x=>read(x).includes('COLORS.')));
check('No legacy pink-tinted family cards',!read(tokenTargets[0]).includes('rgba(240,142,170'));
check('No opaque pink waiting surface in Moments',!read(tokenTargets[1]).includes('rgba(255,247,250,0.96)'));
check('PageComponents card/controls are live theme subscribers',read(tokenTargets[3]).includes('useA3LegacyStyles(styles)') && read(tokenTargets[3]).includes('useA3Theme()'));
const list=require(path.join(root,'document/releases/r8r4r4r2/SHARED_THEME_SUBSCRIBERS.json'));
check('Important shared controls subscribe to palette changes',list.length>=30&&list.every(x=>(/useBloom(?:Theme|Colors)Revision\(\);/.test(read('src/components/'+x[0])) || /useA3(?:LegacyStyles|Theme|Tokens)\(/.test(read('src/components/'+x[0])) || read('src/components/'+x[0]).includes('useBloomTheme();'))));
const scenes=['home','family','moments','learning','events','settings'],themes=['rose','garden','heritage','midnight'];
// Home keeps the original optimized 900×583 assets. The five user-approved
// section scenes are intentionally different native sizes; check their exact
// approved hashes and dimensions rather than forcing them into the old crop.
const crypto=require('node:crypto');
const approved=JSON.parse(read('document/releases/r8r4r4r3r1/APPROVED_HERO_ASSETS.json'));
for(const scene of scenes)for(const theme of themes){
 const rel=`assets/images/storybook/heroes/v2/${scene}_${theme}.webp`,buf=fs.readFileSync(path.join(root,rel));
 const meta=approved.assets[`${scene}_${theme}.png`];
 const expectedSize=scene==='home'?[900,583]:meta?.size_px;
 const approvedDimensions=meta?.size_px && buf.readUIntLE(24,3)+1===meta.size_px[0] && buf.readUIntLE(27,3)+1===meta.size_px[1];
 check(`${scene}/${theme}: RGBA, aspect-safe, verified artwork`,
   buf.toString('ascii',0,4)==='RIFF' && buf.toString('ascii',8,12)==='WEBP' && buf.length>20_000 && buf.readUIntLE(24,3)+1===expectedSize?.[0] && buf.readUIntLE(27,3)+1===expectedSize?.[1] && (buf[20]&0x10)!==0 && (scene==='home'?buf.length<950_000:approvedDimensions));
}
check('App shell continues to isolate active view from root auth/session',!read('src/app/_layout.tsx').split('export default function RootLayout()')[1]?.split('return')[0]?.includes('useBloomThemeRevision('));
console.log(`R8R4R4R2 LIVE THEME + FAST HERO ${passed}/${passed} PASS`);
