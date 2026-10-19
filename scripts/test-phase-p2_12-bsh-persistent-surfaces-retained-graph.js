const fs = require("fs");
const os = require("os");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "family-bloom-p2_12-"));
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

console.log("\nP2.12 — BSH Persistent Surfaces + Retained Graph + Startup Chrome\n");

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
let runtimeTranspileOk = true;
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
    runtimeTranspileOk = false;
    console.error(relativePath, errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")).join("\n"));
  }
  fs.writeFileSync(targetPath, result.outputText);
}
check("P2.12 BSH runtime stages transpile", runtimeTranspileOk);

const sceneRuntime = require(path.join(outRoot, "src/components/familyGraph/familyGraphSceneBuilder.js"));
const {
  buildFamilyGraphRenderScene,
  FAMILY_GRAPH_SCENE_VERSION,
  FAMILY_GRAPH_FOCUS_ENTRY_SCALE,
  FAMILY_GRAPH_FOCUS_ENTRY_VIEWPORT_Y,
} = sceneRuntime;

const familyId = "fam_p212";
const stamp = "2026-10-11T00:00:00.000Z";
const person = (id, displayName, gender, birthYear) => ({
  id, familyId, linkedUid: null, displayName, gender, nickname: null,
  birthDate: null, birthYear, birthPlace: null, deathDate: null, deathYear: null,
  lifeStatus: "living", birthOrder: null, avatarUrl: null, description: null,
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
const snapshot = {
  familyId,
  persons: [
    person("pa", "Parent A", "male", 1940),
    person("pb", "Parent B", "female", 1942),
    person("focus", "Focus", "female", 1970),
    person("sp", "Spouse", "male", 1968),
    person("child", "Child", "female", 1998),
  ],
  relationships: [
    pt("pa", "pb"), pc("pa", "focus"), pc("pb", "focus"),
    pt("focus", "sp"), pc("focus", "child"), pc("sp", "child"),
  ],
};
const fullScene = buildFamilyGraphRenderScene(snapshot, { mode: "fullTree", focusPersonId: "focus" });
const focusScene = buildFamilyGraphRenderScene(snapshot, { mode: "focusBranch", focusPersonId: "focus" });
check("P2.12 bumps Scene version for persistent runtime compatibility", FAMILY_GRAPH_SCENE_VERSION >= 4 && fullScene?.sceneVersion === FAMILY_GRAPH_SCENE_VERSION);
check("Full Tree bootstrap includes anchor", !!fullScene && fullScene.bootstrapPersonIds.includes("focus"));
check("Full Tree bootstrap includes direct parent context", !!fullScene && fullScene.bootstrapPersonIds.includes("pa") && fullScene.bootstrapPersonIds.includes("pb"));
check("Full Tree bootstrap includes anchor partner", !!fullScene && fullScene.bootstrapPersonIds.includes("sp"));
check("Focus camera remains 95%", focusScene?.initialCamera?.scale === 0.95 && FAMILY_GRAPH_FOCUS_ENTRY_SCALE === 0.95);
check("Focus camera remains anchored at 42% viewport height", focusScene?.initialCamera?.viewportAnchor.y === 0.42 && FAMILY_GRAPH_FOCUS_ENTRY_VIEWPORT_Y === 0.42);

const graph = read("src/components/familyGraph/FamilyGraphPrototype.tsx");
const surfaceStore = read("src/services/presentation/bloomSurfaceStackStore.ts");
const surfaceStack = read("src/components/system/BloomSurfaceStack.tsx");
const focusHost = read("src/components/familyGraph/FamilyGraphFocusSurfaceHost.tsx");
const focusStore = read("src/services/presentation/familyGraphFocusSurfaceStore.ts");
const route = read("src/app/(family)/(graph)/family-graph.tsx");
const tabStartup = read("src/context/TabStartupContext.tsx");
const rootLayout = read("src/app/_layout.tsx");
const tabsLayout = read("src/app/(tabs)/_layout.tsx");
const sceneSource = read("src/components/familyGraph/familyGraphSceneBuilder.ts");
const pkg = JSON.parse(read("package.json"));
const clean = read("scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat");
const debug = read("scripts/android/dev/Family_Bloom_Android_Debug_Build_And_Run.bat");
const release = read("scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat");

check("Full/3/5/Focus share one retained candidate path", graph.includes("const renderedPeople = progressivePeople") && graph.includes("const viewportPersonIds = retainedPersonIds"));
check("No graph mode auto-loads idle batches", !graph.includes("scheduleIdleTask") && !graph.includes("fullTreeRenderLimit"));
check("Retained set has an imperative mirror", graph.includes("const retainedPersonIdsRef = useRef(retainedPersonIds)"));
check("Already-retained discovery does not enqueue React state", graph.includes("if (next.size === current.size) return false"));
check("New retained IDs are appended in a transition", graph.includes("startTransition(() => setRetainedPersonIds(next))"));
check("Visited spatial regions are remembered", graph.includes("loadedRegionKeysRef") && graph.includes("loadedRegionKeysRef.current.has(regionKey)"));
check("Returning to a loaded spatial region exits before querying", graph.indexOf("loadedRegionKeysRef.current.has(regionKey)") < graph.indexOf("const discovered = collectPersonIdsForCamera(camera)", graph.indexOf("const discoverRetainedCamera")));
check("Spatial-region identity includes scene/mode/anchor/camera buckets", graph.includes('scene?.sceneKey ?? "prototype"') && graph.includes("viewMode") && graph.includes("viewAnchorPersonId ?? initialFocusId") && graph.includes("scaleBucket"));
check("Region discovery index resets when logical scene changes", graph.includes("loadedRegionKeysRef.current.clear()") && graph.includes("[scene?.sceneKey, viewAnchorPersonId, viewMode]"));

const reactionStart = graph.indexOf("useAnimatedReaction(");
const reactionEnd = graph.indexOf("const overviewCenter", reactionStart);
const reactionBlock = graph.slice(reactionStart, reactionEnd);
check("Camera-cell crossing only asks retained discovery", reactionBlock.includes("runOnJS(discoverRetainedCamera)") && !reactionBlock.includes("runOnJS(commitCameraSnapshot)"));
check("Prepared connectors are independent from moving viewport bounds", graph.includes("renderBounds={null}"));
check("Prepared Geometry is consumed by the renderer", graph.includes("geometry={scene?.geometry ?? null}"));
check("Person cards are memoized", graph.includes("const PersonNode = memo(function PersonNode") && graph.includes("previous.person === next.person"));
check("Prepared line primitives are memoized", graph.includes("const PreparedPartnerConnector = memo") && graph.includes("const PreparedUnionChildConnector = memo") && graph.includes("const PreparedSingleParentConnector = memo"));

const closeStart = graph.indexOf("const closeFocusOverlay = useCallback");
const closeEnd = graph.indexOf("useEffect(() => {", closeStart);
const closeBlock = graph.slice(closeStart, closeEnd);

check("Focus presentation has a persistent successor contract", rootLayout.includes("<BloomSurfaceStack") && !route.includes("FamilyGraphFocusPortalProvider") && surfaceStack.includes("<FamilyGraphFocusSurfaceHost />") && graph.includes("publishFamilyGraphFocusSurface") && focusStore.includes("visible: boolean"));
check("Hidden Focus preserves the prepared session instead of clearing it", graph.includes("const [focusOverlayVisible, setFocusOverlayVisible]") && !closeBlock.includes("setFocusOverlay(null)"));
check("Hidden persistent Focus presentation cannot own touches", !focusHost.includes("<Modal") && focusHost.includes("pointerEvents={snapshot.visible ? \"auto\" : \"none\"}") && focusHost.includes("!snapshot.visible && styles.hidden"));
check("Focus hide changes visibility without clearing session", closeBlock.includes("setFocusOverlayVisible(false)") && !closeBlock.includes("setFocusOverlay(null)"));

check("Back hides presentation on the critical path", closeBlock.includes("setFocusOverlayVisible(false)") && !closeBlock.includes("setFocusOverlay(null)"));
check("Back never tears down Focus Scene on critical path", !closeBlock.includes("setFocusOverlay(null)") && !closeBlock.includes("setFocusOverlay({"));
check("Back cancels unfinished branch build before hide", closeBlock.includes("if (!focusOverlay.visual)") && closeBlock.includes("cancelFocusScheduledWork()") && closeBlock.indexOf("cancelFocusScheduledWork()") < closeBlock.indexOf("setFocusOverlayVisible(false)"));
check("Focus close has no teardown/deferred cleanup dependency", closeBlock.includes("setFocusOverlayVisible(false)") && !closeBlock.includes("scheduleFocusTimer") && !closeBlock.includes("setFocusOverlay(null)"));
check("Hardware Back listener exists only while Focus is visible", graph.includes("!focusOverlayVisible") && graph.includes('BackHandler.addEventListener("hardwareBackPress"'));
check("Base graph itself is not waiting for deferred Focus visibility state", graph.includes('<View style={styles.baseGraphLayer}>') && !graph.includes('pointerEvents={focusOverlayVisible ? "none" : "auto"}'));
check("Same Focus branch can reuse its prepared persistent Scene", graph.includes("focusOverlay?.personId === personId") && graph.includes("focusOverlay.visual") && graph.includes("setFocusOverlayVisible(true)"));
check("Persistent Focus graph has a scene-keyed child surface", graph.includes("key={visual.sceneKey}") && graph.includes("scene={visual}"));

check("Tab startup context owns chrome readiness", tabStartup.includes("chromeReady: boolean") && tabStartup.includes("reportChromeReady"));
check("Tab bar reports readiness from real layout", tabsLayout.includes("onLayout={handleTabBarLayout}") && tabsLayout.includes("reportChromeReady(true)"));
check("Tab bar waits two native frames after layout", (tabsLayout.slice(tabsLayout.indexOf("const handleTabBarLayout"), tabsLayout.indexOf("const handleTabBarLayout") + 900).match(/requestAnimationFrame/g) || []).length >= 2);
check("Root splash readiness requires actual tab-bar first frame", rootLayout.includes("tabBarVisualReady") && rootLayout.includes("&& tabBarVisualReady"));
check("Normal startup does not use a fake fixed tab-bar delay", !tabsLayout.slice(tabsLayout.indexOf("const handleTabBarLayout"), tabsLayout.indexOf("const handleTabBarLayout") + 900).includes("setTimeout("));

check("Interruptible BSH still yields between Model/Layout/Geometry/Scene", (sceneSource.match(/await yieldFamilyGraphBuild\(\)/g) || []).length >= 4);
check("P2.12 package gate is registered", pkg.scripts?.["phaseP2_12:check"] === "node ./scripts/test-phase-p2_12-bsh-persistent-surfaces-retained-graph.js");
check("Copy-over updater invokes P2.12 gate", clean.includes("test-phase-p2_12-bsh-persistent-surfaces-retained-graph.js"));
check("Debug Android build invokes P2.12 gate", debug.includes("npm run phaseP2_12:check"));
check("Release Android build invokes P2.12 gate", release.includes("npm run phaseP2_12:check"));

const integrationFiles = [
  "src/components/familyGraph/familyGraphBshCache.ts",
  "src/components/familyGraph/familyGraphGeometry.ts",
  "src/components/familyGraph/familyGraphSceneBuilder.ts",
  "src/services/presentation/bloomSurfaceStackStore.ts",
  "src/services/presentation/familyGraphFocusSurfaceStore.ts",
  "src/components/familyGraph/FamilyGraphFocusSurfaceHost.tsx",
  "src/components/system/BloomSurfaceStack.tsx",
  "src/components/familyGraph/FamilyGraphPrototype.tsx",
  "src/context/TabStartupContext.tsx",
  "src/app/_layout.tsx",
  "src/app/(tabs)/_layout.tsx",
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
check("P2.12 integration TS/TSX transpiles cleanly", integrationSyntaxOk);

console.log(`\nFamily Bloom P2.12 Persistent Surfaces + Retained Graph: ${pass}/${pass + fail} PASS`);
if (fail) process.exit(1);
