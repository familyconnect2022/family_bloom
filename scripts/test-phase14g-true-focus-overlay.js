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
const screen = read('src/app/(family)/(graph)/family-graph.tsx');
const pkg = JSON.parse(read('package.json'));

const openStart = graph.indexOf('const handleOpenBranch = useCallback');
const openEnd = graph.indexOf('const handleFocusOverlayPersonRequest', openStart);
const openBlock = openStart >= 0 && openEnd > openStart ? graph.slice(openStart, openEnd) : '';

record('default-canvas-opens-three-generations', graph.includes('useState<ViewMode>(initialViewMode ?? "3")'));
record('linked-user-is-highlight-not-selected-focus', hasAll(graph, [
  'const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)',
  'const [highlightedPersonId, setHighlightedPersonId] = useState<string | null>(initialFocusId)',
  'focused={highlightedPersonId === person.id}',
]));
record('linked-user-centered-on-initial-camera', hasAll(graph, [
  'const personCenterX = person.x + FAMILY_GRAPH_CANVAS.nodeWidth / 2',
  'x: next.width / 2 - canvasCenterX - INITIAL_SCALE * (personCenterX - canvasCenterX)',
]));
record('canvas-lines-never-enter-focus-mode', graph.includes('focusMode={false}'));
record('canvas-active-branch-is-whole-rendered-tree', hasAll(graph, [
  'background canvas never opens/dims a branch',
  'new Set(sourcePeople.map((person) => person.id))',
]));
record('legacy-branch-banner-gone', !graph.includes('Nhánh đang xem:'));
record('open-focus-does-not-change-background-view-mode', !openBlock.includes('setViewMode('));
record('open-focus-does-not-change-background-anchor', !openBlock.includes('setViewAnchorPersonId('));
record('open-focus-does-not-change-background-camera', !openBlock.includes('centerOnPerson(') && !openBlock.includes('setPan(') && !openBlock.includes('setScaleValue('));
record('open-focus-does-not-change-background-selection', !openBlock.includes('setSelectedPersonId('));
record('focus-target-is-80-percent-of-canvas-viewport', hasAll(graph, [
  'x: viewport.x + viewport.width * 0.1',
  'y: viewport.y + viewport.height * 0.1',
  'width: viewport.width * 0.8',
  'height: viewport.height * 0.8',
]));
record('focus-animation-starts-from-tapped-node', hasAll(graph, [
  'lastPressedPersonFrameRef',
  'const source = getPersonScreenFrame(personId)',
  'focusOverlayStartTranslateX.value = geometry.dx',
  'focusOverlayStartTranslateY.value = geometry.dy',
  'focusOverlayStartScale.value = geometry.startScale',
]));
record('focus-animation-distance-normalized', hasAll(graph, [
  'const travelRatio = Math.min(1, Math.hypot(dx, dy)',
  'const durationMs = Math.round(390 + travelRatio * 150)',
  'Easing.bezier(0.2, 0.82, 0.2, 1)',
]));
record('focus-close-animates-back-to-source', hasAll(graph, [
  'focusOverlayProgress.value = withTiming(',
  'Math.max(300, Math.round(focusOverlay.durationMs * 0.9))',
  'runOnJS(clearFocusOverlay)',
]));
record('focus-opens-before-branch-layout', (() => {
  const mountStart = graph.indexOf('const mountFocusOverlay = useCallback');
  const mountEnd = graph.indexOf('const handleOpenBranch = useCallback', mountStart);
  const mountBlock = mountStart >= 0 && mountEnd > mountStart ? graph.slice(mountStart, mountEnd) : openBlock;
  return hasAll(mountBlock, ['visual: null', 'setFocusOverlay({', 'hydrateFocusOverlayVisual(personId, requestId)']);
})());
record('focus-loading-copy', hasAll(graph, [
  'Đang chuẩn bị nhánh của {focusOverlay.personName}…',
  'đang lấy toàn bộ nhánh từ phả hệ',
]));
record('focus-uses-full-family-snapshot-not-canvas-mode', hasAll(screen, [
  'const fullDepth = Math.max(1, snapshot.persons.length)',
  'ancestorDepth: fullDepth',
  'descendantDepth: fullDepth',
  'maxPeople: Math.max(1, snapshot.persons.length)',
  'const cacheKey = `full:${focusPersonId}`',
]));
record('focus-full-branch-independent-of-3-5-all', !screen.slice(screen.indexOf('const getFocusBranchVisual'), screen.indexOf('const deletePerson')).includes('mode ==='));
record('mode-buttons-explicitly-disabled-during-focus', (graph.match(/disabled=\{!!focusOverlay\}/g) || []).length >= 3);
record('background-touch-is-disabled-during-focus', graph.includes('pointerEvents={focusOverlay ? "none" : "auto"}'));
record('background-has-focus-separation-layer', (
  hasAll(graph, ['baseGraphLayerBlurred', 'filter: [{ blur: 5 }]'])
  || hasAll(graph, ['focusOverlayShield', 'rgba(255,248,251,0.20)'])
  || hasAll(graph, ['focusOverlayShield', 'rgba(255,248,251,0.38)'])
));
record('overlay-shield-blocks-canvas-gestures', hasAll(graph, ['focusOverlayShield', '...StyleSheet.absoluteFillObject']));
record('focus-has-own-pan-pinch', hasAll(graph, ['surfaceMode="focusOverlay"', 'Gesture.Simultaneous(panGesture, pinchGesture)', 'autoFitOnMount']));
record('focus-a-to-b-reuses-single-overlay', hasAll(graph, ['handleFocusOverlayPersonRequest', 'One overlay only', 'personId,', 'visual: null']));
record('top-hero-wrench-removed', !screen.includes('construct-outline') && !screen.includes('accessibilityLabel="Quản lý phả hệ"'));
record('lower-add-person-action-preserved', hasAll(graph, ['accessibilityLabel="Thêm người vào phả hệ"', '<Text style={styles.addPersonText}>Thêm</Text>']));
record('no-new-native-dependency', !pkg.dependencies['expo-blur']);
record('music-assignment-prep-preserved', fs.existsSync(path.join(root, 'document/phases/phase-14/music/PHASE_14F_MUSIC_ASSIGNMENT_PREP.md')));
record('phase14g-script-registered', pkg.scripts?.['phase14g:check'] === 'node ./scripts/test-phase14g-true-focus-overlay.js');

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

console.log(`Phase14G True Focus Overlay: ${pass} PASS / ${fail} FAIL`);
for (const line of results) console.log(line);
if (fail) process.exit(1);
