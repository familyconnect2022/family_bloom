const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "family-bloom-p2_11-"));
let pass = 0;
let fail = 0;
const check = (name, condition) => {
  if (condition) {
    pass += 1;
    console.log(`PASS ${String(pass + fail).padStart(2, "0")} - ${name}`);
  } else {
    fail += 1;
    console.error(`FAIL ${String(pass + fail).padStart(2, "0")} - ${name}`);
  }
};

console.log("\nP2.11 — Family Graph Topology + Retained Camera\n");

const runtimeFiles = [
  "src/types/errors.ts",
  "src/types/user.ts",
  "src/types/familyGraph.ts",
  "src/types/familyGraphQuery.ts",
  "src/constants/appConfiguration.ts",
  "src/services/familyGraph/familyGraphQueryEngine.ts",
  "src/components/familyGraph/familyGraphPrototypeData.ts",
  "src/components/familyGraph/familyGraphLiveAdapter.ts",
  "src/components/familyGraph/familyGraphViewport.ts",
];

for (const relativePath of runtimeFiles) {
  const sourcePath = path.join(root, relativePath);
  const targetPath = path.join(outRoot, relativePath.replace(/\.ts$/, ".js"));
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const result = ts.transpileModule(fs.readFileSync(sourcePath, "utf8"), {
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
const { adaptFamilyGraphSnapshot } = require(path.join(outRoot, "src/components/familyGraph/familyGraphLiveAdapter.js"));
const {
  getFamilyGraphCameraSnapshotFromTransform,
  getFamilyGraphPanForAnchor,
  mapFamilyGraphCanvasPointToViewport,
  mapFamilyGraphViewportPointToCanvas,
  mergeRetainedFamilyGraphPersonIds,
} = require(path.join(outRoot, "src/components/familyGraph/familyGraphViewport.js"));

const familyId = "fam_p2_11";
const person = (id, displayName, gender = "other", birthYear = null) => ({
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
  lifeStatus: "living",
  birthOrder: null,
  avatarUrl: null,
  description: null,
  createdByUid: "admin",
  createdAt: "2026-10-11T00:00:00.000Z",
  updatedAt: "2026-10-11T00:00:00.000Z",
});
const pc = (a, b) => ({
  id: `pc_${a}_${b}`,
  familyId,
  type: "parent_child",
  personAId: a,
  personBId: b,
  subtype: "biological",
  partnerStatus: null,
  startDate: null,
  endDate: null,
  createdByUid: "admin",
  createdAt: "2026-10-11T00:00:00.000Z",
  updatedAt: "2026-10-11T00:00:00.000Z",
});
const pt = (a, b) => {
  const [x, y] = [a, b].sort();
  return {
    id: `pt_${x}_${y}`,
    familyId,
    type: "partner",
    personAId: x,
    personBId: y,
    subtype: null,
    partnerStatus: "married",
    startDate: null,
    endDate: null,
    createdByUid: "admin",
    createdAt: "2026-10-11T00:00:00.000Z",
    updatedAt: "2026-10-11T00:00:00.000Z",
  };
};

const persons = [
  person("lanFather", "Nguyễn Văn Lâm", "male", 1902),
  person("lanMother", "Trần Thị Mai", "female", 1906),
  person("lan", "Nguyễn Thị Lan", "female", 1930),
  person("lanSibling", "Nguyễn Văn Lân", "male", 1934),
  person("lanSiblingPartner", "Phạm Thị Hạnh", "female", 1937),
  person("lanSiblingChild", "Nguyễn Văn Nhánh Lan", "male", 1962),

  person("donFather", "Nguyễn Vũ Khang", "male", 1901),
  person("donMother", "Lê Thị Nguyệt", "female", 1905),
  person("don", "Nguyễn Vũ Đôn", "male", 1932),
  person("donSibling", "Nguyễn Vũ Đông", "male", 1935),
  person("donSiblingChild", "Nguyễn Vũ Nhánh Đôn", "female", 1964),

  person("lien", "Nguyễn Thị Liên", "female", 1956),
  person("bich", "Nguyễn Thị Bích", "female", 1960),
  person("long", "Huỳnh Văn Long", "male", 1952),
  person("nhan", "Huỳnh Thanh Nhân", "male", 1988),
  person("hong", "Nguyễn Thị Kim Hồng", "female", 1991),
  person("gia1", "Huỳnh Nguyễn Gia Minh", "male", 2016),
  person("gia2", "Huỳnh Nguyễn Minh Anh", "female", 2038),
  person("gia3", "Huỳnh Nguyễn An Nhiên", "female", 2060),
  person("gia4", "Huỳnh Nguyễn Bình An", "male", 2082),
  person("gia5", "Huỳnh Nguyễn Tường Vi", "female", 2104),
];

const relationships = [
  pt("lanFather", "lanMother"),
  pc("lanFather", "lan"), pc("lanMother", "lan"),
  pc("lanFather", "lanSibling"), pc("lanMother", "lanSibling"),
  pt("lanSibling", "lanSiblingPartner"),
  pc("lanSibling", "lanSiblingChild"), pc("lanSiblingPartner", "lanSiblingChild"),

  pt("donFather", "donMother"),
  pc("donFather", "don"), pc("donMother", "don"),
  pc("donFather", "donSibling"), pc("donMother", "donSibling"),
  pc("donSibling", "donSiblingChild"),

  pt("lan", "don"),
  pc("lan", "lien"), pc("don", "lien"),
  pc("lan", "bich"), pc("don", "bich"),
  pt("bich", "long"),
  pc("bich", "nhan"), pc("long", "nhan"),
  pt("nhan", "hong"),
  pc("nhan", "gia1"), pc("hong", "gia1"),
  pc("gia1", "gia2"),
  pc("gia2", "gia3"),
  pc("gia3", "gia4"),
  pc("gia4", "gia5"),
];

const snapshot = { familyId, persons, relationships };
const engine = createFamilyGraphQueryEngine(snapshot);
const buildBranch = (focusId) => {
  const subgraph = engine.getFocusBranchSubgraph(focusId, {
    descendantDepth: persons.length,
    includeDescendantPartners: true,
    maxPeople: persons.length,
  });
  assert.ok(subgraph, `missing branch for ${focusId}`);
  return {
    subgraph,
    visual: adaptFamilyGraphSnapshot(subgraph.snapshot, focusId, { preserveGenerationHierarchy: true }),
  };
};

// Topology 1: Nguyễn Thị Lan. Only her two direct parents are upper context.
const lanBranch = buildBranch("lan");
const lanIds = new Set(lanBranch.subgraph.personIds);
check("Lan keeps exactly her two direct ancestors as upper context", lanIds.has("lanFather") && lanIds.has("lanMother"));
check("Lan does not reopen the ancestor sibling branch", !lanIds.has("lanSibling") && !lanIds.has("lanSiblingPartner") && !lanIds.has("lanSiblingChild"));
check("Lan keeps partner and real descendants", ["don", "bich", "long", "nhan", "hong", "gia1"].every((id) => lanIds.has(id)));
check("Lan Focus does not pull Đôn's parents sideways", !lanIds.has("donFather") && !lanIds.has("donMother"));
const lanById = new Map(lanBranch.visual.people.map((p) => [p.id, p]));
check("Lan local generation starts at ancestor row 1", lanById.get("lanFather")?.generation === 1 && lanById.get("lanMother")?.generation === 1);
check("Lan + Đôn share local generation 2", lanById.get("lan")?.generation === 2 && lanById.get("don")?.generation === 2);
check("Lan branch preserves every descendant generation without clamp", lanById.get("gia5")?.generation === 9);

// Topology 2: Nguyễn Vũ Đôn. Symmetric rule; Lan ancestors do not leak in.
const donBranch = buildBranch("don");
const donIds = new Set(donBranch.subgraph.personIds);
check("Đôn keeps exactly his two direct ancestors as upper context", donIds.has("donFather") && donIds.has("donMother"));
check("Đôn does not reopen the ancestor sibling branch", !donIds.has("donSibling") && !donIds.has("donSiblingChild"));
check("Đôn keeps Lan and shared descendants", ["lan", "bich", "long", "nhan", "hong", "gia1"].every((id) => donIds.has(id)));
check("Đôn Focus does not pull Lan's parents sideways", !donIds.has("lanFather") && !donIds.has("lanMother"));
const donById = new Map(donBranch.visual.people.map((p) => [p.id, p]));
check("Đôn ancestors are row 1 and selected couple is row 2", donById.get("donFather")?.generation === 1 && donById.get("donMother")?.generation === 1 && donById.get("don")?.generation === 2 && donById.get("lan")?.generation === 2);

// Topology 3 control: Nguyễn Thị Bích was already visually correct.
const bichBranch = buildBranch("bich");
const bichIds = new Set(bichBranch.subgraph.personIds);
check("Bích control keeps Lan + Đôn as the only upper context", bichIds.has("lan") && bichIds.has("don") && !bichIds.has("lanFather") && !bichIds.has("donFather"));
check("Bích control remains directional and excludes sibling Liên", !bichIds.has("lien"));
check("Bích control keeps Long + descendants", ["long", "nhan", "hong", "gia1", "gia5"].every((id) => bichIds.has(id)));
const bichById = new Map(bichBranch.visual.people.map((p) => [p.id, p]));
check("Bích control topology remains 1/2/3 across parent-couple/selected-couple/child-couple", bichById.get("lan")?.generation === 1 && bichById.get("don")?.generation === 1 && bichById.get("bich")?.generation === 2 && bichById.get("long")?.generation === 2 && bichById.get("nhan")?.generation === 3 && bichById.get("hong")?.generation === 3);

// Camera/layout coordinate map: anchor a real layout point at 42% viewport height.
const viewport = { width: 390, height: 700 };
const selected = bichById.get("bich");
const selectedCenter = { x: selected.x + 64, y: selected.y + 62 };
const scale = 0.95;
const pan = getFamilyGraphPanForAnchor({
  canvasPoint: selectedCenter,
  viewportPoint: { x: viewport.width / 2, y: viewport.height * 0.42 },
  scale,
  canvasWidth: bichBranch.visual.canvasWidth,
  canvasHeight: bichBranch.visual.canvasHeight,
});
const mapped = mapFamilyGraphCanvasPointToViewport({
  point: selectedCenter,
  transform: { translateX: pan.x, translateY: pan.y, scale },
  canvasWidth: bichBranch.visual.canvasWidth,
  canvasHeight: bichBranch.visual.canvasHeight,
});
check("Camera and layout use the same coordinate map for the Focus anchor", Math.abs(mapped.x - viewport.width / 2) < 0.001 && Math.abs(mapped.y - viewport.height * 0.42) < 0.001);
const inverse = mapFamilyGraphViewportPointToCanvas({
  point: mapped,
  transform: { translateX: pan.x, translateY: pan.y, scale },
  canvasWidth: bichBranch.visual.canvasWidth,
  canvasHeight: bichBranch.visual.canvasHeight,
});
check("Coordinate map round-trips without drift", Math.abs(inverse.x - selectedCenter.x) < 0.001 && Math.abs(inverse.y - selectedCenter.y) < 0.001);
const camera = getFamilyGraphCameraSnapshotFromTransform({
  transform: { translateX: pan.x, translateY: pan.y, scale },
  viewport,
  canvasWidth: bichBranch.visual.canvasWidth,
  canvasHeight: bichBranch.visual.canvasHeight,
});
check("Camera snapshot preserves the requested 95% Focus zoom", Math.abs(camera.scale - 0.95) < 0.0001);

// Progressive retained rendering: visited nodes only accumulate.
let retained = mergeRetainedFamilyGraphPersonIds(new Set(["bich"]), new Set(["long", "nhan"]));
retained = mergeRetainedFamilyGraphPersonIds(retained, new Set(["gia1"]));
check("Retained rendering keeps every previously visited Person mounted", ["bich", "long", "nhan", "gia1"].every((id) => retained.has(id)) && retained.size === 4);

const graphSource = fs.readFileSync(path.join(root, "src/components/familyGraph/FamilyGraphPrototype.tsx"), "utf8");
const screenSource = fs.readFileSync(path.join(root, "src/app/(family)/(graph)/family-graph.tsx"), "utf8");
const cleanSource = fs.readFileSync(path.join(root, "Family_Bloom_CLEAN_APPLY_FULL.bat"), "utf8");
const debugBat = fs.readFileSync(path.join(root, "scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat"), "utf8");
const releaseBat = fs.readFileSync(path.join(root, "scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat"), "utf8");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

const sceneBuilderSource = fs.readFileSync(path.join(root, "src/components/familyGraph/familyGraphSceneBuilder.ts"), "utf8");
check("Focus screen uses the interruptible single scene builder boundary", screenSource.includes('buildFamilyGraphRenderSceneInterruptible(') && sceneBuilderSource.includes('getFocusBranchSubgraph(focusPersonId!'));
check("Focus entry zoom is larger than P2.10 at 0.95", graphSource.includes("FOCUS_BRANCH_ENTRY_SCALE = 0.95"));
check("Focus portal is near full-screen instead of the old 80% frame", (graphSource.includes("FOCUS_OVERLAY_HORIZONTAL_MARGIN_RATIO = 0.035") && graphSource.includes("FOCUS_OVERLAY_VERTICAL_MARGIN_RATIO = 0.04")) || (graphSource.includes("FOCUS_OVERLAY_SCREEN_RATIO = 0.85") && graphSource.includes("windowWidth * FOCUS_OVERLAY_SCREEN_RATIO") && graphSource.includes("windowHeight * FOCUS_OVERLAY_SCREEN_RATIO")));
check("Focus rendering keeps a monotonic retained set", graphSource.includes("retainedPersonIdsRef") && graphSource.includes("mergeRetainedFamilyGraphPersonIds") && graphSource.includes("if (next.size === current.size) return false") && graphSource.includes("const viewportPersonIds = retainedPersonIds"));
check("Loader remains absolute-centered inside focusOverlayGraph", graphSource.includes("focusOverlayGraph: { flex: 1") && graphSource.includes("focusOverlayPreparing: { ...StyleSheet.absoluteFillObject, alignItems: \"center\", justifyContent: \"center\""));
check("Focus loader is compact", graphSource.includes("focusOverlayPreparingInline") && graphSource.includes('ActivityIndicator size="small"') && !graphSource.includes('focusOverlayPreparingLayer: { ...StyleSheet.absoluteFillObject, zIndex: 40, elevation: 40, backgroundColor'));
check("P2.11 package gate is registered", pkg.scripts?.["phaseP2_11:check"] === "node ./scripts/test-phase-p2_11-family-graph-topology-retained-camera.js");
check("Copy-over updater invokes P2.11 gate", cleanSource.includes("test-phase-p2_11-family-graph-topology-retained-camera.js"));
check("Debug Android build invokes P2.11 gate", debugBat.includes("npm run phaseP2_11:check"));
check("Release Android build invokes P2.11 gate", releaseBat.includes("npm run phaseP2_11:check"));

// Syntax scan for all P2.11 TS/TSX changes.
const syntaxFiles = [
  "src/types/familyGraphQuery.ts",
  "src/services/familyGraph/familyGraphQueryEngine.ts",
  "src/components/familyGraph/familyGraphLiveAdapter.ts",
  "src/components/familyGraph/familyGraphViewport.ts",
  "src/components/familyGraph/familyGraphSceneBuilder.ts",
  "src/components/familyGraph/FamilyGraphPrototype.tsx",
  "src/app/(family)/(graph)/family-graph.tsx",
];
let syntaxOk = true;
for (const relativePath of syntaxFiles) {
  const sourcePath = path.join(root, relativePath);
  const result = ts.transpileModule(fs.readFileSync(sourcePath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: sourcePath,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    syntaxOk = false;
    console.error(relativePath, errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")).join("\n"));
  }
}
check("All P2.11 changed TS/TSX files transpile cleanly", syntaxOk);

console.log(`\nFamily Bloom P2.11: ${pass}/${pass + fail} PASS`);
if (fail) process.exit(1);
