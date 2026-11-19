// Source-only sanity gate. This does NOT replace npm run typecheck or an APK build.
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '../../../');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const graph = read('src/app/(family)/(graph)/family-graph-admin.tsx');
assert.ok(graph.includes('const currentSnapshot = { familyId, persons: people, relationships };'));
assert.ok(graph.includes('checkGraphRelationshipCandidates(currentSnapshot, additions)'));
assert.ok(graph.includes('pickerLoadingText:'));
const errors = read('src/types/errors.ts');
for(const key of ['PERSON_HAS_CONTENT','AVATAR_SELECTION_SUPERSEDED']) assert.ok(errors.includes('"'+key+'"'));
const diagnostic = read('src/services/games/boardGamePresentationDiagnostics.ts');
assert.ok(diagnostic.includes('"chess" | "xiangqi"'));
const reactFiles = [
  'src/app/(family)/(membership)/family-gateway.tsx',
  'src/components/ui/BloomInputComponents/BloomOTPInput.tsx'
];
for (const f of reactFiles) assert.ok(read(f).includes('React.ElementRef<typeof BloomScaledInput>'));
const helper = read('src/components/ui/bloomAbsoluteFill.ts');
assert.ok(helper.includes("position: 'absolute' as const"));
const files = [];
function walk(dir) {
  for (const d of fs.readdirSync(dir, {withFileTypes: true})) {
    if(d.name === 'node_modules') continue;
    const full = path.join(dir,d.name);
    if(d.isDirectory())walk(full);
    else if(/\.(ts|tsx)$/.test(d.name))files.push(full);
  }
}
walk(path.join(root, 'src'));
for (const f of files) {
  const text = fs.readFileSync(f,'utf8');
  assert.ok(!text.includes('StyleSheet.absoluteFillObject'), `obsolete absoluteFillObject: ${f}`);
  assert.ok(!text.includes('BloomScaledInputKeyPressEventData'), `obsolete key press type: ${f}`);
}
console.log(`PASS R11R4R2R2 TypeScript stabilization source assertions; ${files.length} TS/TSX source files scanned. Full TypeScript gate still required.`);
