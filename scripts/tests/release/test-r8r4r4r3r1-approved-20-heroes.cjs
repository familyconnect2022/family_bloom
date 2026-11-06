#!/usr/bin/env node
'use strict';
const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto'), assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const rd=(p)=>fs.readFileSync(path.join(root,p));
const manifest=JSON.parse(rd('document/releases/r8r4r4r3r1/APPROVED_HERO_ASSETS.json'));
const registry=rd('src/theme/storybookHeroRegistry.ts').toString();
const header=rd('src/components/ui/BloomHeroHeader.tsx').toString();
const welcome=rd('src/components/onboarding/WelcomeModal.tsx').toString();
const scenes=['family','moments','learning','events','settings'], palettes=['rose','garden','heritage','midnight'];
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
let passed=0;
for(const scene of scenes)for(const palette of palettes){
 const key=`${scene}_${palette}.png`, meta=manifest.assets[key];
 assert.ok(meta,`Missing approved manifest: ${key}`);
 const main=`assets/images/storybook/heroes/v2/${scene}_${palette}.webp`;
 const thumb=`assets/images/storybook/heroes/v2/thumbs/${key}`;
 const mainBytes=rd(main), thumbBytes=rd(thumb);
 // The approved PNG was intentionally transcoded to WebP with alpha, so its
 // binary SHA256 cannot equal the unchanged original-art reference manifest.
 assert.equal(mainBytes.toString('ascii',0,4),'RIFF',`Not RIFF WebP: ${key}`);
 assert.equal(mainBytes.toString('ascii',8,12),'WEBP',`Not WebP: ${key}`);
 assert.equal(mainBytes.toString('ascii',12,16),'VP8X',`Expected extended alpha WebP: ${key}`);
 assert.ok((mainBytes[20] & 0x10) !== 0,`Missing alpha channel: ${key}`);
 assert.equal(hash(thumbBytes),meta.thumbnail_sha256,`Wrong theme thumbnail: ${key}`);
 assert.ok(registry.includes(`v2/${scene}_${palette}.webp`)&&registry.includes(`v2/thumbs/${key}`),`Registry missing ${key}`);

 assert.equal(mainBytes.readUIntLE(24,3)+1,meta.size_px[0],`Wrong width: ${key}`);
 assert.equal(mainBytes.readUIntLE(27,3)+1,meta.size_px[1],`Wrong height: ${key}`);
 passed++;
}
for(const theme of palettes){
 const p=`assets/images/storybook/heroes/v2/home_${theme}.webp`;
 assert.ok(fs.statSync(path.join(root,p)).size>20000,'Home must be preserved: '+p);
}
assert.ok(header.includes('getBloomHeroArt(scene, palette)')&&header.includes('getBloomHeroTextShade(palette')&&header.includes('contentFit="cover"'),'Header lacks themed full-bleed artwork / alpha fade positioning');
const welcomeRoute=rd('src/app/welcome.tsx').toString(), layout=rd('src/app/_layout.tsx').toString();
assert.ok(!welcome.includes('<Modal')&&welcome.includes('testID="welcome-one-artwork"')&&rd('src/app/session-gate.tsx').toString().includes('testID="verified-welcome-native-screen"')&&layout.includes('name="welcome"'),'Protected in-stack Welcome interaction unexpectedly removed');
console.log(`APPROVED 20 HERO + R8R4R4R3 NATIVE WELCOME: ${passed}/20 art entries, registry, Home and welcome PASS`);
