#!/usr/bin/env node
'use strict';
// H21R3 build gate: prevent AAPT2 :packageReleaseResources failures from
// incorrectly named Android resource files, including copy-over leftovers.
// File resources must be [a-z0-9_]+.<extension> (or valid nine-patch .9.png).
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
const rootOption = args.find(v => v.startsWith('--root='));
const root = rootOption ? path.resolve(rootOption.slice('--root='.length))
  : path.resolve(__dirname, '../..');
const sourceOnly = args.includes('--source-only');
const scanRoots = [path.join(root, 'modules/family-bloom-overlay/android/src/main/res')];
if (!sourceOnly) scanRoots.push(path.join(root, 'android/app/src/main/res'));
const failures = [];
let files = 0;
function walk(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, {withFileTypes:true})) {
    const filepath = path.join(directory, entry.name);
    if (entry.isDirectory()) { walk(filepath); continue; }
    if (!entry.isFile()) continue;
    files++;
    // Android resource names only allow lowercase a-z, 0-9, underscore.
    // aapt2 accepts the .9.png suffix for nine-patch bitmaps.
    const filename = entry.name;
    if (!/^[a-z][a-z0-9_]*(?:\.9)?\.[a-z0-9]+$/.test(filename)) {
      failures.push(path.relative(root, filepath).replace(/\\/g,'/'));
    }
  }
}
scanRoots.forEach(walk);
if (failures.length) {
  console.error('FAIL Android file-based resource names invalid for AAPT2:');
  failures.forEach(f => console.error(`  ${f}`));
  console.error('Use lowercase letters, digits, underscores, and one valid extension (e.g. res/raw/keep.xml).');
  process.exit(1);
}
// Prevent silently passing if the required native audio/shrinker resources vanished.
const raw = path.join(scanRoots[0], 'raw');
const names = ['game_start','move_self','move_opponent','capture','move_check',
  'castle','promote','premove','illegal','tenseconds','game_end'];
for (const name of names) {
  const file = path.join(raw, `fb_board_${name}.mp3`);
  if (!fs.existsSync(file) || fs.statSync(file).size < 256) {
    console.error(`FAIL missing native MP3 resource: ${file}`);
    process.exit(1);
  }
}
const keep = path.join(raw, 'keep.xml');
if (!fs.existsSync(keep)) {
  console.error(`FAIL missing Android shrinker rules: ${keep}`);
  process.exit(1);
}
const xml = fs.readFileSync(keep, 'utf8');
if (!xml.includes('tools:keep=') || !xml.includes('xmlns:tools=') ||
    !names.every(n => xml.includes(`@raw/fb_board_${n}`))) {
  console.error('FAIL shrinker rules do not protect all 11 SoundPool MP3 resources');
  process.exit(1);
}
console.log(`PASS Android AAPT2 resource filename gate: ${files} files valid; 11/11 MP3 + res/raw/keep.xml protected`);
