const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const lab = read('src/app/performance-data-test.tsx');
assert(lab.includes('const STRESS_MEDIA_SOURCES = ['), 'Stress screen must own stable bundled media sources');
assert(lab.includes('require("../../assets/images/login-family-icon.png")'), 'Stress screen must use bundled local media');
assert(lab.includes('source={stressMediaSourceAt(index)}'), 'Timeline stress media must use local bundled source');
assert(lab.includes('source={stressMediaSourceAt(Number(item.id.split("-").pop()) || 0)}'), 'Memory Book stress media must use local bundled source');
assert(!lab.includes('syntheticMediaUriFor,'), 'Stress screen must not depend on the named syntheticMediaUriFor import at runtime');
assert(!lab.includes('uri: syntheticMediaUriFor('), 'Stress rows must not call imported media URI helper while rendering');

for (const rel of [
  'assets/images/login-family-icon.png',
  'assets/images/icon.png',
  'assets/images/tutorial-web.png',
  'assets/images/logo-glow.png',
]) {
  assert(fs.existsSync(path.join(root, rel)), `Missing bundled stress media asset: ${rel}`);
}

console.log('Phase 10 stress media runtime hotfix contracts PASS');
