#!/usr/bin/env node
'use strict';
/** Generation numbers are UI projections of the current graph topology, not Firebase fields. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../..');
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'family-bloom-gen-r7-'));
try {
  for (const rel of [
    'src/constants/appConfiguration.ts',
    'src/components/familyGraph/familyGraphPrototypeData.ts',
    'src/components/familyGraph/familyGraphWebSubtreeLayout.ts',
    'src/components/familyGraph/familyGraphLiveAdapter.ts',
  ]) {
    const file = path.join(root, rel);
    const result = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      fileName: file,
      reportDiagnostics: true,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    });
    const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
    assert.equal(errors.length, 0, `TypeScript errors in ${rel}`);
    const output = path.join(out, rel.replace(/\.ts$/, '.js'));
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, result.outputText);
  }
  const { adaptFamilyGraphSnapshot, getFamilyGraphGenerationY } = require(path.join(out, 'src/components/familyGraph/familyGraphLiveAdapter.js'));
  const { FAMILY_GRAPH_CANVAS } = require(path.join(out, 'src/components/familyGraph/familyGraphPrototypeData.js'));
  const familyId = 'r7-test';
  const p = (id, gender = 'other') => ({ id, familyId, displayName: id, gender, linkedUid: null,
    nickname: null, birthDate: null, birthYear: null, birthPlace: null, deathDate: null,
    deathYear: null, lifeStatus: 'living', birthOrder: null, avatarUrl: null,
    description: null, createdByUid: 'admin', createdAt: '2026-01-01', updatedAt: '2026-01-01' });
  const parent = (a, b) => ({ id: `p-${a}-${b}`, familyId, type: 'parent_child', personAId: a, personBId: b, subtype: 'biological' });
  const partner = (a, b) => ({ id: `s-${a}-${b}`, familyId, type: 'partner', personAId: a, personBId: b, partnerStatus: 'married' });
  const ppl = [p('Lan', 'female'), p('Don', 'male'), p('Bich', 'female'), p('Nhan', 'male'), p('Minh', 'male')];
  const rel = [partner('Lan','Don'), parent('Lan','Bich'), parent('Don','Bich'), parent('Bich','Nhan'), parent('Nhan','Minh')];
  const snapshot = (persons, relationships) => ({ familyId, persons, relationships });
  const generations = (persons, relationships, focusId = 'Minh', focusMode = false) => {
    const result = adaptFamilyGraphSnapshot(snapshot(persons, relationships), focusId,
      focusMode ? { preserveGenerationHierarchy: true } : undefined);
    return { data: result, byId: new Map(result.people.map(x => [x.id, x.generation])) };
  };
  let tests = 0;
  const eq = (actual, expected, message) => { assert.equal(actual, expected, message); tests++; };
  const base = generations(ppl, rel);
  eq(base.byId.get('Don'), 1, 'Đôn must be first known generation');
  eq(base.byId.get('Lan'), 1, 'spouse Lan must share generation 1');
  eq(base.byId.get('Bich'), 2, 'their daughter is generation 2');
  eq(base.byId.get('Nhan'), 3, 'grandchild is generation 3');
  eq(base.byId.get('Minh'), 4, 'great-grandchild is generation 4');
  // Generation labeling must NOT depend on the Person selected to center camera.
  for (const id of ['Don', 'Lan', 'Bich', 'Nhan', 'Minh']) {
    const view = generations(ppl.slice().reverse(), rel.slice().reverse(), id);
    for (const [personId, number] of base.byId) eq(view.byId.get(personId), number, `focus ${id}: ${personId} must be stable`);
  }
  const addedPeople = [...ppl, p('TopMother', 'female'), p('TopFather', 'male')];
  const addedEdges = [...rel, partner('TopMother','TopFather'), parent('TopMother','Don'), parent('TopFather','Don')];
  const expanded = generations(addedPeople, addedEdges);
  eq(expanded.byId.get('TopMother'), 1, 'new oldest ancestor becomes generation 1');
  eq(expanded.byId.get('TopFather'), 1, 'oldest couple stays aligned');
  eq(expanded.byId.get('Don'), 2, 'former root shifts from 1 to 2');
  eq(expanded.byId.get('Lan'), 2, 'oldest spouse shifts to generation 2');
  eq(expanded.byId.get('Bich'), 3, 'all descendants shift after adding parent');
  eq(expanded.byId.get('Nhan'), 4, 'descendants shift accurately');
  eq(expanded.byId.get('Minh'), 5, 'descendants shift accurately');
  const focused = generations(addedPeople, addedEdges, 'Minh', true);
  for (const [id, g] of expanded.byId) eq(focused.byId.get(id), g, `Focus and main tree agree on ${id}`);
  const restored = generations(ppl, rel);
  eq(restored.byId.get('Don'), 1, 'removing upper relation restores generation 1');
  eq(restored.byId.get('Minh'), 4, 'descendants restore their original number');
  // More than five generations must never be clamped to 5.
  let deepPpl = addedPeople, deepRel = addedEdges;
  for (let n = 0; n < 4; n++) {
    deepPpl = [...deepPpl, p(`Older${n}`)];
    deepRel = [...deepRel, parent(`Older${n}`, n ? `Older${n - 1}` : 'TopMother')];
  }
  const deep = generations(deepPpl, deepRel, 'Minh');
  eq(deep.byId.get('Older3'), 1, 'deepest ancestor is generation 1');
  eq(deep.byId.get('Minh'), 9, 'nine generations are not truncated to five');
  eq(deep.data.canvasHeight >= getFamilyGraphGenerationY(9) + FAMILY_GRAPH_CANVAS.nodeHeight, true, 'canvas grows for deep ancestry');
  // Disconnected components have no relationship that would justify assigning
  // one branch as older than the other; each branch begins at 1.
  const separated = generations([...ppl, p('OtherA'), p('OtherB')], [...rel, parent('OtherA','OtherB')]);
  eq(separated.byId.get('OtherA'), 1, 'separate root starts at 1');
  eq(separated.byId.get('OtherB'), 2, 'separate child starts at 2');
  eq(separated.byId.get('Don'), 1, 'unrelated branch does not shift original family');
  // Unassigned Person remains off canvas as before.
  const unassigned = generations([...ppl, p('Unlinked')], rel);
  eq(unassigned.byId.has('Unlinked'), false, 'unlinked people still do not float on graph');
  console.log(`PASS NODE R7 DYNAMIC GENERATIONS: ${tests} assertions`);
} finally {
  fs.rmSync(out, { recursive: true, force: true });
}
