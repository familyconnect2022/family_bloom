const fs = require("fs");
const os = require("os");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "family-bloom-p2_11_1-"));
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

console.log("\nP2.11.1 — Bloom Scene Hydration (BSH) Family Graph\n");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const runtimeFiles = [
  "src/types/errors.ts",
  "src/types/user.ts",
  "src/types/familyGraph.ts",
  "src/types/familyGraphQuery.ts",
  "src/constants/appConfiguration.ts",
  "src/services/familyGraph/familyGraphQueryEngine.ts",
  "src/components/familyGraph/familyGraphPrototypeData.ts",
  "src/components/familyGraph/familyGraphLiveAdapter.ts",
  "src/components/familyGraph/familyGraphRevision.ts",
  "src/components/familyGraph/familyGraphBshCache.ts",
  "src/components/familyGraph/familyGraphSpatialGrid.ts",
  "src/components/familyGraph/familyGraphConnectorRouting.ts",
  "src/components/familyGraph/familyGraphGeometry.ts",
  "src/components/familyGraph/familyGraphSceneBuilder.ts",
];

let transpileOk = true;
for (const relativePath of runtimeFiles) {
  const sourcePath = path.join(root, relativePath);
  const targetPath = path.join(outRoot, relativePath.replace(/\.ts$/, ".js"));
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const result = ts.transpileModule(read(relativePath), {
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
    transpileOk = false;
    console.error(relativePath, errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")).join("\n"));
  }
  fs.writeFileSync(targetPath, result.outputText);
}
check("BSH pure runtime stages transpile cleanly", transpileOk);

const sceneRuntime = require(path.join(outRoot, "src/components/familyGraph/familyGraphSceneBuilder.js"));
const cacheRuntime = require(path.join(outRoot, "src/components/familyGraph/familyGraphBshCache.js"));
const {
  buildFamilyGraphModel,
  buildFamilyGraphLayout,
  buildFamilyGraphScene,
  buildFamilyGraphRenderScene,
  FAMILY_GRAPH_FOCUS_ENTRY_SCALE,
} = sceneRuntime;
const {
  clearFamilyGraphBshCaches,
  getFamilyGraphBshCacheStats,
  hydrateFamilyGraphRuntimeState,
  retainFamilyGraphRuntimePersonIds,
  updateFamilyGraphRuntimeCamera,
} = cacheRuntime;

const familyId = "fam_bsh";
const stamp = "2026-10-11T00:00:00.000Z";
const person = (id, displayName, gender = "other", birthYear = null, updatedAt = stamp) => ({
  id, familyId, linkedUid: null, displayName, gender, nickname: null,
  birthDate: null, birthYear, birthPlace: null, deathDate: null, deathYear: null,
  lifeStatus: "living", birthOrder: null, avatarUrl: null, description: null,
  createdByUid: "admin", createdAt: stamp, updatedAt,
});
const pc = (a, b, updatedAt = stamp) => ({
  id: `pc_${a}_${b}`, familyId, type: "parent_child", personAId: a, personBId: b,
  subtype: "biological", partnerStatus: null, startDate: null, endDate: null,
  createdByUid: "admin", createdAt: stamp, updatedAt,
});
const pt = (a, b, updatedAt = stamp) => {
  const [x, y] = [a, b].sort();
  return {
    id: `pt_${x}_${y}`, familyId, type: "partner", personAId: x, personBId: y,
    subtype: null, partnerStatus: "married", startDate: null, endDate: null,
    createdByUid: "admin", createdAt: stamp, updatedAt,
  };
};

const persons = [
  person("lanFather", "Nguyễn Văn Lâm", "male", 1902),
  person("lanMother", "Trần Thị Mai", "female", 1906),
  person("lan", "Nguyễn Thị Lan", "female", 1930),
  person("lanSibling", "Nguyễn Văn Lân", "male", 1934),
  person("lanSiblingChild", "Nguyễn Nhánh Ngoài", "male", 1960),
  person("donFather", "Nguyễn Vũ Khang", "male", 1901),
  person("donMother", "Lê Thị Nguyệt", "female", 1905),
  person("don", "Nguyễn Vũ Đôn", "male", 1932),
  person("bich", "Nguyễn Thị Bích", "female", 1960),
  person("long", "Huỳnh Văn Long", "male", 1952),
  person("nhan", "Huỳnh Thanh Nhân", "male", 1988),
  person("gia1", "Huỳnh Nguyễn Gia Minh", "male", 2016),
  person("gia2", "Huỳnh Nguyễn Minh Anh", "female", 2038),
  person("gia3", "Huỳnh Nguyễn An Nhiên", "female", 2060),
];
const relationships = [
  pt("lanFather", "lanMother"), pc("lanFather", "lan"), pc("lanMother", "lan"),
  pc("lanFather", "lanSibling"), pc("lanMother", "lanSibling"), pc("lanSibling", "lanSiblingChild"),
  pt("donFather", "donMother"), pc("donFather", "don"), pc("donMother", "don"),
  pt("lan", "don"), pc("lan", "bich"), pc("don", "bich"), pt("bich", "long"),
  pc("bich", "nhan"), pc("long", "nhan"), pc("nhan", "gia1"), pc("gia1", "gia2"), pc("gia2", "gia3"),
];
const snapshot = { familyId, persons, relationships };

clearFamilyGraphBshCaches();
const lanModel = buildFamilyGraphModel(snapshot, { mode: "focusBranch", focusPersonId: "lan" });
check("Stage 1 returns a Focus GraphModel", !!lanModel && lanModel.mode === "focusBranch" && lanModel.focusPersonId === "lan");
check("Stage 1 keeps only one direct ancestor context", lanModel.contextPersonIds.includes("lanFather") && lanModel.contextPersonIds.includes("lanMother"));
check("Stage 1 does not reopen ancestor sibling branches", !lanModel.personIds.includes("lanSibling") && !lanModel.personIds.includes("lanSiblingChild"));
check("Stage 1 keeps selected partner + descendants", ["don", "bich", "long", "nhan", "gia1", "gia3"].every((id) => lanModel.personIds.includes(id)));
check("Stage 1 does not leak partner ancestors sideways", !lanModel.personIds.includes("donFather") && !lanModel.personIds.includes("donMother"));

const lanLayout = buildFamilyGraphLayout(snapshot, lanModel);
const lanById = new Map(lanLayout.people.map((item) => [item.id, item]));
check("Stage 2 precomputes finite x/y for every node", lanLayout.people.every((item) => Number.isFinite(item.x) && Number.isFinite(item.y)));
check("Stage 2 locally rebases ancestor context to generation 1", lanById.get("lanFather")?.generation === 1 && lanById.get("lanMother")?.generation === 1);
check("Stage 2 preserves deep generations without clamp", lanById.get("gia3")?.generation === 7);
check("Stage 2 exposes content bounds before React render", lanLayout.bounds.right > lanLayout.bounds.left && lanLayout.bounds.bottom > lanLayout.bounds.top);

const lanScene = buildFamilyGraphScene(snapshot, lanModel, lanLayout);
check("Stage 3 carries the exact Stage-2 coordinates", lanScene.people.find((p) => p.id === "lan")?.x === lanById.get("lan")?.x && lanScene.people.find((p) => p.id === "lan")?.y === lanById.get("lan")?.y);
check("Scene bootstrap includes selected + direct parents + partner", ["lan", "lanFather", "lanMother", "don"].every((id) => lanScene.bootstrapPersonIds.includes(id)));
check("Scene camera is precomputed at 95% and never fit-all", lanScene.initialCamera?.scale === FAMILY_GRAPH_FOCUS_ENTRY_SCALE && FAMILY_GRAPH_FOCUS_ENTRY_SCALE === 0.95);
const lan = lanScene.people.find((p) => p.id === "lan");
check("Scene camera anchor uses the same precomputed x/y map", lanScene.initialCamera?.canvasPoint.x === lan.x + 64 && lanScene.initialCamera?.canvasPoint.y === lan.y + 62);

const cachedScene = buildFamilyGraphRenderScene(snapshot, { mode: "focusBranch", focusPersonId: "lan" });
const cachedSceneAgain = buildFamilyGraphRenderScene(snapshot, { mode: "focusBranch", focusPersonId: "lan" });
check("Repeated Focus hydration returns the cached scene object", cachedScene === cachedSceneAgain);
const statsAfterRepeat = getFamilyGraphBshCacheStats();
check("BSH caches Model + Layout + Scene independently", statsAfterRepeat.models >= 1 && statsAfterRepeat.layouts >= 1 && statsAfterRepeat.scenes >= 1);

let runtimeState = hydrateFamilyGraphRuntimeState(lanScene.sceneKey, lanScene.bootstrapPersonIds);
check("Runtime hydration starts with bootstrap retained nodes", lanScene.bootstrapPersonIds.every((id) => runtimeState.retainedPersonIds.has(id)));
retainFamilyGraphRuntimePersonIds(lanScene.sceneKey, ["bich", "nhan"]);
updateFamilyGraphRuntimeCamera(lanScene.sceneKey, { centerX: 321, centerY: 654, scale: 1.08 });
runtimeState = hydrateFamilyGraphRuntimeState(lanScene.sceneKey, lanScene.bootstrapPersonIds);
check("Runtime retained rendering never forgets visited nodes", runtimeState.retainedPersonIds.has("bich") && runtimeState.retainedPersonIds.has("nhan"));
check("Runtime camera hydrates independently from graph layout", runtimeState.camera?.centerX === 321 && runtimeState.camera?.centerY === 654 && runtimeState.camera?.scale === 1.08);

const profileChanged = {
  ...snapshot,
  persons: snapshot.persons.map((item) => item.id === "lan"
    ? { ...item, avatarUrl: "https://example.test/lan.jpg", updatedAt: "2026-10-11T01:00:00.000Z" }
    : item),
};
const profileScene = buildFamilyGraphRenderScene(profileChanged, { mode: "focusBranch", focusPersonId: "lan" });
check("Profile-only update reuses topology revision", profileScene.topologyRevision === lanScene.topologyRevision);
check("Profile-only update reuses layout revision", profileScene.layoutRevision === lanScene.layoutRevision);
check("Profile-only update creates a fresh hydrated scene revision", profileScene.sceneKey !== lanScene.sceneKey && profileScene.visualRevision !== lanScene.visualRevision);
check("Profile-only update preserves x/y", profileScene.people.find((p) => p.id === "lan")?.x === lan.x && profileScene.people.find((p) => p.id === "lan")?.y === lan.y);
check("Profile-only update patches visual fields", profileScene.people.find((p) => p.id === "lan")?.avatarUrl === "https://example.test/lan.jpg");

const topologyChanged = {
  ...snapshot,
  persons: [...snapshot.persons, person("newChild", "Nguyễn Thành Viên Mới", "female", 1990)],
  relationships: [...snapshot.relationships, pc("bich", "newChild")],
};
const topologyScene = buildFamilyGraphRenderScene(topologyChanged, { mode: "focusBranch", focusPersonId: "lan" });
check("Relationship/person topology change invalidates model revision", topologyScene.topologyRevision !== lanScene.topologyRevision);
check("Topology change produces a different model/layout/scene identity", topologyScene.modelKey !== lanScene.modelKey && topologyScene.layoutKey !== lanScene.layoutKey && topologyScene.sceneKey !== lanScene.sceneKey);

const fullScene = buildFamilyGraphRenderScene(snapshot, { mode: "fullTree", focusPersonId: "bich" });
check("Full Tree uses the same BSH facade", fullScene.mode === "fullTree" && fullScene.personIds.length === snapshot.persons.length);
check("Full Tree and Focus are different Stage-1 inputs, not different renderers", fullScene.bshVersion === lanScene.bshVersion && fullScene.sceneVersion === lanScene.sceneVersion);

const sceneSource = read("src/components/familyGraph/familyGraphSceneBuilder.ts");
const cacheSource = read("src/components/familyGraph/familyGraphBshCache.ts");
const graph = read("src/components/familyGraph/FamilyGraphPrototype.tsx");
const screen = read("src/app/(family)/(graph)/family-graph.tsx");
const pkg = JSON.parse(read("package.json"));
const clean = read("Family_Bloom_CLEAN_APPLY_FULL.bat");
const debug = read("scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat");
const release = read("scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat");

check("BSH exposes explicit Model -> Layout -> Scene stages", sceneSource.includes("buildFamilyGraphModel") && sceneSource.includes("buildFamilyGraphLayout") && sceneSource.includes("buildFamilyGraphScene"));
check("Renderer production input is a prepared scene", graph.includes("scene?: FamilyGraphRenderScene") && screen.includes("scene={visual}"));
check("Focus child renderer receives scene directly", graph.includes("scene={visual}") && graph.includes("<PersistentFocusGraphSurface") && !graph.includes("people={focusOverlay.visual.people}"));
check("Production bootstrap IDs are consumed from scene", graph.includes("new Set(scene.bootstrapPersonIds)") && graph.includes("never traverses genealogy relationships here"));
check("Screen has no second branch cache", !screen.includes("focusBranchVisualCache"));
check("Runtime state is isolated from layout/scene cache", cacheSource.includes("runtimeCache") && cacheSource.includes("retainedPersonIds") && cacheSource.includes("camera"));
check("Focus graph remains visible before readiness completes", graph.includes("never hide the prepared graph behind readiness") && graph.includes("opacity: 1"));
check("Loading layer can never block pan/pinch", graph.includes('pointerEvents="none"') && !graph.includes('pointerEvents={focusOverlay.visualReady ? "none" : "auto"}'));
check("Loader is compact and centered inside graph viewport", graph.includes("focusOverlayPreparingInline") && graph.includes('focusOverlayPreparing: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center"'));
check("Entry camera is consumed from GraphScene before legacy fit logic", graph.includes("if (scene?.initialCamera)") && graph.indexOf("if (scene?.initialCamera)") < graph.indexOf("if (autoFitOnMount && visiblePeople.length)"));
check("Retained Focus IDs persist into BSH runtime cache", graph.includes("retainFamilyGraphRuntimePersonIds(scene.sceneKey, next)"));
check("Focus camera persists into BSH runtime cache", graph.includes("updateFamilyGraphRuntimeCamera(scene.sceneKey, next)"));
check("P2.11.1 package gate is registered", pkg.scripts?.["phaseP2_11_1:check"] === "node ./scripts/test-phase-p2_11_1-family-graph-scene-runtime.js");
check("Copy-over updater invokes P2.11.1 gate", clean.includes("test-phase-p2_11_1-family-graph-scene-runtime.js"));
check("Debug Android build invokes P2.11.1 gate", debug.includes("npm run phaseP2_11_1:check"));
check("Release Android build invokes P2.11.1 gate", release.includes("npm run phaseP2_11_1:check"));

const syntaxFiles = [
  "src/components/familyGraph/familyGraphBshCache.ts",
  "src/components/familyGraph/familyGraphRevision.ts",
  "src/components/familyGraph/familyGraphSceneBuilder.ts",
  "src/components/familyGraph/familyGraphWarmCache.ts",
  "src/components/familyGraph/FamilyGraphPrototype.tsx",
  "src/app/(family)/(graph)/family-graph.tsx",
];
let syntaxOk = true;
for (const relativePath of syntaxFiles) {
  const sourcePath = path.join(root, relativePath);
  const result = ts.transpileModule(read(relativePath), {
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
check("All BSH integration TS/TSX transpiles cleanly", syntaxOk);

console.log(`\nFamily Bloom P2.11.1 BSH: ${pass}/${pass + fail} PASS`);
if (fail) process.exit(1);
