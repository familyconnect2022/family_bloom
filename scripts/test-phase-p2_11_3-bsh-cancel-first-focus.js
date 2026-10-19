const fs = require("fs");
const os = require("os");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "family-bloom-p2_11_3-"));
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

console.log("\nP2.11.3 — BSH Cancel-first Focus / Immediate Back\n");

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
check("BSH P2.11.3 pure runtime modules transpile", transpileOk);

const sceneRuntime = require(path.join(outRoot, "src/components/familyGraph/familyGraphSceneBuilder.js"));
const cacheRuntime = require(path.join(outRoot, "src/components/familyGraph/familyGraphBshCache.js"));
const {
  buildFamilyGraphRenderSceneInterruptible,
  FAMILY_GRAPH_FOCUS_ENTRY_SCALE,
} = sceneRuntime;
const { clearFamilyGraphBshCaches } = cacheRuntime;

const familyId = "fam_p2113";
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
const persons = [
  person("pa", "Parent A", "male", 1900),
  person("pb", "Parent B", "female", 1904),
  person("focus", "Focus", "female", 1930),
  person("partner", "Partner", "male", 1928),
];
const relationships = [pt("pa", "pb"), pc("pa", "focus"), pc("pb", "focus"), pt("focus", "partner")];
let previousA = "focus";
let previousB = "partner";
for (let i = 0; i < 24; i += 1) {
  const id = `g${i}`;
  persons.push(person(id, `Generation ${i}`, i % 2 ? "female" : "male", 1950 + i));
  relationships.push(pc(previousA, id), pc(previousB, id));
  previousA = id;
  previousB = id;
}
const snapshot = { familyId, persons, relationships };

(async () => {
  clearFamilyGraphBshCaches();
  let cancelled = false;
  const pending = buildFamilyGraphRenderSceneInterruptible(
    snapshot,
    { mode: "focusBranch", focusPersonId: "focus" },
    { isCancelled: () => cancelled },
  );
  // The builder schedules a yield before Stage 1; cancelling on the same event-loop
  // turn must prevent the result from reaching presentation.
  setTimeout(() => { cancelled = true; }, 0);
  const cancelledScene = await pending;
  check("Interruptible Focus build returns null after cancellation", cancelledScene === null);

  const completedScene = await buildFamilyGraphRenderSceneInterruptible(
    snapshot,
    { mode: "focusBranch", focusPersonId: "focus" },
    { isCancelled: () => false },
  );
  check("Interruptible Focus build still produces a valid Scene", !!completedScene && completedScene.focusPersonId === "focus");
  check("Cancel-first path preserves the 95% Focus camera contract", completedScene?.initialCamera?.scale === FAMILY_GRAPH_FOCUS_ENTRY_SCALE && FAMILY_GRAPH_FOCUS_ENTRY_SCALE === 0.95);

  const graph = read("src/components/familyGraph/FamilyGraphPrototype.tsx");
  const screen = read("src/app/(family)/(graph)/family-graph.tsx");
  const sceneSource = read("src/components/familyGraph/familyGraphSceneBuilder.ts");
  const pkg = JSON.parse(read("package.json"));
  const clean = read("scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat");
  const debug = read("scripts/android/dev/Family_Bloom_Android_Debug_Build_And_Run.bat");
  const release = read("scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat");

  const closeStart = graph.indexOf("const closeFocusOverlay = useCallback");
  const closeEnd = graph.indexOf("useEffect(() => {", closeStart);
  const closeBlock = graph.slice(closeStart, closeEnd);
  check("Back invalidates unfinished Focus request before presentation hide", closeBlock.includes("if (!focusOverlay.visual)") && closeBlock.includes("focusVisualRequestRef.current += 1") && closeBlock.indexOf("focusVisualRequestRef.current += 1") < closeBlock.indexOf("setFocusOverlayVisible(false)"));
  check("Back cancels unfinished scheduled Focus work before hide", closeBlock.includes("cancelFocusScheduledWork()") && closeBlock.indexOf("cancelFocusScheduledWork()") < closeBlock.indexOf("setFocusOverlayVisible(false)"));
  check("Back immediately hides Focus without session teardown", closeBlock.includes("setFocusOverlayVisible(false)") && !closeBlock.includes("setFocusOverlay(null)") && !closeBlock.includes("withTiming("));
  check("Back cancels in-flight UI animations instead of waiting", closeBlock.includes("cancelAnimation(focusOverlayProgress)") && closeBlock.includes("cancelAnimation(focusOverlayContentProgress)"));
  check("Android hardware Back uses the same immediate close path", graph.includes('BackHandler.addEventListener("hardwareBackPress"') && graph.includes("closeFocusOverlay();") && graph.includes("return true;"));
  check("Route-local Focus owns immediate dismissal without root-rail handoff", graph.includes("<PersistentFocusOverlayPresentation") && graph.includes("onClose={closeFocusOverlay}") && !graph.includes("publishFamilyGraphFocusSurface") && !graph.includes("hideBloomFocusSurface()"));
  check("Header Back button uses the same immediate close path", graph.includes('accessibilityLabel="Trở về cây phả hệ"') && graph.includes("onPress={onClose}") && (graph.includes("onClose={closeFocusOverlay}") || graph.includes("onClose: closeFocusOverlay")));

  check("Focus work registry owns RAF and timers", graph.includes("focusScheduledFramesRef") && graph.includes("focusScheduledTimersRef") && graph.includes("scheduleFocusFrame") && graph.includes("scheduleFocusTimer"));
  check("Focus cancellation clears registered RAF and timers", graph.includes("cancelAnimationFrame(frameId)") && graph.includes("clearTimeout(timerId)"));
  check("Focus cancellation marks active BSH build token cancelled", graph.includes("if (token) token.cancelled = true") && graph.includes("focusBuildTokenRef.current = null"));
  check("Route/unmount also cancels Focus work", graph.includes("Route/unmount is cancellation too") && graph.includes("cancelFocusScheduledWork();"));

  const hydrateStart = graph.indexOf("const hydrateFocusOverlayVisual = useCallback(async");
  const hydrateEnd = graph.indexOf("const handleFocusOverlayVisualReady", hydrateStart);
  const hydrateBlock = graph.slice(hydrateStart, hydrateEnd);
  check("Focus hydration is asynchronous and cancellation-aware", hydrateBlock.includes("await Promise.resolve") && hydrateBlock.includes("FamilyGraphBuildCancellation") && hydrateBlock.includes("cancellation.isCancelled()"));
  check("Cancelled hydration cannot commit stale Scene state", hydrateBlock.indexOf("if (cancellation.isCancelled()) return") < hydrateBlock.indexOf("setFocusOverlay((current)"));
  check("Heavy Scene mount is non-urgent and Back-preemptible", hydrateBlock.includes("startTransition(() =>") && hydrateBlock.includes("setFocusOverlay((current)"));

  check("Screen uses interruptible BSH builder for Focus", screen.includes("buildFamilyGraphRenderSceneInterruptible") && screen.includes("cancellation?: FamilyGraphBuildCancellation"));
  check("Full-tree BSH is deferred off the route first-paint path", screen.includes("requestAnimationFrame(() =>") && screen.includes("buildFamilyGraphRenderSceneInterruptible(") && !screen.includes("buildFamilyGraphRenderScene(snapshot, { mode: \"fullTree\""));
  check("Interruptible BSH yields between stages", (sceneSource.match(/await yieldFamilyGraphBuild\(\)/g) || []).length >= 3);
  check("Interruptible BSH checks cancellation around every stage", (sceneSource.match(/if \(cancelled\(\)\) return null;/g) || []).length >= 5);
  check("Completed BSH stages remain cacheable after presentation cancellation", sceneSource.includes("Completed stages may stay cached") && sceneSource.includes("cache correctness is revision-keyed"));

  const shownStart = graph.indexOf("const handleFocusOverlayShown = useCallback");
  const shownEnd = graph.indexOf("const handoffPersonSheetToFocus", shownStart);
  const shownBlock = graph.slice(shownStart, shownEnd);
  check("Initial Focus hydration continuation is registered/cancellable", shownBlock.includes("scheduleFocusFrame") && !shownBlock.includes("setTimeout("));

  const switchStart = graph.indexOf("const handleFocusOverlayPersonRequest = useCallback");
  const switchEnd = graph.indexOf("const handleScale", switchStart);
  const switchBlock = graph.slice(switchStart, switchEnd);
  check("A-to-B Focus switch cancels prior work first", switchBlock.includes("cancelFocusScheduledWork()") && switchBlock.indexOf("cancelFocusScheduledWork()") < switchBlock.indexOf("focusVisualRequestRef.current = requestId"));
  check("A-to-B Focus switch keeps cancellation-aware continuation without timer gate", (switchBlock.includes("scheduleFocusFrame") || switchBlock.includes("requestAnimationFrame(")) && !switchBlock.includes("scheduleFocusTimer("));

  check("P2.11.3 package gate is registered", pkg.scripts?.["phaseP2_11_3:check"] === "node ./scripts/test-phase-p2_11_3-bsh-cancel-first-focus.js");
  check("Copy-over updater invokes P2.11.3 gate", clean.includes("test-phase-p2_11_3-bsh-cancel-first-focus.js"));
  check("Debug Android build invokes P2.11.3 gate", debug.includes("npm run phaseP2_11_3:check"));
  check("Release Android build invokes P2.11.3 gate", release.includes("npm run phaseP2_11_3:check"));

  const integrationFiles = [
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
  check("P2.11.3 integration TS/TSX transpiles cleanly", integrationSyntaxOk);

  console.log(`\nFamily Bloom P2.11.3 Cancel-first Focus: ${pass}/${pass + fail} PASS`);
  if (fail) process.exit(1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
