#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const exists=p=>fs.existsSync(path.join(root,p));
const legacy=['src/web','public','vercel.json','src/app/+html.tsx','src/app/_layout.web.tsx','scripts/windows/web','scripts/android/build/Family_Bloom_WEB_RUN_TEST.bat'];
for(const p of legacy) assert(!exists(p),'Retired Expo Web content still in Android: '+p);
function walk(d){if(!fs.existsSync(d))return;for(const x of fs.readdirSync(d,{withFileTypes:true})){
const p=path.join(d,x.name);if(x.isDirectory())walk(p);else if(/\.web\.(tsx?|jsx?)$/i.test(x.name))throw Error('Web router still exists: '+p);
}}
walk(path.join(root,'src/app'));
const pkg=require(path.join(root,'package.json'));
for(const k of ['firebase','react-dom','react-native-web'])assert(!pkg.dependencies[k],'Web-only dependency: '+k);
for(const k of Object.keys(pkg.scripts))assert(!k.startsWith('web:') && k!=='web','Web npm script: '+k);
const expo=require(path.join(root,'app.json')).expo;
assert(!expo.web,'Expo Web config still enabled');
for(const k of ['@react-native-firebase/app','@react-native-firebase/auth','@react-native-firebase/firestore','expo-web-browser'])assert(pkg.dependencies[k],'Android runtime dependency accidentally removed: '+k);
assert(exists('assets/images/storybook/heroes/v2/family_rose.webp'),'Android hero WebP accidentally removed');
assert(exists('assets/images/tutorial-web.png'),'Native internal tutorial asset accidentally removed');
assert(exists('src/services/media/momentMediaApi.ts'),'Vercel Media Android client removed');
assert(exists('modules/family-bloom-overlay/android'),'Android board overlay removed');
const menu=fs.readFileSync(path.join(root,'scripts/android/Family_Bloom_MENU.bat'),'utf8');
assert(!/WEB (?:EXPO|EXPORT|LOCAL PREVIEW)/.test(menu),'Web app menu entry remains');
console.log('PASS Android-only: legacy Expo Web removed; native WebP, media API, Firebase and Chess/Xiangqi preserved');
