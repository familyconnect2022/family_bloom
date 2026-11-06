#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..', '..');
const args = new Set(process.argv.slice(2));
const requireNodeModule = args.has('--require-node-module');
const requireResolve = args.has('--require-resolve');
const requireGenerated = args.has('--require-generated-project');
const requireGradleProject = args.has('--require-gradle-project');
const androidOnly = !process.env.EAS_BUILD_PLATFORM || process.env.EAS_BUILD_PLATFORM === 'android';
if (!androidOnly) {
  console.log('PASS P2.37R1 native package proof skipped for non-Android build');
  process.exit(0);
}

let failed = 0;
const pass = (m) => console.log(`PASS ${m}`);
const fail = (m) => { failed += 1; console.error(`FAIL ${m}`); };
const exists = (rel) => fs.existsSync(path.join(root, rel));
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

console.log('\nFamily Bloom P2.37R1 — native package/autolink binary preflight\n');

const pkg = JSON.parse(read('package.json'));
const localPkg = JSON.parse(read('modules/family-bloom-overlay/package.json'));
const config = JSON.parse(read('modules/family-bloom-overlay/expo-module.config.json'));

if (pkg.dependencies?.['family-bloom-overlay'] === 'file:modules/family-bloom-overlay') pass('root dependency pins family-bloom-overlay=file:modules/family-bloom-overlay');
else fail('root package.json must pin family-bloom-overlay as a file: dependency');

if (pkg.expo?.autolinking?.nativeModulesDir === './modules') pass('Expo nativeModulesDir explicitly points at ./modules');
else fail('expo.autolinking.nativeModulesDir must be ./modules');

if (localPkg.name === 'family-bloom-overlay' && localPkg.version === '1.2.0') pass('local module package identity/version = family-bloom-overlay@1.2.0');
else fail('local module package identity/version mismatch');

if (config.platforms?.includes('android') && config.android?.modules?.includes('expo.modules.familybloomoverlay.FamilyBloomOverlayModule')) pass('expo-module.config.json registers FamilyBloomOverlayModule for Android');
else fail('expo-module.config.json Android module registration missing');

const kotlinRel = 'modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt';
if (exists(kotlinRel) && read(kotlinRel).includes('P2.37R1-native-1') && read(kotlinRel).includes('class FamilyBloomOverlayHostView')) pass('native source contains R1 identity + HostView');
else fail('native source missing R1 identity or HostView');

const installed = path.join(root, 'node_modules', 'family-bloom-overlay');
if (fs.existsSync(installed)) {
  const installedPkgPath = path.join(installed, 'package.json');
  if (fs.existsSync(installedPkgPath)) {
    const installedPkg = JSON.parse(fs.readFileSync(installedPkgPath, 'utf8'));
    if (installedPkg.name === 'family-bloom-overlay' && installedPkg.version === '1.2.0') pass('node_modules contains family-bloom-overlay@1.2.0 direct dependency');
    else fail('installed family-bloom-overlay package identity/version mismatch');
  } else fail('node_modules/family-bloom-overlay has no package.json');
} else if (requireNodeModule) {
  fail('node_modules/family-bloom-overlay missing; run npm install before native build');
} else {
  console.log('INFO node_modules/family-bloom-overlay absent; install proof deferred to CLEAN APPLY/EAS');
}

let cli = null;
try {
  const packageJsonPath = require.resolve('expo-modules-autolinking/package.json', { paths: [root] });
  const autolinkPkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const binValue = typeof autolinkPkg.bin === 'string' ? autolinkPkg.bin : (autolinkPkg.bin?.['expo-modules-autolinking'] || Object.values(autolinkPkg.bin || {})[0]);
  if (binValue) cli = path.resolve(path.dirname(packageJsonPath), binValue);
} catch {}

if (!cli) {
  if (requireResolve) fail('expo-modules-autolinking CLI unavailable after dependency install');
  else console.log('INFO expo-modules-autolinking CLI unavailable; resolver proof deferred to real build');
} else {
  const result = spawnSync(process.execPath, [cli, 'resolve', '--platform', 'android'], { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  if (result.status === 0) pass('Expo Autolinking resolve --platform android completed');
  else fail(`Expo Autolinking resolve failed (${result.status ?? 'unknown'})`);
  if (output.includes('family-bloom-overlay')) pass('autolinking resolver sees family-bloom-overlay');
  else fail('autolinking resolver does NOT see family-bloom-overlay');
  if (output.includes('expo.modules.familybloomoverlay.FamilyBloomOverlayModule')) pass('autolinking resolver includes FamilyBloomOverlayModule class');
  else fail('autolinking resolver does NOT include FamilyBloomOverlayModule class');
}

if (requireGenerated || exists('android')) {
  if (!exists('android/settings.gradle')) fail('generated android/settings.gradle missing after prebuild');
  else {
    const settings = read('android/settings.gradle');
    if (/expo-autolinking-settings|useExpoModules/i.test(settings)) pass('generated Android settings have Expo autolinking enabled');
    else fail('generated Android settings do not enable Expo autolinking');
  }
} else {
  console.log('INFO generated Android project proof deferred until expo prebuild');
}

if (requireGradleProject) {
  const isWin = process.platform === 'win32';
  const gradle = path.join(root, 'android', isWin ? 'gradlew.bat' : 'gradlew');
  if (!fs.existsSync(gradle)) fail('Gradle wrapper missing; cannot prove linked subproject');
  else {
    if (!isWin) { try { fs.chmodSync(gradle, 0o755); } catch {} }
    const r = spawnSync(gradle, ['projects', '--console=plain'], { cwd: path.join(root, 'android'), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, shell: isWin });
    const out = `${r.stdout || ''}\n${r.stderr || ''}`;
    if (r.status === 0) pass('Gradle project graph configured successfully');
    else fail(`Gradle projects failed (${r.status ?? 'unknown'})`);
    if (/family[-_]bloom[-_]overlay/i.test(out)) pass('Gradle project graph contains family-bloom-overlay');
    else fail('Gradle project graph does NOT contain family-bloom-overlay');
  }
}

console.log(`\nP2.37R1 native package/autolink preflight: ${failed ? 'FAIL' : 'PASS'}\n`);
process.exit(failed ? 1 : 0);
