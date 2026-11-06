#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..', '..');
const requireResolve = process.argv.includes('--require-resolve');
const androidOnly = !process.env.EAS_BUILD_PLATFORM || process.env.EAS_BUILD_PLATFORM === 'android';
if (!androidOnly) {
  console.log('PASS P2.37 native autolink check skipped for non-Android EAS build');
  process.exit(0);
}

let failed = 0;
function pass(message) { console.log(`PASS ${message}`); }
function fail(message) { failed += 1; console.error(`FAIL ${message}`); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

const moduleRoot = 'modules/family-bloom-overlay';
const packagePath = `${moduleRoot}/package.json`;
const configPath = `${moduleRoot}/expo-module.config.json`;
const kotlinPath = `${moduleRoot}/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt`;
const gradlePath = `${moduleRoot}/android/build.gradle`;

console.log('\nFamily Bloom P2.37 — native autolink hard gate\n');

for (const rel of [packagePath, configPath, kotlinPath, gradlePath]) {
  if (exists(rel)) pass(`${rel} exists`); else fail(`${rel} missing`);
}

if (exists(packagePath)) {
  const pkg = JSON.parse(read(packagePath));
  if (pkg.name === 'family-bloom-overlay') pass('local module package identity is stable');
  else fail('local module package name must be family-bloom-overlay');
}

if (exists(configPath)) {
  const cfg = JSON.parse(read(configPath));
  if (cfg.platforms?.includes('android')) pass('expo-module.config.json enables Android');
  else fail('expo-module.config.json must enable Android');
  if (cfg.android?.modules?.includes('expo.modules.familybloomoverlay.FamilyBloomOverlayModule')) pass('config registers FamilyBloomOverlayModule');
  else fail('config does not register FamilyBloomOverlayModule');
}

const appPkg = JSON.parse(read('package.json'));
if (appPkg.expo?.autolinking?.nativeModulesDir === './modules') pass('root package.json pins Expo local nativeModulesDir=./modules');
else fail('root package.json must explicitly pin expo.autolinking.nativeModulesDir to ./modules');

let cli = null;
try {
  const packageJsonPath = require.resolve('expo-modules-autolinking/package.json', { paths: [root] });
  const autolinkPkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const binValue = typeof autolinkPkg.bin === 'string'
    ? autolinkPkg.bin
    : (autolinkPkg.bin?.['expo-modules-autolinking'] || Object.values(autolinkPkg.bin || {})[0]);
  if (binValue) cli = path.resolve(path.dirname(packageJsonPath), binValue);
} catch {}


if (!cli) {
  if (requireResolve) fail('expo-modules-autolinking CLI unavailable after install/prebuild');
  else console.log('INFO node_modules absent; resolver phase deferred to real Android/EAS build');
} else {
  const result = spawnSync(process.execPath, [cli, 'resolve', '--platform', 'android'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  if (result.status === 0) pass('Expo Autolinking resolve --platform android completed');
  else fail(`Expo Autolinking resolve failed (${result.status ?? 'unknown'})`);
  if (output.includes('expo.modules.familybloomoverlay.FamilyBloomOverlayModule')) pass('Expo Autolinking resolver includes FamilyBloomOverlayModule');
  else fail('Expo Autolinking resolver output does NOT include FamilyBloomOverlayModule');
  if (output.includes('family-bloom-overlay')) pass('Expo Autolinking resolver sees family-bloom-overlay local package');
  else fail('Expo Autolinking resolver does NOT see family-bloom-overlay package');
}

if (exists('android')) {
  const settings = exists('android/settings.gradle') ? read('android/settings.gradle') : '';
  if (/expo-autolinking-settings|useExpoModules/i.test(settings)) pass('generated Android settings enable Expo Autolinking');
  else fail('generated android/settings.gradle does not appear to enable Expo Autolinking');
} else {
  console.log('INFO android/ not generated in FULL source; generated-project checks run after prebuild');
}

console.log(`\nP2.37 native autolink gate: ${failed ? 'FAIL' : 'PASS'}`);
process.exit(failed ? 1 : 0);
