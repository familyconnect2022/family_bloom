const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "family-bloom-63-bench-"));

const files = [
  "src/types/errors.ts",
  "src/types/user.ts",
  "src/types/familyGraph.ts",
  "src/types/familyGraphQuery.ts",
  "src/constants/appConfiguration.ts",
  "src/services/familyGraph/familyGraphQueryEngine.ts",
  "src/services/familyGraph/familyKinshipResolver.ts",
  "src/components/familyGraph/familyGraphPrototypeData.ts",
  "src/components/familyGraph/familyGraphLiveAdapter.ts",
];

for (const relativePath of files) {
  const sourcePath = path.join(root, relativePath);
  const targetPath = path.join(outRoot, relativePath.replace(/\.ts$/, ".js"));
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const source = fs.readFileSync(sourcePath, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      strict: true,
    },
    fileName: sourcePath,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) throw new Error(errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")).join("\n"));
  fs.writeFileSync(targetPath, result.outputText);
}

const { createFamilyGraphQueryEngine } = require(path.join(outRoot, "src/services/familyGraph/familyGraphQueryEngine.js"));
const { resolveVietnameseKinship } = require(path.join(outRoot, "src/services/familyGraph/familyKinshipResolver.js"));
const { adaptFamilyGraphSnapshot } = require(path.join(outRoot, "src/components/familyGraph/familyGraphLiveAdapter.js"));
const { APP_CONFIG_DEFAULTS } = require(path.join(outRoot, "src/constants/appConfiguration.js"));

const iso = "2026-01-01T00:00:00.000Z";
const buildGraph = (count) => {
  const familyId = `bench_${count}`;
  const persons = Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    familyId,
    linkedUid: i === 0 ? "user0" : null,
    displayName: `Người ${i}`,
    gender: i % 2 === 0 ? "male" : "female",
    nickname: null,
    birthDate: null,
    birthYear: 1940 + (i % 70),
    birthPlace: null,
    deathDate: null,
    deathYear: null,
    lifeStatus: "unknown",
    birthOrder: (i % 5) + 1,
    avatarUrl: null,
    description: null,
    createdByUid: "admin",
    createdAt: iso,
    updatedAt: iso,
  }));
  const relationships = [];
  for (let i = 1; i < count; i += 1) {
    const parent = Math.floor((i - 1) / 2);
    relationships.push({
      id: `pc_p${parent}_p${i}`,
      familyId,
      type: "parent_child",
      personAId: `p${parent}`,
      personBId: `p${i}`,
      subtype: "biological",
      partnerStatus: null,
      startDate: null,
      endDate: null,
      createdByUid: "admin",
      createdAt: iso,
      updatedAt: iso,
    });
  }
  return { familyId, persons, relationships };
};

const ms = (start) => Number(process.hrtime.bigint() - start) / 1e6;
const results = [];
for (const size of [50, 100, 300, 500]) {
  const snapshot = buildGraph(size);
  let t = process.hrtime.bigint();
  const engine = createFamilyGraphQueryEngine(snapshot);
  const buildMs = ms(t);

  const focusId = `p${Math.min(size - 1, Math.floor(size / 3))}`;
  t = process.hrtime.bigint();
  const subgraph = engine.getFocusSubgraph(focusId);
  const subgraphMs = ms(t);
  assert.ok(subgraph);
  assert.ok(subgraph.personIds.length <= APP_CONFIG_DEFAULTS.familyGraph.focusSubgraph.maxPeople);

  const targetId = snapshot.relationships.find((r) => r.personBId === focusId)?.personAId || "p0";
  t = process.hrtime.bigint();
  const relationship = engine.getRelationshipBetween(focusId, targetId);
  const relationshipMs = ms(t);
  assert.ok(relationship && relationship.kind !== "unrelated");
  const vi = resolveVietnameseKinship(relationship, new Map(snapshot.persons.map((p) => [p.id, p])));
  assert.ok(vi.label.length > 0);

  t = process.hrtime.bigint();
  const visual = adaptFamilyGraphSnapshot(snapshot, focusId);
  const adapterMs = ms(t);
  assert.strictEqual(visual.people.length, size);

  results.push({ size, buildMs, subgraphMs, relationshipMs, adapterMs, subgraphPeople: subgraph.personIds.length });
}

console.log("Family Graph Phase 6.3 synthetic benchmark: PASS");
for (const row of results) {
  console.log(
    `${row.size} persons | engine ${row.buildMs.toFixed(2)}ms | subgraph ${row.subgraphMs.toFixed(2)}ms | relationship ${row.relationshipMs.toFixed(2)}ms | adapter ${row.adapterMs.toFixed(2)}ms | subgraph people ${row.subgraphPeople}`,
  );
}
