const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const expected = {
  '@expo/ui': '57.0.21',
  'expo-glass-effect': '57.0.4',
  'expo-image-picker': '57.0.20',
  'expo-linking': '57.0.11',
  'expo-router': '57.0.24',
  'expo-video': '57.0.5',
  'expo-notifications': '57.0.21',
  'expo-application': '57.0.3',
};

let ok = true;
for (const [name, version] of Object.entries(expected)) {
  const pkgPath = path.join(root, 'node_modules', ...name.split('/'), 'package.json');
  if (!fs.existsSync(pkgPath)) {
    console.error(`MISSING ${name}@${version}`);
    ok = false;
    continue;
  }
  const installed = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
  if (installed !== version) {
    console.error(`MISMATCH ${name}: installed ${installed}, expected ${version}`);
    ok = false;
  } else {
    console.log(`OK ${name}@${version}`);
  }
}
process.exit(ok ? 0 : 1);
