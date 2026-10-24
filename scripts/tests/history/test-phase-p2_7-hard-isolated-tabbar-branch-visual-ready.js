const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__legacyScriptsDir, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
let pass = 0; let fail = 0;
const check = (label, ok, detail = '') => {
  const index = String(pass + fail + 1).padStart(2, '0');
  if (ok) { pass++; console.log(`PASS ${index} - ${label}`); }
  else { fail++; console.error(`FAIL ${index} - ${label}${detail ? ` :: ${detail}` : ''}`); }
};

console.log('\nP2.7 — Hard-Isolated TabBar + Branch Visual-Ready\n');

const tabs = read('src/app/(tabs)/_layout.tsx');
const graph = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const pkg = JSON.parse(read('package.json'));
const cleanBat = read('scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat');
const debugBat = read('scripts/android/dev/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat');

const visualHostStart = tabs.indexOf('function PersistentBloomTabBarHost()');
const visualHostEnd = tabs.indexOf('/**\n * Zero-view navigator bridge', visualHostStart);
const visualHost = tabs.slice(visualHostStart, visualHostEnd);
const bridgeStart = tabs.indexOf('function TabNavigatorControllerBridge');
const bridgeEnd = tabs.indexOf('function TabNavigatorFocusBridge', bridgeStart);
const bridge = tabs.slice(bridgeStart, bridgeEnd);
const workspaceStart = tabs.indexOf('function TabWorkspace()');
const workspaceEnd = tabs.indexOf('export default function TabLayout', workspaceStart);
const workspace = tabs.slice(workspaceStart, workspaceEnd);

check('Visual tabbar is a persistent sibling of Tabs', workspace.indexOf('<Tabs') >= 0 && workspace.indexOf('<PersistentBloomTabBarHost />') > workspace.indexOf('</Tabs>'));
check('Tabs.tabBar renders only the zero-view controller bridge', workspace.includes('tabBar={(props) => (') && workspace.includes('<TabNavigatorControllerBridge') && !workspace.includes('<PersistentBloomTabBarHost') === false);
check('Navigator controller bridge owns no native view', bridge.includes('return null;'));
check('Visual host receives no navigation state/descriptors props', visualHost.includes('function PersistentBloomTabBarHost()') && !visualHost.includes('{ state,') && !visualHost.includes('descriptors'));
check('Navigator state crosses boundary through imperative controller only', tabs.includes('class PersistentTabBarController') && bridge.includes('persistentTabBarController.updateNavigator(state, navigation)'));
check('Route commit signal mutates SharedValues/refs without React setState', tabs.includes('registerCommitListener') && visualHost.includes('indicatorIndex.value = index') && visualHost.includes('visualTargetIndex.value = index') && !visualHost.includes('useState('));
check('Tab pill still uses UI-thread Reanimated timing', visualHost.includes('indicatorIndex.value = withTiming(index'));
check('Different-tab scene commit waits until visual pill completes', visualHost.includes('pendingCommitDelayRef.current = animateIndicatorTo(index)') && visualHost.includes('pendingCommitDelayRef.current + 8') && visualHost.includes('setTimeout(() =>'));
check('Stale rapid taps cannot commit old scenes', visualHost.includes('commitGenerationRef.current !== generation') && visualHost.includes('clearTimeout(pendingCommitTimerRef.current)'));
check('Tabbar is isolated into a small Android hardware texture', visualHost.includes('renderToHardwareTextureAndroid'));
check('Feature lifecycle restore is deferred beyond pill animation', bridge.includes('TAB_LIFECYCLE_SETTLE_MS') && bridge.includes('tabRuntime.restoreFocus(tabId)'));
check('Idle hidden-tab prewarm stays in zero-view bridge', bridge.includes('navigationRef.current.preload') && bridge.includes('priority: "IDLE"'));
check('Feature scenes remain motion-free and frozen', tabs.includes('freezeOnBlur: true') && tabs.includes('animation: BLOOM_MOTION.tabs.animation'));
check('Cold-start active-only lazy mount is preserved', tabs.includes('lazy: true') && tabs.includes('detachInactiveScreens={false}'));

check('Focus overlay has an explicit visualReady state', graph.includes('visualReady: boolean;'));
check('Focus branch no longer bypasses progressive batching', !graph.includes('if (surfaceMode === "focusOverlay" || viewMode !== "all") return progressivePeople;'));
check('Focus child exposes visual-ready callback', graph.includes('onVisualReady?: () => void;') && (graph.includes('onVisualReady={() => handleFocusOverlayVisualReady(focusOverlay.requestId)}') || graph.includes('onVisualReady={() => onVisualReady(requestId)}')));
check('Visual-ready keeps progressive-mount safety or successor bounded-first-paint gate', graph.includes('if (renderedPeople.length < progressivePeople.length) return;') || (graph.includes('firstUsefulBatch') && graph.includes('renderedPeople.length < firstUsefulBatch')) || (graph.includes('viewportPersonIds.has(focusAnchorId)') && graph.includes('for (const personId of focusBootstrapPersonIds)')) || (graph.includes('P2.11.2 BSH first-paint contract') && graph.includes('!scene || !scene.focusPersonId')));
check('Visual-ready waits for measured viewport and initial camera fit', graph.includes('if (viewport.width <= 0 || viewport.height <= 0) return;') && graph.includes('if (!hasCenteredInitially.current) return;'));
check('Visual-ready waits two presentation frames after final commit', graph.includes('const firstFrame = requestAnimationFrame(() =>') && graph.includes('secondFrame = requestAnimationFrame(() =>'));
check('Preparing layer stays above the hidden graph until ready', graph.includes('focusOverlayPreparingLayer') && graph.includes('opacity: 1 - focusOverlayContentProgress.value'));
check('Branch graph has stable scene identity while stale sessions cannot replace it', graph.includes('key={visual.sceneKey}') && graph.includes('focusVisualRequestRef.current !== requestId'));
check('Ready callback rejects stale or closing requests', graph.includes('focusVisualRequestRef.current !== requestId || focusOverlayClosingRef.current'));
check('Close invalidates pending branch work before presentation detach', (graph.includes('focusVisualRequestRef.current += 1;') && graph.indexOf('focusVisualRequestRef.current += 1;', graph.indexOf('const closeFocusOverlay')) < graph.indexOf('setFocusOverlayVisible(false)', graph.indexOf('const closeFocusOverlay')) && graph.includes('cancelFocusScheduledWork()')) || (graph.includes('focusOverlayProgress.value = withTiming') && graph.indexOf('focusVisualRequestRef.current += 1;', graph.indexOf('const closeFocusOverlay')) < graph.indexOf('focusOverlayProgress.value = withTiming', graph.indexOf('const closeFocusOverlay'))));
check('Focus close never collapses card scale to zero', (graph.includes('{ scale: 0.985 + 0.015 * progress }') || graph.includes('transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }]')) && !graph.includes('{ scale: progress }'));
check('Focus close uses a non-collapsing persistent detach contract', (graph.includes('duration: 185') && graph.includes('opacity: progress')) || (graph.includes('duration: 90') && graph.includes('geometrically stable')) || ((graph.includes('focusSurface.hide()') || graph.includes('setFocusOverlayVisible(false)')) && graph.includes('cancelAnimation(focusOverlayProgress)') && !graph.slice(graph.indexOf('const closeFocusOverlay'), graph.indexOf('useEffect(() => {', graph.indexOf('const closeFocusOverlay'))).includes('setFocusOverlay(null)')));
check('Initial focus preparation remains visible without hiding the graph', graph.includes('focusOverlayContentProgress.value = 0;') && graph.includes('Đang chuẩn bị cây…') && graph.includes('never hide the prepared graph behind readiness'));
check('A-to-B branch switch resets visual readiness', graph.includes('visualReady: false') && graph.includes('focusOverlayContentProgress.value = 0;'));
check('Focus geometry remains large-screen oriented after successor sizing', (graph.includes('x: screen.width * 0.1') && graph.includes('width: screen.width * 0.8')) || (graph.includes('FOCUS_OVERLAY_HORIZONTAL_MARGIN_RATIO = 0.035') && graph.includes('FOCUS_OVERLAY_VERTICAL_MARGIN_RATIO = 0.04')) || (graph.includes('FOCUS_OVERLAY_SCREEN_RATIO = 0.85') && graph.includes('windowWidth * FOCUS_OVERLAY_SCREEN_RATIO') && graph.includes('windowHeight * FOCUS_OVERLAY_SCREEN_RATIO')));

const changedTs = [
  'src/app/(tabs)/_layout.tsx',
  'src/components/familyGraph/FamilyGraphPrototype.tsx',
];
let changedSyntaxOk = true;
for (const file of changedTs) {
  const out = ts.transpileModule(read(file), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    reportDiagnostics: true,
    fileName: file,
  });
  if ((out.diagnostics || []).some((d) => d.category === ts.DiagnosticCategory.Error)) changedSyntaxOk = false;
}
check('Changed TypeScript/TSX transpiles cleanly', changedSyntaxOk);

const sourceFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) sourceFiles.push(full);
  }
};
walk(path.join(root, 'src'));
let allSyntaxOk = true;
for (const full of sourceFiles) {
  const rel = path.relative(root, full);
  const out = ts.transpileModule(fs.readFileSync(full, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    reportDiagnostics: true,
    fileName: rel,
  });
  if ((out.diagnostics || []).some((d) => d.category === ts.DiagnosticCategory.Error)) {
    allSyntaxOk = false;
    break;
  }
}
check(`Whole src tree transpiles cleanly (${sourceFiles.length} TS/TSX)`, allSyntaxOk);

check('P2.7 gate is registered', pkg.scripts?.['phaseP2_7:check'] === 'node ./scripts/tests/history/test-phase-p2_7-hard-isolated-tabbar-branch-visual-ready.js');
check('Copy-over updater runs P2.7 gate', cleanBat.includes('test-phase-p2_7-hard-isolated-tabbar-branch-visual-ready.js'));
check('Debug Android build runs P2.7 gate', debugBat.includes('phaseP2_7:check'));
check('Release Android build runs P2.7 gate', releaseBat.includes('phaseP2_7:check'));

console.log(`\nFamily Bloom P2.7 Hard-Isolated TabBar + Branch Visual-Ready: ${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
