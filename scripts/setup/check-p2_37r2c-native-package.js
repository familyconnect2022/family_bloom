#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..', '..');
const args = new Set(process.argv.slice(2));
const requireNodeModule = args.has('--require-node-module');
const requireResolve = args.has('--require-resolve');
const requireEffectiveConfig = args.has('--require-effective-config');
const requireGenerated = args.has('--require-generated-project');
const requireGradleProject = args.has('--require-gradle-project');
const androidOnly = !process.env.EAS_BUILD_PLATFORM || process.env.EAS_BUILD_PLATFORM === 'android';
if (!androidOnly) {
  console.log('PASS P2.37R2C-H6 native package proof skipped for non-Android build');
  process.exit(0);
}

let failed = 0;
const pass = (m) => console.log(`PASS ${m}`);
const fail = (m) => { failed += 1; console.error(`FAIL ${m}`); };
const exists = (rel) => fs.existsSync(path.join(root, rel));
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

console.log('\nFamily Bloom P2.37R2C-H6-H1 — native package + binary identity preflight\n');

const pkg = JSON.parse(read('package.json'));
const app = JSON.parse(read('app.json'));
const eas = JSON.parse(read('eas.json'));
const localPkg = JSON.parse(read('modules/family-bloom-overlay/package.json'));
const config = JSON.parse(read('modules/family-bloom-overlay/expo-module.config.json'));

if (app.expo?.version === '1.3.26' && app.expo?.android?.versionCode === 143036) pass('app.json binary identity = 1.3.26 / 143036');
else fail('app.json must be version 1.3.26 with Android versionCode 143036');

if (eas.cli?.appVersionSource === 'local') pass('EAS appVersionSource=local locks app.json versionCode into build');
else fail('eas.json must set cli.appVersionSource=local');

if (eas.build?.['family-bloom-test']?.developmentClient === true) pass('family-bloom-test is a real developmentClient build for Metro workflow');
else fail('family-bloom-test must set developmentClient=true for Metro dev-client testing');

if (pkg.dependencies?.['family-bloom-overlay'] === 'file:modules/family-bloom-overlay') pass('root dependency pins family-bloom-overlay=file:modules/family-bloom-overlay');
else fail('root package.json must pin family-bloom-overlay as a file: dependency');

if (pkg.expo?.autolinking?.nativeModulesDir === './modules') pass('Expo nativeModulesDir explicitly points at ./modules');
else fail('expo.autolinking.nativeModulesDir must be ./modules');

if (localPkg.name === 'family-bloom-overlay' && localPkg.version === '1.3.18') pass('local module package identity/version = family-bloom-overlay@1.3.18');
else fail('local module package identity/version mismatch');

if (config.platforms?.includes('android') && config.android?.modules?.includes('expo.modules.familybloomoverlay.FamilyBloomOverlayModule')) pass('expo-module.config.json registers FamilyBloomOverlayModule for Android');
else fail('expo-module.config.json Android module registration missing');

const manifestRel = 'modules/family-bloom-overlay/android/src/main/AndroidManifest.xml';
if (exists(manifestRel)) pass('local Android library manifest is present');
else fail('local Android library manifest missing');

const kotlinRel = 'modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt';
if (exists(kotlinRel) && read(kotlinRel).includes('P2.37R2C-H22R8-native-1') && read(kotlinRel).includes('class FamilyBloomOverlayRail')) pass('native source contains H6 identity + decor rail');
else fail('native source missing H6 identity or decor rail');

const installed = path.join(root, 'node_modules', 'family-bloom-overlay');
if (fs.existsSync(installed)) {
  const installedPkgPath = path.join(installed, 'package.json');
  if (fs.existsSync(installedPkgPath)) {
    const installedPkg = JSON.parse(fs.readFileSync(installedPkgPath, 'utf8'));
    if (installedPkg.name === 'family-bloom-overlay' && installedPkg.version === '1.3.18') pass('node_modules contains family-bloom-overlay@1.3.18 direct dependency');
    else fail(`installed family-bloom-overlay version mismatch: ${installedPkg.version || 'unknown'}`);
  } else fail('node_modules/family-bloom-overlay has no package.json');
} else if (requireNodeModule) {
  fail('node_modules/family-bloom-overlay missing; run npm install before native build');
} else {
  console.log('INFO node_modules/family-bloom-overlay absent; install proof deferred to CLEAN APPLY/EAS');
}

let autolinkCli = null;
try {
  const packageJsonPath = require.resolve('expo-modules-autolinking/package.json', { paths: [root] });
  const autolinkPkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const binValue = typeof autolinkPkg.bin === 'string'
    ? autolinkPkg.bin
    : (autolinkPkg.bin?.['expo-modules-autolinking'] || Object.values(autolinkPkg.bin || {})[0]);
  if (binValue) autolinkCli = path.resolve(path.dirname(packageJsonPath), binValue);
} catch {}

if (!autolinkCli) {
  if (requireResolve) fail('expo-modules-autolinking CLI unavailable after dependency install');
  else console.log('INFO expo-modules-autolinking CLI unavailable; resolver proof deferred to real build');
} else {
  const result = spawnSync(process.execPath, [autolinkCli, 'resolve', '--platform', 'android'], { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  if (result.status === 0) pass('Expo Autolinking resolve --platform android completed');
  else fail(`Expo Autolinking resolve failed (${result.status ?? 'unknown'})`);
  if (output.includes('family-bloom-overlay')) pass('autolinking resolver sees family-bloom-overlay');
  else fail('autolinking resolver does NOT see family-bloom-overlay');
  if (output.includes('expo.modules.familybloomoverlay.FamilyBloomOverlayModule')) pass('autolinking resolver includes FamilyBloomOverlayModule class');
  else fail('autolinking resolver does NOT include FamilyBloomOverlayModule class');
}

if (requireEffectiveConfig) {
  let expoCli = null;
  try { expoCli = require.resolve('expo/bin/cli', { paths: [root] }); } catch {}
  if (!expoCli) {
    fail('Expo CLI unavailable; cannot verify effective build config');
  } else {
    const r = spawnSync(process.execPath, [expoCli, 'config', '--type', 'public', '--json'], { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    if (r.status !== 0) {
      fail(`expo config failed (${r.status ?? 'unknown'})`);
    } else {
      try {
        const effective = JSON.parse(r.stdout.trim());
        if (effective.android?.package === 'com.familybloom.android') pass('effective Expo config package=com.familybloom.android');
        else fail(`effective Expo package mismatch: ${effective.android?.package || 'missing'}`);
        if (effective.version === '1.3.26' && effective.android?.versionCode === 143036) pass('effective Expo config = 1.3.26 / versionCode 143036');
        else fail(`effective Expo binary identity mismatch: ${effective.version || '?'} / ${effective.android?.versionCode || '?'}`);
      } catch (error) {
        fail(`could not parse expo config JSON: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
}

if (requireGenerated || exists('android')) {
  if (!exists('android/settings.gradle')) fail('generated android/settings.gradle missing after prebuild');
  else {
    const settings = read('android/settings.gradle');
    if (/expo-autolinking-settings|useExpoModules/i.test(settings)) pass('generated Android settings have Expo autolinking enabled');
    else fail('generated Android settings do not enable Expo autolinking');
  }
} else {
  console.log('INFO generated Android project proof deferred until prebuild');
}

if (requireGradleProject) {
  const isWin = process.platform === 'win32';
  const androidDir = path.join(root, 'android');
  const gradle = path.join(androidDir, isWin ? 'gradlew.bat' : 'gradlew');
  if (!fs.existsSync(gradle)) fail('Gradle wrapper missing; cannot prove linked subproject');
  else {
    if (!isWin) { try { fs.chmodSync(gradle, 0o755); } catch {} }

    // H4: query the same `projects` graph that Gradle exposes to developers.
    // Keep process exit status and graph matching as two independent checks so
    // a Windows cmd/pipeline quirk can never masquerade as "module missing".
    let r;
    if (isWin) {
      const comspec = process.env.ComSpec || process.env.COMSPEC || 'cmd.exe';
      r = spawnSync(comspec, ['/d', '/c', 'gradlew.bat', 'projects', '--console=plain'], {
        cwd: androidDir, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, windowsHide: true
      });
    } else {
      r = spawnSync(gradle, ['projects', '--console=plain'], {
        cwd: androidDir, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
      });
    }

    const out = `${r.stdout || ''}\n${r.stderr || ''}`;
    const graphHasOverlay = /(?:Project|project)\s+['"]?:family-bloom-overlay['"]?/i.test(out)
      || /family-bloom-overlay\s*\(1\.3\.5\)/i.test(out);

    if (r.status === 0) pass('Gradle projects command completed');
    else {
      const diagnostic = out.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(-8).join(' | ');
      fail(`Gradle projects command failed (${r.status ?? 'unknown'})${diagnostic ? `: ${diagnostic}` : ''}`);
    }

    if (graphHasOverlay) pass('Gradle project graph contains family-bloom-overlay');
    else fail('Gradle project graph does NOT contain family-bloom-overlay');
  }
}

console.log(`\nP2.37R2C-H6-H1 native package/binary preflight: ${failed ? 'FAIL' : 'PASS'}\n`);
process.exit(failed ? 1 : 0);
