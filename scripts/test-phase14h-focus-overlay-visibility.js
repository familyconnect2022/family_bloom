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

record('android-hardware-blur-layer-removed', !graph.includes('renderToHardwareTextureAndroid={!!focusOverlay}') && !graph.includes('filter: [{ blur: 5 }]'));
record('light-frosted-shield-used', hasAll(graph, [
  'focusOverlayShield',
  'backgroundColor: "rgba(255,248,251,0.20)"',
]));
record('overlay-root-forced-above-frozen-canvas', (
  hasAll(graph, ['<Modal', 'statusBarTranslucent', 'hardwareAccelerated', 'focusOverlayModalRoot'])
  || hasAll(graph, ['zIndex: 300', 'elevation: 50', 'zIndex: 3', 'elevation: 52'])
));
record('visible-back-button-present', hasAll(graph, [
  'accessibilityLabel="Quay lại cây phả hệ"',
  '<Text style={styles.focusOverlayBackText}>Trở lại</Text>',
  'Ionicons name="arrow-back"',
]));
record('android-hardware-back-closes-focus', hasAll(graph, [
  'BackHandler.addEventListener("hardwareBackPress"',
  'closeFocusOverlay();',
  'return true;',
]));
record('outside-shield-can-close-focus', hasAll(graph, [
  'accessibilityLabel="Đóng chế độ xem nhánh"',
  'onPress={closeFocusOverlay}',
  'style={styles.focusOverlayShield}',
]));
record('header-close-remains', hasAll(graph, [
  'accessibilityLabel="Đóng xem nhánh"',
  'Ionicons name="close"',
]));
record('mode-buttons-still-disabled', (graph.match(/disabled=\{!!focusOverlay\}/g) || []).length >= 3);
record('canvas-touch-still-disabled', graph.includes('pointerEvents={focusOverlay ? "none" : "auto"}'));
record('canvas-camera-not-mutated-by-open', (() => {
  const start = graph.indexOf('const handleOpenBranch = useCallback');
  const end = graph.indexOf('const handleFocusOverlayPersonRequest', start);
  const block = start >= 0 && end > start ? graph.slice(start, end) : '';
  return start >= 0 && !block.includes('setPan(') && !block.includes('setScaleValue(') && !block.includes('setViewMode(') && !block.includes('setViewAnchorPersonId(');
})());
record('focus-target-remains-80-percent', hasAll(graph, [
  'width: viewport.width * 0.8',
  'height: viewport.height * 0.8',
]));
record('focus-animation-remains-gradual', hasAll(graph, [
  'focusOverlayStartScale.value = geometry.startScale',
  'focusOverlayProgress.value = withTiming(',
  'Easing.bezier(0.2, 0.82, 0.2, 1)',
]));
record('focus-loading-state-remains', graph.includes('Đang chuẩn bị nhánh của {focusOverlay.personName}…'));
record('phase14h-script-registered', pkg.scripts?.['phase14h:check'] === 'node ./scripts/test-phase14h-focus-overlay-visibility.js');
record('no-new-blur-dependency', !pkg.dependencies?.['expo-blur']);

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

console.log(`Phase14H Focus Overlay Visibility: ${pass} PASS / ${fail} FAIL`);
for (const line of results) console.log(line);
if (fail) process.exit(1);
