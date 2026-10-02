const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const removePaths = [
  'assets/branding/dev',
  'config/firebase/google-services.dev.json',
  'config/firebase/README_DEV_FIREBASE.txt',
  'plugins/bloomDebugApplicationIdSuffixCore.js',
  'plugins/withBloomDebugApplicationIdSuffix.js',
  'scripts/setup/check-dev-firebase.js',
  'scripts/setup/check-generated-android-debug-suffix.js',
  'scripts/android/Family_Bloom_Android_DEV_Build_And_Run.bat',
  'scripts/android/Family_Bloom_Android_DEV_Metro_Only.bat',
  'scripts/android/Family_Bloom_Android_Print_DEV_SHA.bat',
  'scripts/test-phase14r1-dual-android-variants.js',
  'scripts/test-phase14r2-expo-doctor-build-fix.js',
  'scripts/test-phase14r3-dev-firebase-lock-gate.js',
  'scripts/test-phase14r4f-dev-device-targeting.js',
  'scripts/test-phase14r4g-release-gradle-suffix.js',
];

function rm(rel) {
  const target = path.join(root, rel);
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`removed ${rel}`);
}

for (const rel of removePaths) rm(rel);

const routes = [
  [/^PATCH_README_.*\.txt$/i, 'document/history/patches'],
  [/_DEVICE_CHECKLIST\.txt$/i, 'reports/device'],
  [/_IMPLEMENTATION_REPORT\.txt$/i, 'reports/validation'],
];
for (const name of fs.readdirSync(root)) {
  const source = path.join(root, name);
  if (!fs.statSync(source).isFile()) continue;
  for (const [pattern, folder] of routes) {
    if (!pattern.test(name)) continue;
    const dir = path.join(root, folder);
    fs.mkdirSync(dir, { recursive: true });
    const destination = path.join(dir, name);
    if (fs.existsSync(destination)) fs.rmSync(destination, { force: true });
    fs.renameSync(source, destination);
    console.log(`moved ${name} -> ${folder}/`);
    break;
  }
}

console.log('Phase 14T.0A cleanup complete.');
