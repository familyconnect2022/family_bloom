const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
const lockPath = path.join(root, 'package-lock.json');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

if (!fs.existsSync(lockPath)) {
  console.error('MISSING package-lock.json (npm install will generate it).');
  process.exit(1);
}

let lock;
try {
  lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
} catch (error) {
  console.error(`INVALID package-lock.json: ${error.message}`);
  process.exit(1);
}

const rootDeps = lock.packages?.['']?.dependencies || {};
const watched = [
  '@expo/ui',
  'expo-glass-effect',
  'expo-image-picker',
  'expo-linking',
  'expo-router',
  'expo-video',
  'expo-notifications',
  'expo-application',
];
let ok = true;
for (const name of watched) {
  const spec = packageJson.dependencies?.[name];
  if (rootDeps[name] !== spec) {
    console.error(`LOCK ROOT MISMATCH ${name}: lock=${rootDeps[name] || '<missing>'}, package=${spec || '<missing>'}`);
    ok = false;
  }
  const installedEntry = lock.packages?.[`node_modules/${name}`];
  if (!installedEntry?.version) {
    console.error(`LOCK ENTRY MISSING ${name}`);
    ok = false;
  }
}
process.exit(ok ? 0 : 1);
