#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const apk = process.argv[2];
if (!apk) { console.error('FAIL usage: node scripts/setup/check-p2_37r2-apk-native-proof.js <apk>'); process.exit(2); }
const resolved = path.resolve(apk);
if (!fs.existsSync(resolved)) { console.error(`FAIL APK not found: ${resolved}`); process.exit(1); }

function zipList() {
  try { return { tool: 'unzip', text: execFileSync('unzip', ['-Z1', resolved], { encoding: 'utf8' }) }; }
  catch {
    try { return { tool: 'jar', text: execFileSync('jar', ['tf', resolved], { encoding: 'utf8' }) }; }
    catch { console.error('FAIL neither unzip nor jar is available to inspect APK'); process.exit(1); }
  }
}

const listing = zipList();
const dexEntries = listing.text.split(/\r?\n/).filter((name) => /^classes\d*\.dex$/.test(name));
if (!dexEntries.length) { console.error('FAIL APK contains no classes*.dex'); process.exit(1); }

const needles = [
  'FamilyBloomOverlayModule',
  'FamilyBloomOverlayHostView',
  'expo/modules/familybloomoverlay',
  'P2.37R2-native-1',
].map((s) => [s, Buffer.from(s, 'utf8')]);
const found = Object.fromEntries(needles.map(([s]) => [s, false]));

for (const entry of dexEntries) {
  let bytes;
  if (listing.tool === 'unzip') {
    bytes = execFileSync('unzip', ['-p', resolved, entry], { encoding: null, maxBuffer: 256 * 1024 * 1024 });
  } else {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fb-r2-apk-'));
    try { execFileSync('jar', ['xf', resolved, entry], { cwd: tmp, stdio: 'ignore' }); bytes = fs.readFileSync(path.join(tmp, entry)); }
    finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }
  for (const [name, needle] of needles) found[name] ||= bytes.includes(needle);
}

const missing = Object.entries(found).filter(([, ok]) => !ok).map(([name]) => name);
if (missing.length) {
  console.error(`FAIL APK DEX native proof missing: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`PASS APK DEX contains P2.37R2 FamilyBloomOverlay module + HostView + native identity: ${path.basename(resolved)}`);
