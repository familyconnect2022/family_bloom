'use strict';

const fs = require('fs');
const path = require('path');
const { satisfiesRange } = require('./semver-contract');

const root = path.resolve(__dirname, '..', '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

// Keep this list limited to native/build-critical packages. Version policy is
// deliberately NOT duplicated here: package.json is the single source of truth.
const watchedDependencies = [
  'expo',
  'expo-dev-client',
  'expo-splash-screen',
  '@expo/ui',
  'expo-glass-effect',
  'expo-image-picker',
  'expo-linking',
  'expo-router',
  'expo-video',
  'expo-notifications',
  'expo-application',
  'expo-audio',
  'expo-asset',
];
const watchedDevDependencies = ['expo-doctor'];

function validateInstalled(name, spec, kind) {
  if (!spec) {
    console.error(`MISSING ${kind} contract for ${name} in package.json`);
    return false;
  }

  const pkgPath = path.join(root, 'node_modules', ...name.split('/'), 'package.json');
  if (!fs.existsSync(pkgPath)) {
    console.error(`MISSING ${name} (package.json contract ${spec})`);
    return false;
  }

  let installed;
  try {
    installed = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
  } catch (error) {
    console.error(`INVALID installed package metadata ${name}: ${error.message}`);
    return false;
  }

  if (!satisfiesRange(installed, spec)) {
    console.error(`MISMATCH ${name}: installed ${installed}, package.json requires ${spec}`);
    return false;
  }

  console.log(`OK ${name}@${installed} satisfies ${spec}`);
  return true;
}

let ok = true;
for (const name of watchedDependencies) {
  ok = validateInstalled(name, packageJson.dependencies?.[name], 'dependency') && ok;
}
for (const name of watchedDevDependencies) {
  ok = validateInstalled(name, packageJson.devDependencies?.[name], 'devDependency') && ok;
}

process.exit(ok ? 0 : 1);
