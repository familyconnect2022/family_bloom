#!/usr/bin/env node
'use strict';
// Test-only TypeScript loader; does not modify runtime or production imports.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const root = path.resolve(__dirname, '../../..');
const ts = require(path.join(root, 'scripts/vendor/typescript/lib/typescript.js'));
Module._extensions['.ts'] = (module, filename) => module._compile(
  ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText,
  filename,
);
const { APP_CONFIG_DEFAULTS } = require(path.join(root, 'src/constants/appConfiguration.ts'));
const { adaptFamilyGraphSnapshot } = require(path.join(root, 'src/components/familyGraph/familyGraphLiveAdapter.ts'));
const { FAMILY_GRAPH_CANVAS } = require(path.join(root, 'src/components/familyGraph/familyGraphPrototypeData.ts'));
const cfg = APP_CONFIG_DEFAULTS.familyGraph.layout;
assert.ok(cfg.generationStep >= FAMILY_GRAPH_CANVAS.nodeHeight + 76, 'R5: vertical 3D ornament safety gap');
assert.ok(cfg.partnerGap >= 32, 'R5: partner card ornaments have horizontal space');
assert.ok(cfg.siblingUnitGap >= 48, 'R5: sibling groups are separated');
assert.ok(cfg.familyUnitGap >= 90, 'R5: distinct family groups remain separated');
const genders = ['male', 'female', 'other'];
const people = genders.map((gender, i) => ({id: `p${i}`, familyId: 'test', displayName: `Person ${i}`, gender, lifeStatus: 'living'}));
const relationships = [
  {id: 'partners', personAId: 'p0', personBId: 'p1', type: 'partner', partnerStatus:'married'},
  {id: 'child', personAId: 'p0', personBId: 'p2', type: 'parent_child', subtype:'biological'},
];
const result = adaptFamilyGraphSnapshot({persons: people, relationships});
assert.equal(result.people.length, 3);
assert.deepEqual(result.people.map(person => person.gender), ['male','female','unknown'], 'Gender mapping from Firebase data must be preserved');
const a = result.people.find(p => p.id === 'p0');
const b = result.people.find(p => p.id === 'p1');
const child = result.people.find(p => p.id === 'p2');
assert.ok(Math.abs(a.x - b.x) >= FAMILY_GRAPH_CANVAS.nodeWidth + cfg.partnerGap, 'Partner spacing');
assert.equal(child.y - a.y, cfg.generationStep, 'Generation spacing');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
for (const rel of [
  'src/app/(family)/(graph)/family-graph-admin.tsx',
  'src/app/(family)/(graph)/family-graph-person-editor.tsx',
]) {
  const data = read(rel);
  assert.ok(data.includes('gender: "other",'), `New Person must default to unspecified: ${rel}`);
  assert.ok(data.includes('other: "Chưa xác định"'), `Unknown gender should be explicit: ${rel}`);
}
const node = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
assert.ok(node.includes('familyGraphNodeGender(person.gender)'), 'Render variant must follow stored gender through shared R6 helper');
const nodeArt = read('src/components/familyGraph/familyGraphNode3dAssets.ts');
assert.ok(nodeArt.includes('gender === "male" ? "male" : gender === "female" ? "female" : "unknown"'), 'Gender-to-frame mapping remains exact');
console.log('PASS Node R5: 3 gender variants, unspecified create defaults, partner/sibling/family/generation spacing.');
