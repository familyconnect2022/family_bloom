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
const pkg = JSON.parse(read('package.json'));

record('native-modal-portal-preserved', hasAll(graph, [
  '<Modal', 'transparent', 'statusBarTranslucent', 'hardwareAccelerated', 'focusOverlayModalRoot',
]));
record('focus-size-is-80-percent-full-window', hasAll(graph, [
  'const screen = Dimensions.get("window")',
  'x: screen.width * 0.1', 'y: screen.height * 0.1',
  'width: screen.width * 0.8', 'height: screen.height * 0.8',
]));
record('node-origin-converted-to-window-coordinates', hasAll(graph, [
  'hostFrame.x + source.centerX', 'hostFrame.y + source.centerY',
]));
record('distance-normalized-smooth-duration', hasAll(graph, [
  'travelRatio', 'durationMs = Math.round(520 + travelRatio * 110)',
  'Easing.bezier(0.16, 1, 0.3, 1)',
]));
record('point-to-card-scale-zero-to-one', hasAll(graph, [
  '{ scale: progress }', 'focusOverlayProgress.value = 0', 'focusOverlayProgress.value = withTiming(',
]));
record('opacity-fades-only-near-zero', hasAll(graph, [
  'const fadeWindow = 0.22', 'progress >= fadeWindow ? 1 : progress / fadeWindow',
  'rawOpacity * rawOpacity * (3 - 2 * rawOpacity)',
]));
record('close-reaches-zero-before-unmount', hasAll(graph, [
  'Keep the whole Focus View mounted until scale reaches zero',
  'if (finished) runOnJS(clearFocusOverlay)()',
  'setFocusOverlay(null)',
]));
record('double-close-guarded', hasAll(graph, [
  'focusOverlayClosingRef.current',
  'if (!focusOverlay || focusOverlayClosingRef.current) return',
]));
record('simple-dim-overlay-no-blur', hasAll(graph, [
  'backgroundColor: "rgba(55,36,45,0.11)"',
  'No blur/filter is used',
]) && !graph.includes('expo-blur'));
record('single-header-close-control', hasAll(graph, [
  'accessibilityLabel="Trở về cây phả hệ"', 'onPress={closeFocusOverlay}', '>Trở về</Text>',
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
record('background-mode-buttons-disabled', (graph.match(/disabled=\{!!focusOverlay\}/g) || []).length >= 3);
record('background-canvas-frozen', hasAll(graph, ['pointerEvents={focusOverlay ? "none" : "auto"}', 'focusMode={false}']));
record('full-branch-loading-shell-preserved', hasAll(graph, ['Đang chuẩn bị nhánh của {focusOverlay.personName}…', 'đang lấy toàn bộ nhánh từ phả hệ']));
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
