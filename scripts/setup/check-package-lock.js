'use strict';

const fs = require('fs');
const path = require('path');
const { satisfiesRange } = require('./semver-contract');

const root = path.resolve(__dirname, '..', '..');
const lockPath = path.join(root, 'package-lock.json');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

if (!fs.existsSync(lockPath)) {
  console.error('MISSING package-lock.json (run npm install once to generate the local reproducible lock).');
  process.exit(1);
}

let lock;
try {
  lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
} catch (error) {
  console.error(`INVALID package-lock.json: ${error.message}`);
  process.exit(1);
}

const watchedDependencies = [
  'expo',
  'expo-dev-client',
  'expo-splash-screen',
  '@expo/ui',
  'expo-glass-effect',
  'expo-image-picker',
  'expo-image-manipulator',
  'expo-file-system',
  'expo-linking',
  'expo-router',
  'expo-video',
  'expo-notifications',
  'expo-application',
  'expo-audio',
  'expo-asset',
  'react-native-webview',
];
const watchedDevDependencies = ['expo-doctor'];
const rootDeps = lock.packages?.['']?.dependencies || {};
const rootDevDeps = lock.packages?.['']?.devDependencies || {};

function validateLockEntry(name, spec, rootSpec, kind) {
  let ok = true;
  if (!spec) {
    console.error(`MISSING ${kind} contract ${name} in package.json`);
    return false;
  }
  if (rootSpec !== spec) {
    console.error(`LOCK ROOT MISMATCH ${name}: lock=${rootSpec || '<missing>'}, package=${spec}`);
    ok = false;
  }

  const lockEntry = lock.packages?.[`node_modules/${name}`];
  const linked = typeof spec === 'string' && spec.startsWith('file:');
  const localPath = linked ? spec.slice(5) : null;
  const lockedVersion = linked ? lock.packages?.[localPath]?.version : lockEntry?.version;
  if (linked && (lockEntry?.link !== true || lockEntry?.resolved !== localPath)) {
    console.error(`LOCK LOCAL LINK MISMATCH ${name}`);
    return false;
  }
  if (!lockedVersion) {
    console.error(`LOCK ENTRY MISSING ${name}`);
    return false;
  }
  if (!satisfiesRange(lockedVersion, spec)) {
    console.error(`LOCK VERSION MISMATCH ${name}: locked ${lockedVersion}, package.json requires ${spec}`);
    ok = false;
  }

  const installedPath = path.join(root, 'node_modules', ...name.split('/'), 'package.json');
  if (!fs.existsSync(installedPath)) {
    console.error(`INSTALLED ENTRY MISSING ${name} while lock pins ${lockedVersion}`);
    return false;
  }
  let installedVersion;
  try {
    installedVersion = JSON.parse(fs.readFileSync(installedPath, 'utf8')).version;
  } catch (error) {
    console.error(`INVALID installed package metadata ${name}: ${error.message}`);
    return false;
  }
  if (linked) {
    const localPackage = JSON.parse(fs.readFileSync(path.join(root, localPath, 'package.json'), 'utf8'));
    if (localPackage.name !== name || localPackage.version !== lockedVersion) {
      console.error(`LOCK LOCAL PACKAGE MISMATCH ${name}`);
      ok = false;
    }
  }
  if (installedVersion !== lockedVersion) {
    console.error(`LOCK/INSTALLED MISMATCH ${name}: installed ${installedVersion}, locked ${lockedVersion}`);
    ok = false;
  }

  if (ok) console.log(`OK ${name}: ${installedVersion} locked, satisfies ${spec}`);
  return ok;
}

let ok = true;
for (const name of new Set([...watchedDependencies, ...Object.keys(packageJson.dependencies || {})])) {
  ok = validateLockEntry(name, packageJson.dependencies?.[name], rootDeps[name], 'dependency') && ok;
}
for (const name of new Set([...watchedDevDependencies, ...Object.keys(packageJson.devDependencies || {})])) {
  ok = validateLockEntry(name, packageJson.devDependencies?.[name], rootDevDeps[name], 'devDependency') && ok;
}
process.exit(ok ? 0 : 1);
