#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const EXPECTED_VERSION_CODE = '143038';
const EXPECTED_PACKAGE = 'com.familybloom.android';
const EXPECTED_IDENTITY = 'P2.37R2C-H23-native-1';

const apk = process.argv[2];
if (!apk) { console.error('FAIL usage: node scripts/setup/check-p2_37r2c-apk-native-proof.js <apk>'); process.exit(2); }
const resolved = path.resolve(apk);
if (!fs.existsSync(resolved)) { console.error(`FAIL APK not found: ${resolved}`); process.exit(1); }

function zipList() {
  try { return { tool: 'unzip', text: execFileSync('unzip', ['-Z1', resolved], { encoding: 'utf8' }) }; }
  catch {
    try { return { tool: 'jar', text: execFileSync('jar', ['tf', resolved], { encoding: 'utf8' }) }; }
    catch { console.error('FAIL neither unzip nor jar is available to inspect APK'); process.exit(1); }
  }
}

function findAapt() {
  const exe = process.platform === 'win32' ? 'aapt.exe' : 'aapt';
  try { execFileSync(exe, ['version'], { stdio: 'ignore' }); return exe; } catch {}
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!sdk) return null;
  const buildTools = path.join(sdk, 'build-tools');
  if (!fs.existsSync(buildTools)) return null;
  const versions = fs.readdirSync(buildTools).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  for (const v of versions) {
    const candidate = path.join(buildTools, v, exe);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const aapt = findAapt();
if (!aapt) {
  console.error('FAIL Android aapt not found; cannot prove APK package/versionCode');
  process.exit(1);
}
let badging;
try { badging = execFileSync(aapt, ['dump', 'badging', resolved], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }); }
catch (error) { console.error(`FAIL aapt dump badging failed: ${error instanceof Error ? error.message : String(error)}`); process.exit(1); }
const packageLine = badging.split(/\r?\n/).find((line) => line.startsWith('package:')) || '';
const pkg = packageLine.match(/name='([^']+)'/)?.[1];
const versionCode = packageLine.match(/versionCode='([^']+)'/)?.[1];
if (pkg !== EXPECTED_PACKAGE) { console.error(`FAIL APK package=${pkg || '?'} expected=${EXPECTED_PACKAGE}`); process.exit(1); }
if (versionCode !== EXPECTED_VERSION_CODE) { console.error(`FAIL APK versionCode=${versionCode || '?'} expected=${EXPECTED_VERSION_CODE}`); process.exit(1); }
console.log(`PASS APK manifest package/versionCode = ${pkg} / ${versionCode}`);

const listing = zipList();
const dexEntries = listing.text.split(/\r?\n/).filter((name) => /^classes\d*\.dex$/.test(name));
if (!dexEntries.length) { console.error('FAIL APK contains no classes*.dex'); process.exit(1); }

const needles = [
  'FamilyBloomOverlayModule',
  'FamilyBloomOverlayRail',
  'expo/modules/familybloomoverlay',
  EXPECTED_IDENTITY,
].map((s) => [s, Buffer.from(s, 'utf8')]);
const found = Object.fromEntries(needles.map(([s]) => [s, false]));

for (const entry of dexEntries) {
  let bytes;
  if (listing.tool === 'unzip') {
    bytes = execFileSync('unzip', ['-p', resolved, entry], { encoding: null, maxBuffer: 256 * 1024 * 1024 });
  } else {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fb-r2c-apk-'));
    try { execFileSync('jar', ['xf', resolved, entry], { cwd: tmp, stdio: 'ignore' }); bytes = fs.readFileSync(path.join(tmp, entry)); }
    finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }
  for (const [name, needle] of needles) found[name] ||= bytes.includes(needle);
}
const missing = Object.entries(found).filter(([, ok]) => !ok).map(([name]) => name);
if (missing.length) { console.error(`FAIL APK DEX native proof missing: ${missing.join(', ')}`); process.exit(1); }
console.log(`PASS APK DEX contains FamilyBloomOverlay module + decor rail + ${EXPECTED_IDENTITY}: ${path.basename(resolved)}`);
