#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
if (process.env.EAS_BUILD_PLATFORM && process.env.EAS_BUILD_PLATFORM !== 'android') {
  console.log('PASS P2.37R2C-H3 EAS APK proof skipped for non-Android build');
  process.exit(0);
}
const root = path.resolve(__dirname, '..', '..');
const start = path.join(root, 'android', 'app', 'build', 'outputs');
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.isFile() && ent.name.toLowerCase().endsWith('.apk')) out.push(p);
  }
  return out;
}
const apks = walk(start).sort((a,b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
if (!apks.length) { console.error(`FAIL EAS build succeeded but no APK was found under ${start}`); process.exit(1); }
const checker = path.join(root, 'scripts', 'setup', 'check-p2_37r2c-apk-native-proof.js');
const r = spawnSync(process.execPath, [checker, apks[0]], { cwd: root, stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status || 1);
const audioChecker = path.join(root, 'scripts', 'setup', 'check-board-audio-apk.js');
const audioResult = spawnSync(process.execPath, [audioChecker, apks[0]], { cwd: root, stdio: 'inherit' });
if (audioResult.status !== 0) process.exit(audioResult.status || 1);
console.log(`PASS EAS on-success R2C binary proof: ${apks[0]}`);
