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

record('default-standard-mode-is-3', graph.includes('useState<ViewMode>(initialViewMode ?? "3")'));
record('default-user-not-selected', graph.includes('useState<string | null>(null);\n  const [viewAnchorPersonId'));
record('default-user-highlighted-only', hasAll(graph, [
  'const [highlightedPersonId, setHighlightedPersonId] = useState<string | null>(initialFocusId)',
  'focused={highlightedPersonId === person.id}',
  'setHighlightedPersonId((current) => current && peopleById.has(current) ? current : defaultFocusId)',
]));
record('initial-camera-centers-linked-user', hasAll(graph, [
  'const person = peopleById.get(initialFocusId ?? "")',
  'const personCenterX = person.x + FAMILY_GRAPH_CANVAS.nodeWidth / 2',
  'x: next.width / 2 - canvasCenterX - INITIAL_SCALE * (personCenterX - canvasCenterX)',
]));
record('background-active-set-is-whole-tree', hasAll(graph, [
  'Phase 14F invariant: the background canvas never opens/dims a branch',
  '() => new Set(sourcePeople.map((person) => person.id))',
]));
record('background-connectors-never-focus-dim', graph.includes('focusMode={false}'));
record('standard-nodes-no-relationship-focus-badges', graph.includes('relationMeta={surfaceMode === "focusOverlay" ? focusRelations.get(person.id) ?? null : null}'));
record('legacy-focus-banner-removed', !graph.includes('Nhánh đang xem:'));
record('branch-open-mounts-overlay-before-visual', (() => {
  const mountStart = graph.indexOf('const mountFocusOverlay = useCallback');
  const mountEnd = graph.indexOf('const handleOpenBranch = useCallback', mountStart);
  const mountBlock = mountStart >= 0 && mountEnd > mountStart ? graph.slice(mountStart, mountEnd) : openBlock;
  return hasAll(mountBlock, ['visual: null', 'hydrateFocusOverlayVisual(personId, requestId)', 'Freeze the already-rendered Canvas View exactly as-is']);
})());
record('branch-open-has-no-in-canvas-anchor-fallback', !openBlock.includes('setViewAnchorPersonId(personId)'));
record('branch-open-has-no-selection-mutation', !openBlock.includes('setSelectedPersonId(personId)'));
record('branch-open-has-no-camera-mutation', !openBlock.includes('centerOnPerson(') && !openBlock.includes('setPan(') && !openBlock.includes('setScaleValue('));
record('legacy-in-canvas-branch-machinery-removed', !graph.includes('BranchPreparingOverlay') && !graph.includes('getFocusBranchIds('));
record('focus-overlay-still-shields-background', hasAll(graph, ['focusOverlayShield', 'style={styles.focusOverlayShield}', 'pointerEvents={focusOverlay ? "none" : "auto"}']));
record('focus-overlay-still-pan-zoom', hasAll(graph, ['surfaceMode="focusOverlay"', 'autoFitOnMount', 'Gesture.Simultaneous(panGesture, pinchGesture)']));
record('focus-overlay-same-instance-navigation', hasAll(graph, ['handleFocusOverlayPersonRequest', 'One overlay only', 'personId,', 'visual: null']));
record('focus-overlay-available-from-3-5-all', !openBlock.includes('viewMode') && !openBlock.includes('focusOverlayMode'));
record('screen-wires-in-memory-branch-visual', hasAll(screen, ['queryEngine.getFocusSubgraph', 'getOrBuildFamilyGraphVisual(subgraph.snapshot, focusPersonId, true)', 'getFocusBranchVisual={getFocusBranchVisual}']));
record('focus-branch-layout-cache', hasAll(screen, ['focusBranchVisualCache', 'const cacheKey = `full:${focusPersonId}`', 'if (cached) return cached', 'focusBranchVisualCache.set(cacheKey, result)']));
record('phase14f-script-registered', pkg.scripts?.['phase14f:check'] === 'node ./scripts/test-phase14f-graph-focus-isolation.js');

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

console.log(`Phase14F Graph Focus Isolation + Default 3 Gen: ${pass} PASS / ${fail} FAIL`);
for (const line of results) console.log(line);
if (fail) process.exit(1);
