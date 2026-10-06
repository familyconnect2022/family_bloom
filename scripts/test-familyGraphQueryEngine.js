const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "family-bloom-query-"));

const files = [
  "src/types/errors.ts",
  "src/types/user.ts",
  "src/types/familyGraph.ts",
  "src/types/familyGraphQuery.ts",
  "src/constants/appConfiguration.ts",
  "src/services/familyGraph/familyGraphQueryEngine.ts",
  "src/services/familyGraph/familyKinshipResolver.ts",
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
  if (errors.length) {
    throw new Error(errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")).join("\n"));
  }
  fs.writeFileSync(targetPath, result.outputText);
}

const { createFamilyGraphQueryEngine } = require(path.join(
  outRoot,
  "src/services/familyGraph/familyGraphQueryEngine.js",
));
const { APP_CONFIG_DEFAULTS } = require(path.join(outRoot, "src/constants/appConfiguration.js"));
const { resolveVietnameseKinship } = require(path.join(
  outRoot,
  "src/services/familyGraph/familyKinshipResolver.js",
));

const familyId = "fam_test";
const person = (id, displayName, gender = "other", birthYear = null, birthOrder = null) => ({
  id,
  familyId,
  linkedUid: null,
  displayName,
  gender,
  nickname: null,
  birthDate: null,
  birthYear,
  birthPlace: null,
  deathDate: null,
  deathYear: null,
  lifeStatus: "unknown",
  birthOrder,
  avatarUrl: null,
  description: null,
  createdByUid: "admin",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const rel = (parentId, childId, subtype = "biological") => ({
  id: `pc_${parentId}_${childId}`,
  familyId,
  type: "parent_child",
  personAId: parentId,
  personBId: childId,
  subtype,
  partnerStatus: null,
  startDate: null,
  endDate: null,
  createdByUid: "admin",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const partner = (a, b) => {
  const [first, second] = [a, b].sort();
  return {
    id: `pt_${first}_${second}`,
    familyId,
    type: "partner",
    personAId: first,
    personBId: second,
    subtype: null,
    partnerStatus: "married",
    startDate: null,
    endDate: null,
    createdByUid: "admin",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
};

const persons = [
  person("gp1", "Ông A", "male", 1940),
  person("gp2", "Bà A", "female", 1945),
  person("father", "Cha", "male", 1970, 1),
  person("aunt", "Cô", "female", 1973, 2),
  person("mother", "Mẹ", "female", 1972),
  person("child", "Con", "male", 2000, 1),
  person("sibling", "Em", "female", 2003, 2),
  person("cousin", "Anh họ", "male", 1998),
  person("adoptive", "Con nuôi", "female", 2005),
  person("stepParent", "Cha dượng", "male", 1971),
  person("stepOnly", "Con riêng của cha dượng", "other", 2001),
];

const relationships = [
  rel("gp1", "father"),
  rel("gp2", "father"),
  rel("gp1", "aunt"),
  rel("gp2", "aunt"),
  rel("father", "child"),
  rel("mother", "child"),
  rel("father", "sibling"),
  rel("mother", "sibling"),
  rel("aunt", "cousin"),
  rel("father", "adoptive", "adoptive"),
  rel("stepParent", "child", "step"),
  rel("stepParent", "stepOnly", "biological"),
  partner("father", "mother"),
];

const engine = createFamilyGraphQueryEngine({ familyId, persons, relationships });

assert.strictEqual(APP_CONFIG_DEFAULTS.familyGraph.query.maxPeople, 80);
assert.deepStrictEqual(engine.getParents("child").map((p) => p.id), ["father", "stepParent", "mother"].sort((a,b) => {
  const pa = persons.find((p) => p.id === a);
  const pb = persons.find((p) => p.id === b);
  const ay = pa.birthYear ?? 9999;
  const by = pb.birthYear ?? 9999;
  return ay - by || pa.displayName.localeCompare(pb.displayName, "vi");
}));
assert.deepStrictEqual(engine.getPartners("father").map((p) => p.id), ["mother"]);
assert.deepStrictEqual(engine.getSiblings("child").map((p) => p.id), ["sibling", "adoptive"]);
assert.ok(!engine.getSiblings("child").some((p) => p.id === "stepOnly"), "step parent edge must not infer siblinghood");
assert.deepStrictEqual(engine.getGrandparents("child").map((p) => p.id), ["gp1", "gp2"]);
assert.deepStrictEqual(engine.getAuntsAndUncles("child").map((p) => p.id), ["aunt"]);
assert.deepStrictEqual(engine.getCousins("child").map((p) => p.id), ["cousin"]);

const ancestors = engine.getAncestorViews("child", { depth: 2, maxPeople: 3 });
assert.strictEqual(ancestors.length, 3, "maxPeople override must cap traversal");
assert.ok(ancestors.every((item) => !item.pathPersonIds.includes("stepParent")), "step edge must not enter ancestry traversal");

const siblingView = engine.getSiblingViews("child").find((item) => item.person.id === "sibling");
assert.ok(siblingView);
assert.deepStrictEqual(siblingView.sharedParentIds.sort(), ["father", "mother"]);
assert.strictEqual(siblingView.lineage, "biological");

const adoptiveView = engine.getSiblingViews("child").find((item) => item.person.id === "adoptive");
assert.ok(adoptiveView);
assert.strictEqual(adoptiveView.lineage, "mixed");

// Phase 6.3B: direction is fixed — A is what of B.
const childOfFather = engine.getRelationshipBetween("child", "father");
assert.ok(childOfFather);
assert.strictEqual(childOfFather.kind, "child");
assert.strictEqual(childOfFather.directSubtype, "biological");
const childVi = resolveVietnameseKinship(childOfFather, new Map(persons.map((p) => [p.id, p])));
assert.strictEqual(childVi.label, "con trai ruột");
assert.strictEqual(childVi.sentence, "Con là con trai ruột của Cha.");

const fatherOfChild = engine.getRelationshipBetween("father", "child");
assert.ok(fatherOfChild);
assert.strictEqual(fatherOfChild.kind, "parent");
assert.strictEqual(resolveVietnameseKinship(fatherOfChild).label, "cha ruột");

const siblingOfChild = engine.getRelationshipBetween("sibling", "child");
assert.ok(siblingOfChild);
assert.strictEqual(siblingOfChild.kind, "sibling");
assert.strictEqual(resolveVietnameseKinship(siblingOfChild).label, "em gái");

const auntOfChild = engine.getRelationshipBetween("aunt", "child");
assert.ok(auntOfChild);
assert.strictEqual(auntOfChild.kind, "aunt_uncle");
assert.strictEqual(resolveVietnameseKinship(auntOfChild, new Map(persons.map((p) => [p.id, p]))).label, "cô");

const cousinOfChild = engine.getRelationshipBetween("cousin", "child");
assert.ok(cousinOfChild);
assert.strictEqual(cousinOfChild.kind, "cousin");
assert.strictEqual(resolveVietnameseKinship(cousinOfChild).label, "anh họ");

const stepParentOfChild = engine.getRelationshipBetween("stepParent", "child");
assert.ok(stepParentOfChild);
assert.strictEqual(stepParentOfChild.kind, "parent");
assert.strictEqual(stepParentOfChild.lineage, "unknown");
assert.strictEqual(resolveVietnameseKinship(stepParentOfChild).label, "cha dượng");

// Step edges are not allowed to fabricate inferred blood ancestry.
const stepOnlyVsChild = engine.getRelationshipBetween("stepOnly", "child");
assert.ok(stepOnlyVsChild);
assert.strictEqual(stepOnlyVsChild.kind, "unrelated");

// Phase 6.3D: bounded focus snapshot is derived only and respects centralized maxPeople.
const focusSubgraph = engine.getFocusSubgraph("child", {
  ancestorDepth: 2,
  descendantDepth: 2,
  includePartners: true,
  includeSiblings: true,
  includeCousins: false,
  maxPeople: 5,
});
assert.ok(focusSubgraph);
assert.ok(focusSubgraph.personIds.includes("child"));
assert.ok(focusSubgraph.personIds.length <= 5);
assert.strictEqual(focusSubgraph.requestedMaxPeople, 5);
assert.ok(focusSubgraph.snapshot.relationships.every((r) =>
  focusSubgraph.personIds.includes(r.personAId) && focusSubgraph.personIds.includes(r.personBId)
));

assert.deepStrictEqual(engine.getDiagnostics(), {
  personCount: persons.length,
  relationshipCount: relationships.length,
  indexedRelationshipCount: relationships.length,
  skippedRelationshipIds: [],
});

console.log("Family Graph Query + Kinship + Focus Subgraph tests: PASS");
