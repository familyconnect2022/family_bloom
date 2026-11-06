#!/usr/bin/env node
'use strict';
// H21R1: stage the native SoundPool audio into generated Android app resources.
// Android prebuild --clean recreates android/, so run AFTER prebuild and BEFORE Gradle.
// The Expo library also carries a valid res/raw/keep.xml for EAS builds.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '../..');
const source = path.join(root, 'modules/family-bloom-overlay/android/src/main/res/raw');
const dest = path.join(root, 'android/app/src/main/res/raw');
const names = [
  'game_start','move_self','move_opponent','capture','move_check','castle',
  'promote','premove','illegal','tenseconds','game_end',
];
if (!fs.existsSync(path.join(root, 'android/app/build.gradle'))) {
  console.error('FAIL: generated android/app/build.gradle missing. Run Expo prebuild first.');
  process.exit(1);
}
fs.mkdirSync(dest, { recursive: true });
for (const n of names) {
  const filename = `fb_board_${n}.mp3`;
  const input = path.join(source, filename);
  const output = path.join(dest, filename);
  if (!fs.existsSync(input) || fs.statSync(input).size < 256) {
    console.error(`FAIL: missing/empty native audio ${input}`);
    process.exit(1);
  }
  fs.copyFileSync(input, output);
  const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (hash(input) !== hash(output)) {
    console.error(`FAIL: native audio staging checksum mismatch: ${filename}`);
    process.exit(1);
  }
}
// H21R3: remove the obsolete dotted filename left behind by copy-over installs.
// Android AAPT2 will refuse to package a raw resource named com.familybloom.keep.xml.
for (const directory of [source, dest]) {
  const legacy = path.join(directory, 'com.familybloom.keep.xml');
  if (fs.existsSync(legacy)) {
    fs.rmSync(legacy);
    console.log(`Removed invalid legacy Android resource ${legacy}`);
  }
}
const keepFile = 'keep.xml';
const inputKeep = path.join(source, keepFile);
if (!fs.existsSync(inputKeep)) {
  console.error('FAIL: missing Android resource shrinker keep rules');
  process.exit(1);
}
fs.copyFileSync(inputKeep, path.join(dest, keepFile));
console.log(`PASS H21R3: ${names.length}/11 SoundPool raw MP3 files staged and hashed in generated Android app; shrinker keep rules staged`);
