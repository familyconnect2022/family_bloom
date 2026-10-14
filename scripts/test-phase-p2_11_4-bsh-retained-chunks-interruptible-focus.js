const fs = require("fs");
const os = require("os");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "family-bloom-p2_11_4-"));
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
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

console.log("\nP2.11.4 — BSH Retained Chunks / Interruptible Focus\n");

const runtimeFiles = [
  "src/types/errors.ts",
  "src/types/user.ts",
  "src/types/familyGraph.ts",
  "src/types/familyGraphQuery.ts",
  "src/constants/appConfiguration.ts",
  "src/services/familyGraph/familyGraphQueryEngine.ts",
  "src/components/familyGraph/familyGraphPrototypeData.ts",
  "src/components/familyGraph/familyGraphSpatialGrid.ts",
  "src/components/familyGraph/familyGraphConnectorRouting.ts",
  "src/components/familyGraph/familyGraphLiveAdapter.ts",
  "src/components/familyGraph/familyGraphRevision.ts",
  "src/components/familyGraph/familyGraphViewport.ts",
  "src/components/familyGraph/familyGraphBshCache.ts",
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
check("P2.11.4 BSH runtime stages transpile", transpileOk);

const sceneRuntime = require(path.join(outRoot, "src/components/familyGraph/familyGraphSceneBuilder.js"));
const geometryRuntime = require(path.join(outRoot, "src/components/familyGraph/familyGraphGeometry.js"));
const cacheRuntime = require(path.join(outRoot, "src/components/familyGraph/familyGraphBshCache.js"));
const appConfig = require(path.join(outRoot, "src/constants/appConfiguration.js")).APP_CONFIG_DEFAULTS;
const {
  buildFamilyGraphModel,
  buildFamilyGraphLayout,
  buildFamilyGraphScene,
  buildFamilyGraphRenderScene,
  FAMILY_GRAPH_SCENE_VERSION,
} = sceneRuntime;
const { buildFamilyGraphGeometry, FAMILY_GRAPH_GEOMETRY_VERSION } = geometryRuntime;
const { clearFamilyGraphBshCaches, getFamilyGraphBshCacheStats } = cacheRuntime;

const familyId = "fam_p2114";
const stamp = "2026-10-11T00:00:00.000Z";
const person = (id, displayName, gender, birthYear, avatarUrl = null) => ({
  id, familyId, linkedUid: null, displayName, gender, nickname: null,
  birthDate: null, birthYear, birthPlace: null, deathDate: null, deathYear: null,
  lifeStatus: "living", birthOrder: null, avatarUrl, description: null,
  createdByUid: "admin", createdAt: stamp, updatedAt: stamp,
});
const pc = (a, b) => ({
  id: `pc_${a}_${b}`, familyId, type: "parent_child", personAId: a, personBId: b,
  subtype: "biological", partnerStatus: null, startDate: null, endDate: null,
  createdByUid: "admin", createdAt: stamp, updatedAt: stamp,
});
const pt = (a, b) => ({
  id: `pt_${a}_${b}`, familyId, type: "partner", personAId: a, personBId: b,
  subtype: null, partnerStatus: "married", startDate: null, endDate: null,
  createdByUid: "admin", createdAt: stamp, updatedAt: stamp,
});
const basePersons = [
  person("pa", "Parent A", "male", 1940),
  person("pb", "Parent B", "female", 1942),
  person("c1", "Child One", "female", 1970),
  person("c2", "Child Two", "male", 1973),
  person("sp", "Spouse", "male", 1968),
  person("gc", "Grandchild", "female", 1998),
];
const relationships = [
  pt("pa", "pb"), pc("pa", "c1"), pc("pb", "c1"), pc("pa", "c2"), pc("pb", "c2"),
  pt("c1", "sp"), pc("c1", "gc"), pc("sp", "gc"),
];
const snapshot = { familyId, persons: basePersons, relationships };

clearFamilyGraphBshCaches();
const model = buildFamilyGraphModel(snapshot, { mode: "focusBranch", focusPersonId: "c1" });
const layout = buildFamilyGraphLayout(snapshot, model);
const geometry = buildFamilyGraphGeometry(layout);
const geometryAgain = buildFamilyGraphGeometry(layout);
const scene = buildFamilyGraphScene(snapshot, model, layout, geometry);
const sceneAgain = buildFamilyGraphRenderScene(snapshot, { mode: "focusBranch", focusPersonId: "c1" });
check("BSH adds an explicit Geometry stage", !!geometry && geometry.geometryVersion === FAMILY_GRAPH_GEOMETRY_VERSION);
check("Geometry is independently cached", geometryAgain === geometry && getFamilyGraphBshCacheStats().geometries >= 1);
check("Scene carries the cached Geometry object", scene.geometry === geometry && scene.geometryKey === geometry.geometryKey);
check("Scene identity includes the Geometry revision", scene.sceneKey.includes(geometry.geometryKey));
check("P2.11.4 bumps Scene version for runtime compatibility", FAMILY_GRAPH_SCENE_VERSION >= 3 && scene.sceneVersion === FAMILY_GRAPH_SCENE_VERSION);
check("Repeated scene hydration reuses the same prepared Scene", sceneAgain === scene);
check("Geometry precomputes partner units", geometry.partnerUnits.some((unit) => unit.partnerAId === "c1" && unit.partnerBId === "sp"));
check("Geometry precomputes shared-child union membership", geometry.partnerUnits.some((unit) => unit.sharedChildIds.includes("gc")));
check("Geometry precomputes connector routes outside React", geometry.routingPlan.routeByConnectionId instanceof Map);

const fullModelForSpacing = buildFamilyGraphModel(snapshot, { mode: "fullTree" });
const fullLayoutForSpacing = buildFamilyGraphLayout(snapshot, fullModelForSpacing);
const byId = new Map(fullLayoutForSpacing.people.map((p) => [p.id, p]));
const pa = byId.get("pa");
const pb = byId.get("pb");
const c1 = byId.get("c1");
const c2 = byId.get("c2");
check("Partner node spacing uses one deterministic semantic gap", !!pa && !!pb && Math.abs(Math.abs(pa.x - pb.x) - (128 + appConfig.familyGraph.layout.partnerGap)) < 0.01);
const siblingSnapshot = {
  familyId: `${familyId}_siblings`,
  persons: [
    { ...person("s_pa", "Sibling Parent A", "male", 1940), familyId: `${familyId}_siblings` },
    { ...person("s_pb", "Sibling Parent B", "female", 1942), familyId: `${familyId}_siblings` },
    { ...person("s_c1", "Sibling One", "female", 1970), familyId: `${familyId}_siblings` },
    { ...person("s_c2", "Sibling Two", "male", 1973), familyId: `${familyId}_siblings` },
  ],
  relationships: [
    { ...pt("s_pa", "s_pb"), id: "s_pt", familyId: `${familyId}_siblings` },
    { ...pc("s_pa", "s_c1"), id: "s_pc1a", familyId: `${familyId}_siblings` },
    { ...pc("s_pb", "s_c1"), id: "s_pc1b", familyId: `${familyId}_siblings` },
    { ...pc("s_pa", "s_c2"), id: "s_pc2a", familyId: `${familyId}_siblings` },
    { ...pc("s_pb", "s_c2"), id: "s_pc2b", familyId: `${familyId}_siblings` },
  ],
};
const siblingModel = buildFamilyGraphModel(siblingSnapshot, { mode: "fullTree" });
const siblingLayout = buildFamilyGraphLayout(siblingSnapshot, siblingModel);
const siblingById = new Map(siblingLayout.people.map((p) => [p.id, p]));
const s1 = siblingById.get("s_c1");
const s2 = siblingById.get("s_c2");
check("Sibling family units use one deterministic semantic gap", !!s1 && !!s2 && Math.abs(Math.abs(s1.x - s2.x) - (128 + appConfig.familyGraph.layout.siblingUnitGap)) < 0.01);
check("Generation rows use one deterministic vertical step", !!c1 && !!pa && Math.abs(c1.y - pa.y - appConfig.familyGraph.layout.generationStep) < 0.01);

const profileSnapshot = {
  ...snapshot,
  persons: snapshot.persons.map((p) => p.id === "c1" ? { ...p, avatarUrl: "https://example.test/c1.jpg", updatedAt: "2026-10-11T01:00:00.000Z" } : p),
};
const profileModel = buildFamilyGraphModel(profileSnapshot, { mode: "focusBranch", focusPersonId: "c1" });
const profileLayout = buildFamilyGraphLayout(profileSnapshot, profileModel);
const profileGeometry = buildFamilyGraphGeometry(profileLayout);
check("Profile-only changes reuse Layout Geometry", profileLayout.layoutKey === layout.layoutKey && profileGeometry === geometry);

const graph = read("src/components/familyGraph/FamilyGraphPrototype.tsx");
const sceneSource = read("src/components/familyGraph/familyGraphSceneBuilder.ts");
const geometrySource = read("src/components/familyGraph/familyGraphGeometry.ts");
const cacheSource = read("src/components/familyGraph/familyGraphBshCache.ts");
const pkg = JSON.parse(read("package.json"));
const clean = read("Family_Bloom_CLEAN_APPLY_FULL.bat");
const debug = read("scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat");
const release = read("scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat");

const progressiveEffectStart = graph.indexOf("P2.12 retained graph");
const progressiveEffectBlock = graph.slice(progressiveEffectStart, progressiveEffectStart + 1200);
check("Retained graph no longer auto-loads batches while idle", progressiveEffectBlock.includes("There is no background") && !graph.includes("scheduleIdleTask"));
check("Prepared Scene remains discovery candidates for every graph mode", graph.includes("const renderedPeople = progressivePeople"));
check("Mounted node set is retained-only, not moving viewport-only", graph.includes("const viewportPersonIds = retainedPersonIds"));
check("Retained discovery only schedules React when unseen IDs are added", graph.includes("if (next.size === current.size) return false") && graph.includes("retainedPersonIdsRef.current = next"));
check("Retained discovery is a non-urgent transition so Back can preempt", graph.includes("const discoverRetainedCamera") && graph.includes("startTransition(() => setRetainedPersonIds(next))"));

const reactionStart = graph.indexOf("useAnimatedReaction(");
const reactionEnd = graph.indexOf("const overviewCenter", reactionStart);
const reactionBlock = graph.slice(reactionStart, reactionEnd);
check("Pan crosses spatial cells without committing React camera state", reactionBlock.includes("runOnJS(discoverRetainedCamera)") && !reactionBlock.includes("runOnJS(commitCameraSnapshot)"));

const connectorCallStart = graph.indexOf("<GraphConnectors");
const connectorCallBlock = graph.slice(connectorCallStart, connectorCallStart + 700);
check("Prepared connectors receive no moving renderBounds", connectorCallBlock.includes("renderBounds={null}"));
check("Renderer consumes Scene Geometry directly", connectorCallBlock.includes("geometry={scene?.geometry ?? null}"));

const preparedStart = graph.indexOf("const PreparedRetainedGraphConnectors");
const legacyStart = graph.indexOf("const LegacyGraphConnectors", preparedStart);
const preparedBlock = graph.slice(preparedStart, legacyStart);
check("Prepared Focus connector renderer never calls routing planner", !preparedBlock.includes("buildFamilyGraphConnectorRoutingPlan"));
check("Prepared Focus connector renderer never reads camera bounds", !preparedBlock.includes("renderBounds"));
check("Partner line is memoized as an immutable primitive", graph.includes("const PreparedPartnerConnector = memo"));
check("Union stem is memoized as an immutable primitive", graph.includes("const PreparedUnionStemConnector = memo"));
check("Each loaded union child line is its own memoized primitive", graph.includes("const PreparedUnionChildConnector = memo"));
check("Single-parent route is memoized as an immutable primitive", graph.includes("const PreparedSingleParentConnector = memo"));
check("Legacy routing planner remains isolated to legacy fallback path", graph.indexOf("buildFamilyGraphConnectorRoutingPlan({", legacyStart) > legacyStart);

check("Retained relation labels are cached instead of re-resolved on every pan", graph.includes("focusRelationCacheRef") && graph.includes("relations.has(person.id)"));
check("Person cards use a semantic memo comparator", graph.includes("previous.person === next.person") && graph.includes("previous.relationMeta?.label === next.relationMeta?.label"));

const closeStart = graph.indexOf("const closeFocusOverlay = useCallback");
const closeEnd = graph.indexOf("useEffect(() => {", closeStart);
const closeBlock = graph.slice(closeStart, closeEnd);
check("Immediate Back contract remains intact", ((closeBlock.includes("focusSurface.hide()") && closeBlock.includes("cancelFocusScheduledWork()")) || (closeBlock.includes("setFocusOverlayVisible(false)") && closeBlock.includes("if (!focusOverlay.visual)"))) && !closeBlock.includes("setFocusOverlay(null)") && !closeBlock.includes("withTiming("));
check("Geometry stage participates in interruptible BSH boundaries", sceneSource.includes("const geometry = buildFamilyGraphGeometry(layout)") && (sceneSource.match(/await yieldFamilyGraphBuild\(\)/g) || []).length >= 4);
check("Geometry cache is cleared with other privacy/runtime graph caches", cacheSource.includes("geometryCache.clear()"));
check("Geometry owns fixed card/routing dimensions outside React renderer", geometrySource.includes("FAMILY_GRAPH_NODE_CARD_WIDTH") && geometrySource.includes("FAMILY_GRAPH_NODE_CARD_HEIGHT"));

check("P2.11.4 package gate is registered", pkg.scripts?.["phaseP2_11_4:check"] === "node ./scripts/test-phase-p2_11_4-bsh-retained-chunks-interruptible-focus.js");
check("Copy-over updater invokes P2.11.4 gate", clean.includes("test-phase-p2_11_4-bsh-retained-chunks-interruptible-focus.js"));
check("Debug Android build invokes P2.11.4 gate", debug.includes("npm run phaseP2_11_4:check"));
check("Release Android build invokes P2.11.4 gate", release.includes("npm run phaseP2_11_4:check"));

const integrationFiles = [
  "src/components/familyGraph/familyGraphBshCache.ts",
  "src/components/familyGraph/familyGraphGeometry.ts",
  "src/components/familyGraph/familyGraphSceneBuilder.ts",
  "src/components/familyGraph/FamilyGraphPrototype.tsx",
  "src/app/(family)/(graph)/family-graph.tsx",
];
let integrationSyntaxOk = true;
for (const relativePath of integrationFiles) {
  const result = ts.transpileModule(read(relativePath), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: path.join(root, relativePath),
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    integrationSyntaxOk = false;
    console.error(relativePath, errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")).join("\n"));
  }
}
check("P2.11.4 integration TS/TSX transpiles cleanly", integrationSyntaxOk);

console.log(`\nFamily Bloom P2.11.4 Retained Chunks: ${pass}/${pass + fail} PASS`);
if (fail) process.exit(1);
