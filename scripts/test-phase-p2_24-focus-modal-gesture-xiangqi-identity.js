const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let pass = 0;
let fail = 0;
function check(label, ok) {
  if (ok) { pass += 1; console.log(`PASS ${String(pass + fail).padStart(2, '0')} - ${label}`); }
  else { fail += 1; console.error(`FAIL -- ${label}`); }
}
function syntax(rel) {
  const out = ts.transpileModule(read(rel), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    reportDiagnostics: true,
    fileName: rel,
  });
  return !(out.diagnostics || []).some((d) => d.category === ts.DiagnosticCategory.Error);
}
function functionBodyHasVariable(rel, functionName, variableName) {
  const sourceText = read(rel);
  const sf = ts.createSourceFile(rel, sourceText, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  let target = null;
  function visit(node) {
    if (target) return;
    if (ts.isFunctionDeclaration(node) && node.name?.text === functionName) target = node;
    ts.forEachChild(node, visit);
  }
  visit(sf);
  if (!target?.body) return false;
  let declared = false;
  function scan(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === variableName) declared = true;
    ts.forEachChild(node, scan);
  }
  scan(target.body);
  return declared;
}

console.log('\nP2.24 — Focus native-modal gesture ownership + Xiangqi identity scope\n');

const focus = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const xiangqi = read('src/components/xiangqi/XiangqiSurfaceHost.tsx');
const pkg = JSON.parse(read('package.json'));
const cleanApply = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
const preCopy = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const buildShare = read('Family_Bloom_BUILD_APK_AND_SHARE.bat');

// A) Focus Modal owns one effective RNGH root for its Android native window.
check('Focus Modal presentation root is explicit in successor architecture', /<View\s+onLayout=\{handleShellLayout\}\s+style=\{styles\.focusOverlayModalRoot\}/.test(focus) || /<GestureHandlerRootView[\s\S]{0,220}style=\{styles\.focusOverlayModalRoot\}/.test(focus));
check('Focus graph boundary explicitly knows focusOverlay mode', focus.includes('function FamilyGraphGestureBoundary') && focus.includes('focusOverlay: boolean'));
check('Focus graph boundary is plain View inside Modal', focus.includes('if (focusOverlay) return <View style={styles.gestureRoot}>{children}</View>;'));
check('Standard graph keeps local GestureHandlerRootView', focus.includes('return <GestureHandlerRootView style={styles.gestureRoot}>{children}</GestureHandlerRootView>;'));
check('Viewport uses successor gesture boundary', focus.includes('<FamilyGraphGestureBoundary focusOverlay={surfaceMode === "focusOverlay"}>'));
check('Focus has no nested forceActive root; successor may own the Modal root', !focus.includes('unstable_forceActive') || /<GestureHandlerRootView[\s\S]{0,180}unstable_forceActive[\s\S]{0,180}focusOverlayModalRoot/.test(focus));
check('Standard Pan and Pinch remain simultaneous and Focus owns an independent controller', focus.includes('Gesture.Simultaneous(panGesture, pinchGesture)') && (focus.includes('PanResponder.create({') || focus.includes('Gesture.Simultaneous(focusPanGesture, focusPinchGesture)')));
check('Focus camera boundary receives PanResponder handlers', focus.includes('focusPanHandlers={focusPanResponder.panHandlers}') && focus.includes('if (focusOverlay)'));
check('Focus geometry remains 85 percent of native window', focus.includes('const FOCUS_OVERLAY_SCREEN_RATIO = 0.85'));
check('RNGH roots are limited to standard helper plus native Focus Modal root', (focus.match(/<GestureHandlerRootView/g) || []).length === 2);

// B) Xiangqi identity must be declared in the exact component that renders PlayerRail.
check('XiangqiPreparedSurface declares myName in its own scope', functionBodyHasVariable('src/components/xiangqi/XiangqiSurfaceHost.tsx', 'XiangqiPreparedSurface', 'myName'));
check('Xiangqi name prefers profile shortName', xiangqi.includes('const myName = userProfile?.shortName?.trim()'));
check('Xiangqi name falls back to profile displayName', xiangqi.includes('|| userProfile?.displayName?.trim()'));
check('Xiangqi name falls back to Firebase displayName', xiangqi.includes('|| user?.displayName?.trim()'));
check('Xiangqi has warm Vietnamese fallback', xiangqi.includes('|| "Bạn";'));
check('Red PlayerRail uses the scoped myName', xiangqi.includes('<PlayerRail side="red" name={myName}'));

for (const rel of [
  'src/components/familyGraph/FamilyGraphPrototype.tsx',
  'src/components/xiangqi/XiangqiSurfaceHost.tsx',
]) check(`syntax ${rel}`, syntax(rel));

check('package registers P2.24 gate', pkg.scripts?.['phaseP2_24:check'] === 'node ./scripts/test-phase-p2_24-focus-modal-gesture-xiangqi-identity.js');
check('CLEAN APPLY executes P2.24 gate', cleanApply.includes('test-phase-p2_24-focus-modal-gesture-xiangqi-identity.js'));
check('Android Debug executes P2.24 gate', debugBat.includes('phaseP2_24:check'));
check('Android Release executes P2.24 gate', releaseBat.includes('phaseP2_24:check'));
check('PRE COPY identifies P2.24 or later successor', /Performance Architecture P2\.(24|25|26|27)/.test(preCopy));
check('APK share identifies P2.24 or later successor', /Family Bloom P2\.(24|25|26|27)/.test(buildShare));

console.log(`\nP2.24 result: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
