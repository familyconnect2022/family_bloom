const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(process.argv[2] || process.cwd());
let pass = 0;
let fail = 0;
const results = [];
const record = (name, ok, detail = '') => {
  (ok ? pass++ : fail++);
  results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const hasAll = (text, parts) => parts.every(part => text.includes(part));

const graph = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const surfaceStore = read('src/services/presentation/bloomSurfaceStackStore.ts');
const surfaceStack = read('src/components/system/BloomSurfaceStack.tsx');
const rootLayout = read('src/app/_layout.tsx');
const route = read('src/app/(family)/(graph)/family-graph.tsx');
const pkg = JSON.parse(read('package.json'));

record('focus-root-surface-preserved-with-persistent-successor', ((hasAll(surfaceStack, ['FamilyGraphFocusSurfaceHost', '{snapshot.content}', 'pointerEvents={snapshot.visible ? "box-none" : "none"}'])) || (graph.includes('visible={focusOverlayVisible}') && graph.includes('onRequestClose={closeFocusOverlay}'))) && rootLayout.includes('<BloomSurfaceStack') && !route.includes('FamilyGraphFocusPortalProvider') && graph.includes('focusOverlayModalRoot'));
record('focus-size-remains-full-window-oriented', hasAll(graph, [
  'const screen = Dimensions.get("window")',
]) && (hasAll(graph, [
  'x: screen.width * 0.1', 'y: screen.height * 0.1',
  'width: screen.width * 0.8', 'height: screen.height * 0.8',
]) || hasAll(graph, [
  'FOCUS_OVERLAY_HORIZONTAL_MARGIN_RATIO = 0.035',
  'FOCUS_OVERLAY_VERTICAL_MARGIN_RATIO = 0.04',
  'width: screen.width * (1 - FOCUS_OVERLAY_HORIZONTAL_MARGIN_RATIO * 2)',
  'height: screen.height * (1 - FOCUS_OVERLAY_VERTICAL_MARGIN_RATIO * 2)',
])));
record('node-origin-converted-to-window-coordinates', hasAll(graph, [
  'hostFrame.x + source.centerX', 'hostFrame.y + source.centerY',
]));
record('distance-normalized-smooth-duration-or-stable-successor', (graph.includes('travelRatio') && (graph.includes('durationMs = Math.round(520 + travelRatio * 110)') || graph.includes('durationMs = Math.round(230 + travelRatio * 50)')) && graph.includes('Easing.bezier(0.16, 1, 0.3, 1)')) || graph.includes('P2.11.2: the Focus graph surface is geometrically stable'));
record('point-to-card-entry-contract-preserved-or-stabilized', (graph.includes('focusOverlayProgress.value = 0') && graph.includes('focusOverlayProgress.value = withTiming(') && (graph.includes('{ scale: progress }') || graph.includes('{ scale: 0.985 + 0.015 * progress }'))) || graph.includes('transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }]'));
record('exit-remains-explicit-or-static-surface', hasAll(graph, ['opacity: progress','focusOverlayProgress.value = withTiming(']) || hasAll(graph, ['const fadeWindow = 0.22', 'progress >= fadeWindow ? 1 : progress / fadeWindow','rawOpacity * rawOpacity * (3 - 2 * rawOpacity)']) || (graph.includes('duration: 90') && graph.includes('geometrically stable')) || ((graph.includes('focusSurface.hide()') || graph.includes('setFocusOverlayVisible(false)')) && graph.includes('cancelAnimation(focusOverlayProgress)')));
record('close-detaches-before-any-teardown', ((graph.includes('setFocusOverlayVisible(false)') || graph.includes('focusSurface.hide()')) && !graph.slice(graph.indexOf('const closeFocusOverlay'), graph.indexOf('useEffect(() => {', graph.indexOf('const closeFocusOverlay'))).includes('setFocusOverlay(null)')) || (hasAll(graph, ['if (finished) runOnJS(clearFocusOverlay)()', 'setFocusOverlay(null)'])));
record('double-close-guarded', hasAll(graph, [
  'focusOverlayClosingRef.current',
  'if (!focusOverlay || focusOverlayClosingRef.current) return',
]));
record('simple-dim-overlay-no-blur', hasAll(graph, [
  'backgroundColor: "rgba(55,36,45,0.11)"',
  'No blur/filter is used',
]) && !graph.includes('expo-blur'));
record('single-header-close-control', hasAll(graph, [
  'accessibilityLabel="Trở về cây phả hệ"', 'onPress={onClose}', '>Trở về</Text>', 'onClose={closeFocusOverlay}',
]) && !graph.includes('accessibilityLabel="Đóng xem nhánh"') && !graph.includes('styles.focusOverlayClose'));
record('focus-locate-targets-current-person', hasAll(graph, [
  'accessibilityLabel="Định vị người đang xem"',
  'const targetId = viewAnchorPersonId ?? initialFocusId',
  'centerOnPerson(targetId, targetScale)',
]) && !graph.includes('accessibilityLabel="Định vị toàn nhánh"'));
record('one-overlay-a-to-b-preserved', hasAll(graph, [
  'const handleFocusOverlayPersonRequest = useCallback',
  'personId,', 'visual: null', 'hydrateFocusOverlayVisual(personId, requestId)',
]) && !graph.includes('history: string[]'));
record('pinch-pan-still-available', hasAll(graph, ['Gesture.Simultaneous(panGesture, pinchGesture)']));
record('background-mode-buttons-disabled', (graph.match(/disabled=\{focusOverlayVisible\}/g) || []).length >= 3 || (graph.match(/disabled=\{!!focusOverlay\}/g) || []).length >= 3);
record('background-canvas-shielded-without-mutation', graph.includes('focusMode={false}') && graph.includes('focusOverlayShield') && (surfaceStack.includes('pointerEvents={snapshot.visible ? "box-none" : "none"}') || graph.includes('visible={focusOverlayVisible}')));
record('full-branch-loading-shell-preserved', hasAll(graph, ['focusOverlayPreparingLayer', 'Đang chuẩn bị nhánh…']) || hasAll(graph, ['Đang chuẩn bị nhánh của {focusOverlay.personName}…', 'đang lấy toàn bộ nhánh từ phả hệ']));
record('phase14j-script-registered', pkg.scripts?.['phase14j:check'] === 'node ./scripts/test-phase14j-fullscreen-focus-locate.js');

const collect = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return collect(full);
  return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
});
const tsFiles = collect(path.join(root, 'src'));
let syntaxFails = 0;
for (const file of tsFiles) {
  const result = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
    reportDiagnostics: true,
    fileName: file,
  });
  if ((result.diagnostics || []).some(d => d.category === ts.DiagnosticCategory.Error)) syntaxFails++;
}
record('ts-tsx-syntax', syntaxFails === 0, `${tsFiles.length - syntaxFails}/${tsFiles.length}`);

console.log(`Phase14J Full-screen Focus + Locate: ${pass} PASS / ${fail} FAIL`);
for (const line of results) console.log(line);
if (fail) process.exit(1);
