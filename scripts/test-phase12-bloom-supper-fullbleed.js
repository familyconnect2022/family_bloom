const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });

const hero = read('src/components/ui/BloomHeroHeader.tsx');
add('BloomHeroHeader separates full-bleed artwork from padded content', hero.includes('StyleSheet.absoluteFill') && hero.includes('styles.inner'));
add('BloomHeroHeader root no longer owns horizontal padding', !/root:\s*\{[^}]*paddingHorizontal/s.test(hero));
add('BloomHeroHeader keeps readable inner horizontal padding', /inner:\s*\{[^}]*paddingHorizontal:\s*22/s.test(hero));
add('Bloom Supper artwork extends beyond the right edge instead of sitting in a card slot', /illustrationWrap:[\s\S]*right:\s*-24/.test(hero));

for (const file of ['src/app/(tabs)/moments.tsx','src/app/(tabs)/planner.tsx','src/app/(tabs)/play.tsx']) {
  const src = read(file);
  add(`${path.basename(file)} uses true horizontal edge-to-edge container`, src.includes('edgeToEdgeTop edgeToEdgeHorizontal'));
  add(`${path.basename(file)} has no negative-margin hero bleed shim`, !src.includes('heroBleed'));
}

const allAppFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs);
    else if (/\.tsx?$/.test(entry.name)) allAppFiles.push(abs);
  }
}
walk(path.join(root, 'src/app'));
const missingHorizontal = allAppFiles.filter((abs) => {
  const src = fs.readFileSync(abs, 'utf8');
  return src.includes('<ScreenContainer edgeToEdgeTop') && !src.includes('edgeToEdgeTop edgeToEdgeHorizontal');
});
add('All top-edge Bloom screens also opt into true left/right edge-to-edge layout', missingHorizontal.length === 0);

let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? 'PASS' : 'FAIL'} | ${c.name}`);
  if (!c.ok) failed++;
}
console.log(`\nPhase 12 Bloom Supper full-bleed contract ${failed ? 'FAIL' : 'PASS'}: ${checks.length - failed}/${checks.length}`);
if (failed) process.exit(1);
