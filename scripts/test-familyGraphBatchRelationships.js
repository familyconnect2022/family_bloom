const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "family-bloom-dg11-"));

for (const relativePath of [
  "src/types/errors.ts",
  "src/utils/familyGraph.ts",
]) {
  const sourcePath = path.join(root, relativePath);
  const targetPath = path.join(outRoot, relativePath.replace(/\.ts$/, ".js"));
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const result = ts.transpileModule(fs.readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: sourcePath,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) throw new Error(errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")).join("\n"));
  fs.writeFileSync(targetPath, result.outputText);
}

const {
  getParentChildRelationshipId,
  planParentChildRelationshipBatch,
} = require(path.join(outRoot, "src/utils/familyGraph.js"));

const rel = (parentId, childId, subtype = "biological") => ({
  id: getParentChildRelationshipId(parentId, childId),
  familyId: "fam",
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

// DG-11 canonical example: 3 selected children × 2 reference parents = 6 explicit edges.
const children = ["thanh_nhan", "kim_duyen", "phuoc_hoi"];
const parents = ["van_long", "thi_bich"];
const plan = planParentChildRelationshipBatch(parents, children, "biological", []);
assert.strictEqual(plan.requestedCount, 6);
assert.strictEqual(plan.newEdges.length, 6);
assert.strictEqual(plan.existingRelationshipIds.length, 0);
for (const parentId of parents) {
  for (const childId of children) {
    assert.ok(plan.newEdges.some((edge) => edge.parentId === parentId && edge.childId === childId));
  }
}

// No inferred relationship may be added to a spouse/other Person not explicitly selected.
assert.ok(!plan.newEdges.some((edge) => edge.parentId === "unselected_spouse" || edge.childId === "unselected_child"));

// Exact duplicates are idempotent and are reported rather than written again.
const duplicatePlan = planParentChildRelationshipBatch(
  parents,
  children,
  "biological",
  [rel("van_long", "thanh_nhan")],
);
assert.strictEqual(duplicatePlan.requestedCount, 6);
assert.strictEqual(duplicatePlan.newEdges.length, 5);
assert.deepStrictEqual(duplicatePlan.existingRelationshipIds, [getParentChildRelationshipId("van_long", "thanh_nhan")]);

// Same canonical edge with another subtype is a conflict, never silently rewritten.
assert.throws(
  () => planParentChildRelationshipBatch(["van_long"], ["thanh_nhan"], "biological", [rel("van_long", "thanh_nhan", "adoptive")]),
  (error) => error && error.code === "RELATIONSHIP_DUPLICATE",
);

// Existing ancestry cycle makes the whole plan invalid.
assert.throws(
  () => planParentChildRelationshipBatch(["a"], ["b"], "biological", [rel("b", "a")]),
  (error) => error && error.code === "RELATIONSHIP_PARENT_CYCLE",
);

// Self-reference is invalid.
assert.throws(
  () => planParentChildRelationshipBatch(["a"], ["a"], "biological", []),
  (error) => error && error.code === "RELATIONSHIP_SELF_REFERENCE",
);

console.log("DG-11 Batch Relationship Composer tests: PASS");
