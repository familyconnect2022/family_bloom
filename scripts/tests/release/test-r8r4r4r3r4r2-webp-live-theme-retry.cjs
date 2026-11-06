#!/usr/bin/env node
'use strict';
/** In-source gates only. Real Android rendering and offline Firebase recovery require a device. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const rd=p=>fs.readFileSync(path.join(root,p));
const source=p=>rd(p).toString('utf8');
const themes=['rose','garden','heritage','midnight'];
const scenes=['home','family','moments','learning','events','settings'];
const approved=JSON.parse(source('document/releases/r8r4r4r3r1/APPROVED_HERO_ASSETS.json'));
function checkWebP(p,dimensions) {
 const b=rd(p);
 assert.equal(b.toString('ascii',0,4),'RIFF',`${p}: invalid RIFF`);
 assert.equal(b.toString('ascii',8,12),'WEBP',`${p}: not WebP`);
 assert.equal(b.toString('ascii',12,16),'VP8X',`${p}: expected alpha-capable WebP`);
 assert.ok((b[20] & 0x10)!==0,`${p}: alpha flag missing`);
 assert.equal(b.readUIntLE(24,3)+1, dimensions[0],`${p}: width modified`);
 assert.equal(b.readUIntLE(27,3)+1, dimensions[1],`${p}: height modified`);
 assert.ok(b.length>20_000 && b.length<380_000,`${p}: unexpected compression size`);
 return b.length;
}
let total=0;
const registry=source('src/theme/storybookHeroRegistry.ts'),fogRegistry=source('src/theme/storybookFogRegistry.ts');
for(const scene of scenes)for(const theme of themes){
 const key=`${scene}_${theme}`;
 const dims=scene==='home'?[900,583]:approved.assets[key+'.png'].size_px;
 total+=checkWebP(`assets/images/storybook/heroes/v2/${key}.webp`,dims);
 assert.ok(registry.includes(`v2/${key}.webp`),`registry missing ${key}`);
 assert.ok(!fs.existsSync(path.join(root,`assets/images/storybook/heroes/v2/${key}.png`)),`outdated full PNG ${key} still in new source`);
}
for(const theme of themes)for(const mode of ['light','dark']){
 const p=`assets/images/storybook/fog/${theme}_${mode}.webp`;
 const b=rd(p);
 assert.equal(b.toString('ascii',8,12),'WEBP');
 assert.ok((b[20] & 0x10)!==0);
 assert.ok(fogRegistry.includes(`fog/${theme}_${mode}.webp`));
 total+=b.length;
}
assert.ok(total<5_000_000,`Hero/fog collection is too large: ${total}`);
const header=source('src/components/ui/BloomHeroHeader.tsx');
assert.ok(header.includes('viewportHeight * 0.35') && header.includes('height: visibleHeroHeight'));
assert.ok(header.includes('getBloomHeroTextShade(palette')&&header.includes('styles.copyDirectOnArt'));
assert.ok(header.includes('recyclingKey=')&&header.includes('cachePolicy="memory-disk"'));
assert.ok(!header.includes('placeholder={scene && !artwork'), 'Do not upscale tiny thumbnails for full hero');
assert.ok(header.includes('getBloomFogArt(')&&header.includes('pointerEvents="none"'));
const lesson=source('src/features/learning/LessonRichView.tsx');
assert.ok(lesson.includes('get background(){return COLORS.surface}') && lesson.includes('get edge(){return COLORS.primary}'));
const moments=source('src/app/(tabs)/moments.tsx');
assert.ok(moments.includes('[themeRevision, error, loading, openComposer, retry]')&&moments.includes('[themeRevision, hasMore, loadingMore, moments.length]'));
const graph=source('src/app/(family)/(graph)/family-graph-admin.tsx');
assert.ok(graph.includes('const themeRevision = useBloomThemeRevision();')&&graph.includes('[themeRevision, busy, error')&&graph.includes('[themeRevision, deleteRelationship'));
const context=source('src/context/AuthContext.tsx'), gate=source('src/app/session-gate.tsx');
assert.ok(context.includes('setMembershipAttempt((current) => current + 1)') && !context.includes('if (authStatus === "initializing" || (profileStatus === "loading" && membershipStatus === "loading")) return;'));
assert.ok(context.includes('request !== profileRequestRef.current') && context.includes('listenerFailed'));
assert.ok(gate.includes('onPress={retryNow}') && gate.includes('retryFirebaseVerification();') && gate.includes('retrySequence]'));
assert.ok(source('metro.config.js').includes("assetExts.includes('webp')"));
const warm=source('src/theme/BloomHeroWarmup.tsx');
assert.ok(warm.includes('Image.loadAsync(getBloomHeroArt(scene, palette))') && warm.includes('warmRefs.clear()') && warm.includes('setTimeout('));
assert.ok(source('src/theme/BloomThemeProvider.tsx').includes('<BloomHeroWarmup />'));
console.log(`R8R4R4R3R4R2: 24 local alpha WebP heroes, 8 alpha fog assets, ${Math.round(total/1024)} KiB, 35% header, no blurry placeholder, dynamic theme caches, safe explicit retry: PASS (code/assets)`);
