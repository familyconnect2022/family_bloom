const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const expected = String(process.argv[2] || '').trim();
if (!expected) {
  console.error('[android-package-check] Expected package argument is required.');
  process.exit(2);
}
const gradlePath = path.join(root, 'android', 'app', 'build.gradle');
if (!fs.existsSync(gradlePath)) {
  console.error(`[android-package-check] Missing ${gradlePath}`);
  process.exit(1);
}
const gradle = fs.readFileSync(gradlePath, 'utf8');
const match = gradle.match(/applicationId\s+["']([^"']+)["']/);
const actual = match?.[1] || '';
if (actual !== expected) {
  console.error(`[android-package-check] WRONG applicationId. Expected ${expected}, got ${actual || '(not found)'}.`);
  console.error('[android-package-check] Stop now: generated native applicationId does not match the single Family Bloom Android identity.');
  process.exit(1);
}
console.log(`[android-package-check] PASS applicationId=${actual}`);
