#!/usr/bin/env node
'use strict';
// Static contract: folder loop must not happen silently, source updater must be SHA-safe.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const script=read('scripts/maintenance/fb-r11-motion-safe-update.cjs');
const manifest=JSON.parse(read('document/releases/fb-r11-motion-manifest.json'));
assert(fs.existsSync(path.join(root,'scripts/android/maintenance/legacy/Family_Bloom_AUTO_UPDATE_FULL.bat')), 'Keep local auto-update BAT without requiring a specific release-specific UI');
assert(script.includes('function locateProject()'), 'Must discover nested project folders');
assert(script.includes('matches.length > 1'), 'Must reject ambiguous project folders');
assert(script.includes("item.depth >= 2"), 'Must bound discovery depth');
assert(script.includes('khong khop SHA R10/R11'), 'Must surface exact mismatch');
assert(script.includes('backupSource(target,backup)'), 'Must backup before writes');
assert(script.includes('Refusing symlink'), 'Must prevent source symlink escape');
assert(manifest.extraBefore['scripts/maintenance/fb-r11-motion-safe-update.cjs'].length===1);
assert(!manifest.replace.some(x=>x.path==='Family_Bloom_AUTO_UPDATE_FULL.bat'), 'Preserve existing target BAT');
assert(script.includes('preservedLocalTools')&&script.includes('[PRESERVED] Family_Bloom_AUTO_UPDATE_FULL.bat'));
console.log('R11R2 updater: PASS, explicit failure, preserve local BAT, bounded nested search, SHA/backup gates.');
