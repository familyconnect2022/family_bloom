/** Regression gate for R11R4R2R3 on R2 TypeScript Stabilization R1.
 * Source-only assertions. This is NOT a replacement for npm run typecheck or an APK build.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const graph = read('src/app/(family)/(graph)/family-graph.tsx');
const prototype = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const sheet = read('src/components/familyGraph/FamilyGraphPersonSheet.tsx');
const focus = read('src/components/familyGraph/FamilyGraphFocusView.tsx');
const mutation = read('src/services/familyGraph/familyGraphMutationService.ts');
const source = read('src/components/ui/bloomAbsoluteFill.ts');
const detail = read('src/app/(family)/(graph)/family-graph-relationship-detail.tsx');
for (const [name, file] of [['graph', graph], ['prototype', prototype], ['person sheet', sheet]]) {
  assert.match(file, /onEditRelationship/, `${name} must offer relationship editing`);
}
assert.doesNotMatch(graph, /<StatusBar\s+translucent\b/, 'preserve Expo 57 StatusBar fix');
for (const [name, file] of [['prototype', prototype], ['person sheet', sheet]]) {
  assert.match(file, /import\s+\{\s*BLOOM_ABSOLUTE_FILL\s*\}/, `${name} lost absolute-fill type fix`);
  assert.match(file, /\.\.\.BLOOM_ABSOLUTE_FILL/, `${name} must use plain absolute-fill style`);
  assert.doesNotMatch(file, /StyleSheet\.absoluteFillObject/, `${name} reintroduced invalid RN type`);
}
assert.match(prototype, /<View pointerEvents="none" style=\{__a3_styles\.focusMistOuter\}>/, 'preserve fixed focus node mist');
assert.match(source, /position:\s*'absolute'/);
assert.match(prototype, /FamilyGraphUnionLines/);
assert.match(prototype, /FamilyGraphPrivateChildLabel/);
assert.match(focus, /FamilyGraphUnionLines/);
assert.match(focus, /FamilyGraphPrivateChildLabel/);
assert.match(detail, /updateFamilyGraphParentChildSubtypeDirect/);
assert.match(mutation, /concurrentMarriageConflict/);
assert.match(read('src/components/familyGraph/familyGraphGeometry.ts'), /privateChildren/);
assert.match(read('src/services/familyGraph/familyGraphQueryEngine.ts'), /getFocusBranchSubgraph/);
const app = JSON.parse(read('app.json'));
const pkg = JSON.parse(read('package.json'));
assert.equal(app.expo.android.package, 'com.familybloom.android');
assert.equal(app.expo.android.versionCode, 143045, 'retain baseline native build gate');
assert.equal(pkg.version, '1.3.35');
assert.ok(fs.existsSync(path.join(root, 'firestore.rules')), 'canonical rules must remain present');
console.log('[PASS] Stabilized Android + Web GRAPH-LINE-01 source integration: statusbar, absolute-fill, person-sheet, focus, edit route, geometry, identity');
