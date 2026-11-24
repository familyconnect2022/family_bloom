#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const manifest=JSON.parse(read('document/releases/fb-r11-motion-manifest.json'));
const updater=read('scripts/maintenance/fb-r11-motion-safe-update.cjs');
assert(!manifest.replace.some(e=>e.path==='Family_Bloom_AUTO_UPDATE_FULL.bat'));
assert(!manifest.extra.includes('Family_Bloom_AUTO_UPDATE_FULL.bat'));
assert(updater.includes('preservedLocalTools'));
assert(updater.includes('manifest.replace.some(item => preservedLocalTools.has(item.path))'));
assert(updater.includes('[PRESERVED] Family_Bloom_AUTO_UPDATE_FULL.bat'));
assert(updater.includes('if (mismatches.length) fail('));
assert(updater.includes('backupSource(target,backup)'));
assert(updater.includes("if(mode === 'check')"));
assert(updater.includes("else if(mode === 'install') install()"));
console.log('R11R2 Preserve R10 BAT CONTRACT PASS');
