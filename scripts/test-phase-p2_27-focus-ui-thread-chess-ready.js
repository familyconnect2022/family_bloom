const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let pass = 0, fail = 0;
function check(label, ok) { if (ok) { pass += 1; console.log(`PASS ${String(pass+fail).padStart(2,'0')} - ${label}`); } else { fail += 1; console.error(`FAIL -- ${label}`); } }
function syntax(rel) { const out = ts.transpileModule(read(rel), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }, reportDiagnostics: true, fileName: rel }); return !(out.diagnostics||[]).some(d => d.category === ts.DiagnosticCategory.Error); }

console.log('\nP2.27 — Focus UI-thread camera input + deterministic Chess readiness\n');
const graph = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const chessStore = read('src/services/chess/chessSurfaceStore.ts');
const chessBoard = read('src/components/chess/ChessBoard.tsx');
const chessHost = read('src/components/chess/ChessSurfaceHost.tsx');
const xiangqiStore = read('src/services/xiangqi/xiangqiSurfaceStore.ts');
const pkg = JSON.parse(read('package.json'));
const clean = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const debug = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const release = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
const pre = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const share = read('Family_Bloom_BUILD_APK_AND_SHARE.bat');

const dedicatedStart = graph.indexOf('const DedicatedFocusGraphViewport');
const personNodeStart = graph.indexOf('const PersonNode', dedicatedStart);
const dedicated = graph.slice(dedicatedStart, personNodeStart);

check('Focus still renders a physically dedicated viewport', graph.includes('<DedicatedFocusGraphViewport') && !/PersistentFocusGraphSurface[\s\S]{0,1800}<FamilyGraphPrototype/.test(graph));
check('Dedicated Focus owns independent camera SharedValues', dedicated.includes('const focusScale = useSharedValue') && dedicated.includes('const focusTranslateX = useSharedValue') && dedicated.includes('const focusTranslateY = useSharedValue'));
check('Dedicated Focus no longer uses JS PanResponder', !dedicated.includes('PanResponder.create(') && !dedicated.includes('panResponder.panHandlers'));
check('Dedicated Focus owns RNGH Pan', dedicated.includes('const focusPanGesture = useMemo(() => Gesture.Pan()'));
check('Dedicated Focus owns RNGH Pinch', dedicated.includes('const focusPinchGesture = useMemo(() => Gesture.Pinch()'));
check('Focus Pan and Pinch run simultaneous like main tree', dedicated.includes('Gesture.Simultaneous(focusPanGesture, focusPinchGesture)'));
check('Focus Pan writes SharedValues inside worklet path', /focusPanGesture[\s\S]{0,4200}"worklet"[\s\S]{0,4200}focusTranslateX\.value = next\.x[\s\S]{0,300}focusTranslateY\.value = next\.y/.test(dedicated));
check('Focus Pinch follows RNGH event.scale', /focusPinchGesture[\s\S]{0,4200}event\.scale/.test(dedicated));
check('Focus Pinch follows RNGH focal point', dedicated.includes('event.focalX') && dedicated.includes('event.focalY'));
check('Focus ignores one-pointer tail frame during pinch', dedicated.includes('if (event.numberOfPointers < 2) return;'));
check('Focus no longer computes pinch from touch locationX/locationY', !dedicated.includes('locationX') && !dedicated.includes('locationY'));
check('Focus camera discovery is committed after gesture', dedicated.includes('runOnJS(commitFocusCameraTransform)') && dedicated.includes('discoverTransform(translateX, translateY, safeScale, true)'));
check('Focus onUpdate does not call JS discovery directly', !/\.onUpdate\(\(event\) => \{[\s\S]{0,1800}discoverTransform\(/.test(dedicated));
check('Native Modal owns one explicit force-active RNGH root', /<GestureHandlerRootView[\s\S]{0,180}unstable_forceActive[\s\S]{0,220}focusOverlayModalRoot/.test(graph));
check('Dedicated Focus detector is inside its own viewport', dedicated.includes('<GestureDetector gesture={focusCanvasGesture}>'));

const activateStart = chessStore.indexOf('export function activateChessSurface');
const activateEnd = chessStore.indexOf('export function showChessSurfaceFull', activateStart);
const activateChunk = chessStore.slice(activateStart, activateEnd);
check('Chess activate no longer clears preparing unconditionally', !/preparing:\s*false/.test(activateChunk));
check('Cold Chess activation preserves/starts preparing', chessStore.includes('const coldActivation = !state.prepared;') && chessStore.includes('preparing: state.preparing || coldActivation'));
check('Only board readiness clears Chess preparing', /markChessSurfacePrepared\(\)[\s\S]{0,220}preparing:\s*false/.test(chessStore));
check('ChessBoard retries readiness on runtime activation', /useEffect\(\(\) => \{\s*if \(!runtimeActive\) return;\s*maybeReportBoardReady\(\);[\s\S]{0,100}\[maybeReportBoardReady, runtimeActive\]/.test(chessBoard));
check('Chess readiness still requires layout', chessBoard.includes('if (!layoutReadyRef.current) return;'));
check('Chess readiness still requires all controllers', chessBoard.includes('controllersRef.current.size < initialPieces.length'));
check('Chess readiness still requires all assets', chessBoard.includes('assetReadyIdsRef.current.size < initialPieces.length'));
check('Chess readiness still waits two painted frames', chessBoard.includes('requestAnimationFrame(() => requestAnimationFrame(() => {'));
check('Chess host marks surface prepared only after board visual ready', /if \(!boardVisualReady \|\| warmReady\) return;[\s\S]{0,160}markChessSurfacePrepared\(\)/.test(chessHost));
check('Chess cold placeholder keeps board runtime awake while preparing', chessHost.includes('runtimeActive={actualGame ? fullVisible : surface.preparing}'));
check('Xiangqi surface lifetime code remains independent', xiangqiStore.includes('activateXiangqiSurface') && !xiangqiStore.includes('activateChessSurface'));

for (const rel of [
  'src/components/familyGraph/FamilyGraphPrototype.tsx',
  'src/services/chess/chessSurfaceStore.ts',
  'src/components/chess/ChessBoard.tsx',
  'src/components/chess/ChessSurfaceHost.tsx',
  'src/services/xiangqi/xiangqiSurfaceStore.ts',
]) check(`syntax ${rel}`, syntax(rel));

check('package registers P2.27 gate', pkg.scripts?.['phaseP2_27:check'] === 'node ./scripts/test-phase-p2_27-focus-ui-thread-chess-ready.js');
check('CLEAN APPLY executes P2.27 gate', clean.includes('test-phase-p2_27-focus-ui-thread-chess-ready.js'));
check('Android Debug executes P2.27 gate', debug.includes('phaseP2_27:check'));
check('Android Release executes P2.27 gate', release.includes('phaseP2_27:check'));
check('PRE COPY identifies P2.27', pre.includes('Performance Architecture P2.27'));
check('APK share identifies P2.27', share.includes('Family Bloom P2.27'));

console.log(`\nP2.27 result: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
