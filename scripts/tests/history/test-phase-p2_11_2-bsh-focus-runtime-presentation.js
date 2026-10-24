const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
const fs = require("fs");
const os = require("os");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__legacyScriptsDir, "..");
const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "family-bloom-p2_11_2-"));
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

console.log("\nP2.11.2 — BSH Focus Runtime / Presentation\n");

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
  "src/components/familyGraph/familyGraphViewport.ts",
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
check("BSH P2.11.2 pure runtime modules transpile", transpileOk);

const sceneRuntime = require(path.join(outRoot, "src/components/familyGraph/familyGraphSceneBuilder.js"));
const cacheRuntime = require(path.join(outRoot, "src/components/familyGraph/familyGraphBshCache.js"));
const viewportRuntime = require(path.join(outRoot, "src/components/familyGraph/familyGraphViewport.js"));
const {
  buildFamilyGraphRenderScene,
  FAMILY_GRAPH_SCENE_VERSION,
  FAMILY_GRAPH_FOCUS_ENTRY_SCALE,
  FAMILY_GRAPH_FOCUS_ENTRY_VIEWPORT_Y,
} = sceneRuntime;
const {
  clearFamilyGraphBshCaches,
  hydrateFamilyGraphRuntimeState,
  retainFamilyGraphRuntimePersonIds,
  updateFamilyGraphRuntimeCamera,
} = cacheRuntime;
const {
  getFamilyGraphPanForAnchor,
  mapFamilyGraphCanvasPointToViewport,
} = viewportRuntime;

const familyId = "fam_p2112";
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
    person("parentA", "Ancestor A", "male", 1900),
    person("parentB", "Ancestor B", "female", 1904),
    person("focus", "Focus Person", "female", 1930),
    person("partner", "Partner", "male", 1928),
    person("child", "Child", "female", 1955),
    person("grandchild", "Grandchild", "male", 1980),
  ],
  relationships: [
    pt("parentA", "parentB"),
    pc("parentA", "focus"), pc("parentB", "focus"),
    pt("focus", "partner"), pc("focus", "child"), pc("partner", "child"),
    pc("child", "grandchild"),
  ],
};

clearFamilyGraphBshCaches();
const scene = buildFamilyGraphRenderScene(snapshot, { mode: "focusBranch", focusPersonId: "focus" });
check("P2.11.2 bumps Scene version to invalidate old Focus runtime camera", FAMILY_GRAPH_SCENE_VERSION >= 2 && scene.sceneVersion === FAMILY_GRAPH_SCENE_VERSION);
check("Focus entry scale remains readable 95%, not fit-all", FAMILY_GRAPH_FOCUS_ENTRY_SCALE === 0.95 && scene.initialCamera?.scale === 0.95);
check("Focus entry anchor remains 42% graph viewport height", FAMILY_GRAPH_FOCUS_ENTRY_VIEWPORT_Y === 0.42 && scene.initialCamera?.viewportAnchor.y === 0.42);

let runtime = hydrateFamilyGraphRuntimeState(scene.sceneKey, scene.bootstrapPersonIds);
check("Fresh scene has no restorable runtime camera", runtime.camera === null && runtime.userCameraValid === false);
retainFamilyGraphRuntimePersonIds(scene.sceneKey, ["child", "grandchild"]);
runtime = hydrateFamilyGraphRuntimeState(scene.sceneKey, scene.bootstrapPersonIds);
check("Retained-node hydration cannot accidentally validate a camera", runtime.camera === null && runtime.userCameraValid === false && runtime.retainedPersonIds.has("grandchild"));
updateFamilyGraphRuntimeCamera(scene.sceneKey, { centerX: 777, centerY: 999, scale: 1.12 });
runtime = hydrateFamilyGraphRuntimeState(scene.sceneKey, scene.bootstrapPersonIds);
check("Only explicit runtime-camera update creates a restorable user camera", runtime.userCameraValid === true && runtime.camera?.centerX === 777 && runtime.camera?.scale === 1.12);

const viewport = { width: 1000, height: 1500 };
const initial = scene.initialCamera;
const target = {
  x: viewport.width * initial.viewportAnchor.x,
  y: viewport.height * initial.viewportAnchor.y,
};
const pan = getFamilyGraphPanForAnchor({
  canvasPoint: initial.canvasPoint,
  viewportPoint: target,
  scale: initial.scale,
  canvasWidth: scene.canvasWidth,
  canvasHeight: scene.canvasHeight,
});
const mapped = mapFamilyGraphCanvasPointToViewport({
  point: initial.canvasPoint,
  transform: { translateX: pan.x, translateY: pan.y, scale: initial.scale },
  canvasWidth: scene.canvasWidth,
  canvasHeight: scene.canvasHeight,
});
check("Scene camera round-trip places Focus exactly at horizontal center", Math.abs(mapped.x - viewport.width * 0.5) < 0.001);
check("Scene camera round-trip places Focus exactly at 42% viewport height", Math.abs(mapped.y - viewport.height * 0.42) < 0.001);

const graph = read("src/components/familyGraph/FamilyGraphPrototype.tsx");
const cacheSource = read("src/components/familyGraph/familyGraphBshCache.ts");
const sceneSource = read("src/components/familyGraph/familyGraphSceneBuilder.ts");
const pkg = JSON.parse(read("package.json"));
const clean = read("scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat");
const debug = read("scripts/android/dev/Family_Bloom_Android_Debug_Build_And_Run.bat");
const release = read("scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat");

check("Runtime cache stores explicit userCameraValid metadata", cacheSource.includes("userCameraValid: boolean") && cacheSource.includes("cached.userCameraValid ? cached.camera : null"));
check("Automatic camera snapshots are guarded from runtime persistence", graph.includes('surfaceMode === "focusOverlay" && userCameraInteractedRef.current') && graph.includes("updateFamilyGraphRuntimeCamera(scene.sceneKey, next)"));
check("Pan explicitly marks user camera interaction", graph.includes("Gesture.Pan()") && graph.includes("runOnJS(markUserCameraInteraction)()"));
check("Pinch explicitly marks user camera interaction", graph.includes("Gesture.Pinch()") && graph.match(/runOnJS\(markUserCameraInteraction\)\(\)/g)?.length >= 2);
check("Gesture finalization persists exact final transform", graph.match(/runOnJS\(commitUserCameraTransform\)\(activeCameraTranslateX\.value, activeCameraTranslateY\.value, activeCameraScale\.value\)/g)?.length >= 2);
check("First-entry camera only hydrates a validated user camera", graph.includes("runtimeHydrationRef.current?.userCameraValid") && graph.includes("? runtimeHydrationRef.current.camera"));
check("GraphScene camera remains the fallback before fit-all logic", graph.indexOf("if (scene?.initialCamera)") > graph.indexOf("const hydratedRuntimeCamera") && graph.indexOf("if (scene?.initialCamera)") < graph.indexOf("if (autoFitOnMount && visiblePeople.length)"));

const readyStart = graph.indexOf("// P2.11.2 BSH first-paint contract");
const readyEnd = graph.indexOf("// P2.8: kinship resolution", readyStart);
const readyBlock = graph.slice(readyStart, readyEnd);
check("Focus readiness is independent from viewport culling sets", !readyBlock.includes("visibleNowPersonIds") && !readyBlock.includes("viewportPersonIds") && !readyBlock.includes("focusBootstrapPersonIds"));
check("Focus readiness waits for prepared Scene + measured viewport + applied camera", readyBlock.includes("scene.focusPersonId") && readyBlock.includes("viewport.width") && readyBlock.includes("hasCenteredInitially.current"));
check("Focus readiness uses a fixed two-frame first-paint gate", (readyBlock.match(/requestAnimationFrame/g) || []).length >= 2);

check("Ready loader unmounts instead of remaining as transparent native layer", graph.includes("{!overlay.visualReady || overlay.loadFailed ? (") && graph.includes(") : null}"));
check("Loader remains non-interactive", graph.includes('pointerEvents="none"'));
check("Loader no longer uses Android elevation", graph.includes("focusOverlayPreparingLayer: { ...StyleSheet.absoluteFillObject, zIndex: 2 }") && !graph.includes("focusOverlayPreparingLayer: { ...StyleSheet.absoluteFillObject, zIndex: 40, elevation: 40 }"));
check("Focus card stays geometrically fixed during close", graph.includes("transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }]") && graph.includes("geometrically stable"));
check("Focus hydration starts after shell first frame, not after old travel animation", graph.includes("paint the shell first") && !graph.includes("durationMs + 34"));
check("Scene-version bump is encoded in Scene key", sceneSource.includes("FAMILY_GRAPH_SCENE_VERSION =") && sceneSource.includes("`scene${FAMILY_GRAPH_SCENE_VERSION}`"));

check("P2.11.2 package gate is registered", pkg.scripts?.["phaseP2_11_2:check"] === "node ./scripts/tests/history/test-phase-p2_11_2-bsh-focus-runtime-presentation.js");
check("Copy-over updater invokes P2.11.2 gate", clean.includes("test-phase-p2_11_2-bsh-focus-runtime-presentation.js"));
check("Debug Android build invokes P2.11.2 gate", debug.includes("npm run phaseP2_11_2:check"));
check("Release Android build invokes P2.11.2 gate", release.includes("npm run phaseP2_11_2:check"));

const integrationFiles = [
  "src/components/familyGraph/familyGraphBshCache.ts",
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
check("P2.11.2 integration TS/TSX transpiles cleanly", integrationSyntaxOk);

console.log(`\nFamily Bloom P2.11.2 Focus Runtime/Presentation: ${pass}/${pass + fail} PASS`);
if (fail) process.exit(1);
