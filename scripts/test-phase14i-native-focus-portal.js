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
const screen = read('src/app/family-graph.tsx');
const pkg = JSON.parse(read('package.json'));

record('focus-rendered-in-native-modal-portal', hasAll(graph, [
  '<Modal', 'transparent', 'animationType="none"', 'statusBarTranslucent', 'hardwareAccelerated',
  'focusOverlayModalRoot', 'focusOverlay.hostFrame.x', 'focusOverlay.hostFrame.y',
]));
record('graph-host-measured-in-window', hasAll(graph, [
  'rootRef.current?.measureInWindow', 'rootWindowFrameRef', 'measureRootInWindow',
]));
record('portal-host-is-captured-per-open', hasAll(graph, [
  'hostFrame,', 'mountFocusOverlay(personId, cachedHost)', 'mountFocusOverlay(personId, measured)',
]));
record('focus-card-never-fully-transparent', hasAll(graph, [
  'const focusOverlayAnimatedStyle = useAnimatedStyle', 'opacity: 1',
]));
record('zoom-still-gradual-from-node', hasAll(graph, [
  'focusOverlayStartTranslateX.value = geometry.dx',
  'focusOverlayStartTranslateY.value = geometry.dy',
  'focusOverlayStartScale.value = geometry.startScale',
  'focusOverlayProgress.value = withTiming(',
  'Easing.bezier(0.2, 0.82, 0.2, 1)',
]));
record('focus-target-remains-80-percent', hasAll(graph, [
  'width: viewport.width * 0.8', 'height: viewport.height * 0.8',
]));
record('light-separation-veil-only', hasAll(graph, [
  'backgroundColor: "rgba(255,248,251,0.20)"',
  'No live GPU blur is used',
]));
record('back-and-close-controls-visible', hasAll(graph, [
  'accessibilityLabel="Quay lại cây phả hệ"',
  '<Text style={styles.focusOverlayBackText}>Trở lại</Text>',
  'accessibilityLabel="Đóng xem nhánh"',
]));
record('hardware-back-closes-focus', hasAll(graph, [
  'BackHandler.addEventListener("hardwareBackPress"', 'closeFocusOverlay();', 'return true;',
]));
record('outside-tap-closes-focus', hasAll(graph, [
  'accessibilityLabel="Đóng chế độ xem nhánh"', 'style={styles.focusOverlayShield}', 'onPress={closeFocusOverlay}',
]));
record('3-5-all-disabled-while-focus-open', (graph.match(/disabled=\{!!focusOverlay\}/g) || []).length >= 3);
record('background-canvas-touch-disabled', graph.includes('pointerEvents={focusOverlay ? "none" : "auto"}'));
record('background-lines-never-enter-focus-mode', graph.includes('focusMode={false}'));
record('legacy-branch-banner-absent', !graph.includes('Nhánh đang xem:'));
record('focus-loading-shell-present', hasAll(graph, [
  'Đang chuẩn bị nhánh của {focusOverlay.personName}…',
  'đang lấy toàn bộ nhánh từ phả hệ',
]));
record('full-branch-still-independent-of-canvas-mode', hasAll(screen, [
  'const fullDepth = Math.max(1, snapshot.persons.length)',
  'maxPeople: Math.max(1, snapshot.persons.length)',
  'const cacheKey = `full:${focusPersonId}`',
]));
record('single-overlay-a-to-b-preserved', hasAll(graph, [
  'handleFocusOverlayPersonRequest', 'One overlay only', 'visual: null',
]));
record('top-wrench-remains-removed', !screen.includes('construct-outline') && !screen.includes('accessibilityLabel="Quản lý phả hệ"'));
record('lower-add-person-remains', hasAll(graph, [
  'accessibilityLabel="Thêm người vào phả hệ"', '<Text style={styles.addPersonText}>Thêm</Text>',
]));
record('no-new-native-dependency', !pkg.dependencies?.['expo-blur']);
record('phase14i-script-registered', pkg.scripts?.['phase14i:check'] === 'node ./scripts/test-phase14i-native-focus-portal.js');

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

console.log(`Phase14I Native Focus Portal: ${pass} PASS / ${fail} FAIL`);
for (const line of results) console.log(line);
if (fail) process.exit(1);
