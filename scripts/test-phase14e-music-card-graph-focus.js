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
const hasAll = (text, parts) => parts.every(p => text.includes(p));

const music = read('src/features/home/music/HomeMusicPanel.tsx');
record('music-one-bloom-card', hasAll(music, ['musicCard:', '<View style={styles.musicCard}>', 'NHẠC NHÀ MÌNH · BLOOM SUPPER']));
record('music-search-inside-card', hasAll(music, ['searchBox', 'Tìm tên bài hát hoặc nghệ sĩ']));
record('music-three-horizontal-tabs', hasAll(music, ['label: "Playlist"', 'label: "Yêu thích"', 'label: "Bài hát Nhà Mình"', 'tabs: { flexDirection: "row"']));
record('music-fixed-scroll-window', hasAll(music, ['const LIST_HEIGHT = 350', 'height: LIST_HEIGHT', 'nestedScrollEnabled', '<ScrollView']));
record('music-bounded-page-20', hasAll(music, ['const PAGE = 20', 'safePage * PAGE', 'Trang {safePage + 1}/{totalPages}']));
record('music-friendly-permission-error', hasAll(music, ['friendlyMusicError', 'permission-denied', 'Bloom chưa thể chuẩn bị nhạc cho nhà mình']));
record('music-performance-search', hasAll(music, ['AbortController', '}, 360)', 'searchRequestRef.current?.abort()']));
record('music-no-extra-section-header', !read('src/app/(tabs)/play.tsx').includes('<BloomSectionHeader title="Nhạc Nhà Mình"'));

const graph = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const graphScreen = read('src/app/(family)/(graph)/family-graph.tsx');
record('graph-focus-visual-from-loaded-snapshot', hasAll(graphScreen, ['getFocusBranchVisual', 'queryEngine.getFocusSubgraph', 'adaptFamilyGraphSnapshot(subgraph.snapshot, focusPersonId)']));
record('graph-focus-overlay-80-percent', hasAll(graph, ['width: viewport.width * 0.8', 'height: viewport.height * 0.8', 'focusOverlay.targetFrame.width', 'focusOverlay.targetFrame.height']));
record('graph-focus-overlay-shield', hasAll(graph, ['focusOverlayShield', '...StyleSheet.absoluteFillObject', 'onPress={closeFocusOverlay}']));
record('graph-focus-frost-performance-first', (hasAll(graph, ['baseGraphLayerBlurred', 'filter: [{ blur: 5 }]', 'focusOverlayShield']) || hasAll(graph, ['focusOverlayShield', 'rgba(255,248,251,0.38)']) || hasAll(graph, ['focusOverlayShield', 'rgba(255,248,251,0.20)'])));
record('graph-focus-open-animation', hasAll(graph, ['focusOverlayStartTranslateX', 'focusOverlayStartScale', 'durationMs = Math.round(390 + travelRatio * 150)', 'Easing.bezier(0.2, 0.82, 0.2, 1)']));
record('graph-background-mode-independent', hasAll(graphScreen, ['const fullDepth = Math.max(1, snapshot.persons.length)', 'ancestorDepth: fullDepth', 'descendantDepth: fullDepth']));
record('graph-base-camera-preserved', hasAll(graph, ['Freeze the already-rendered Canvas View exactly as-is', 'view mode, visible nodes/lines, pan and zoom are untouched']));
record('graph-focus-pan-pinch-reused', hasAll(graph, ['surfaceMode="focusOverlay"', 'Gesture.Simultaneous(panGesture, pinchGesture)', 'autoFitOnMount']));
record('graph-single-overlay-navigation', hasAll(graph, ['handleFocusOverlayPersonRequest', 'One overlay only', 'onFocusPersonRequest={handleFocusOverlayPersonRequest}']));
record('graph-no-overlay-stacking', graph.includes('surfaceMode === "standard" && focusOverlay ?'));
record('graph-focus-auto-fit', hasAll(graph, ['autoFitOnMount && visiblePeople.length', '(next.width - 28) / contentWidth', '(next.height - 28) / contentHeight']));
record('graph-focus-child-hides-heavy-controls', hasAll(graph, ['surfaceMode === "standard" && (', 'viewportFocusOverlay', 'zoomControlsFocusOverlay']));
record('graph-focus-prop-wired', graphScreen.includes('getFocusBranchVisual={getFocusBranchVisual}'));

const pkg = JSON.parse(read('package.json'));
record('no-new-native-dependency', !pkg.dependencies['expo-blur']);
record('phase14e-script-registered', pkg.scripts?.['phase14e:check'] === 'node ./scripts/test-phase14e-music-card-graph-focus.js');

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

console.log(`Phase14E Music Card + Graph Focus Overlay: ${pass} PASS / ${fail} FAIL`);
for (const line of results) console.log(line);
if (fail) process.exit(1);
