#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const apk = process.argv[2];
if (!apk) {
  console.error('FAIL usage: node scripts/setup/check-p2_37-apk-native-class.js <apk>');
  process.exit(2);
}
const resolved = path.resolve(apk);
if (!fs.existsSync(resolved)) {
  console.error(`FAIL APK not found: ${resolved}`);
  process.exit(1);
}

let listing;
try {
  listing = execFileSync('unzip', ['-Z1', resolved], { encoding: 'utf8' });
} catch {
  // Windows build machines may not have unzip. PowerShell Expand-Archive is not
  // suitable for APK scanning without copying; use a tiny ZIP reader fallback
  // through the installed Java jar tool when available.
  try {
    listing = execFileSync('jar', ['tf', resolved], { encoding: 'utf8' });
  } catch (error) {
    console.error('FAIL neither unzip nor jar is available to inspect APK DEX payload');
    process.exit(1);
  }
}

const dexEntries = listing.split(/\r?\n/).filter((name) => /^classes\d*\.dex$/.test(name));
if (!dexEntries.length) {
  console.error('FAIL APK contains no classes*.dex');
  process.exit(1);
}

const needleA = Buffer.from('FamilyBloomOverlayModule', 'utf8');
const needleB = Buffer.from('expo/modules/familybloomoverlay', 'utf8');
let foundA = false;
let foundB = false;

for (const entry of dexEntries) {
  let bytes;
  try {
    bytes = execFileSync('unzip', ['-p', resolved, entry], { encoding: null, maxBuffer: 256 * 1024 * 1024 });
  } catch {
    const tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'fb-apk-'));
    try {
      execFileSync('jar', ['xf', resolved, entry], { cwd: tempDir, stdio: 'ignore' });
      bytes = fs.readFileSync(path.join(tempDir, entry));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
  foundA ||= bytes.includes(needleA);
  foundB ||= bytes.includes(needleB);
}

if (!foundA || !foundB) {
  console.error(`FAIL APK DEX missing FamilyBloomOverlay native class/package (class=${foundA}, package=${foundB})`);
  process.exit(1);
}
console.log(`PASS APK DEX contains FamilyBloomOverlayModule in ${path.basename(resolved)}`);
