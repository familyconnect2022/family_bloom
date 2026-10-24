const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__legacyScriptsDir, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
let pass = 0;
let fail = 0;
function check(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`PASS ${String(pass).padStart(2, '0')} - ${name}`); }
  else { fail += 1; console.error(`FAIL -- ${name}${detail ? ` :: ${detail}` : ''}`); }
}
function syntax(rel) {
  const out = ts.transpileModule(read(rel), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    reportDiagnostics: true,
    fileName: rel,
  });
  return !(out.diagnostics || []).some((d) => d.category === ts.DiagnosticCategory.Error);
}

const prototype = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const personSheet = read('src/components/familyGraph/FamilyGraphPersonSheet.tsx');
const flow = read('src/components/ui/BloomFullScreenFlow.tsx');
const scene = read('src/components/familyGraph/familyGraphSceneBuilder.ts');
const chessStore = read('src/services/chess/chessSurfaceStore.ts');
const a9 = read('scripts/test-phase17_9a9-chess-lifecycle-mini-premove.js');
const clean = read('scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat');
const pre = read('scripts/android/maintenance/Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const pkg = JSON.parse(read('package.json'));
const debugBuild = read('scripts/android/dev/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBuild = read('scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat');

check('cold Detail no longer prewarms Focus tree before tap',
  !prototype.includes('InteractionManager.runAfterInteractions') && prototype.includes('intentionally no Detail-screen Focus prewarm'));
check('new Focus branch attaches shell with null visual before hydration',
  prototype.includes('shell-first Focus') && prototype.includes('visual: null') && prototype.includes('setFocusOverlayVisible(true)'));
check('Focus BSH starts only after two shell frames',
  prototype.includes('Give the Focus shell + Back affordance two real frames'));
check('Focus loader is visible while tree is prepared', prototype.includes('Đang chuẩn bị cây…'));
check('same-person retained Scene still reopens instantly',
  prototype.includes('focusOverlay?.personId === personId && focusOverlay.visual') && prototype.includes('focusOverlayContentProgress.value = 1'));
check('Detail remains mounted while root Focus is already visible underneath',
  prototype.includes('visible={!!detailPerson && !detailFocusHandoffPending}') &&
  prototype.includes('Focus pixels are already present behind it'));
check('Detail handoff mounts Focus before any delayed Detail cleanup',
  prototype.includes('setDetailFocusHandoffPending(true)') &&
  prototype.includes('mountFocusOverlay(personId, hostFrame);') &&
  prototype.indexOf('mountFocusOverlay(personId, hostFrame);') < prototype.indexOf('setDetailPersonId(null);', prototype.indexOf('const handoffPersonSheetToFocus')));
check('vendor handoff fallback is short rather than old 240ms gate', prototype.includes('}, 96);') && !prototype.includes('}, 240);'));
check('Person sheet still forwards immediate native dismiss', personSheet.includes('dismissImmediately={dismissImmediately}'));
check('full-screen flow uses animation none for immediate dismiss', flow.includes('animationType={dismissImmediately ? "none" : "slide"}'));
check('interruptible BSH still checks cancellation between stages',
  scene.includes('await yieldFamilyGraphBuild();') && scene.includes('if (cancelled()) return null;'));

check('shared board lifecycle source exists in FULL tree', exists('src/services/games/boardGameSurfaceLifecycle.ts'));
check('Chess store import target matches shared board lifecycle module', chessStore.includes('../games/boardGameSurfaceLifecycle'));
check('A9 test loader explicitly maps shared lifecycle TS dependency',
  a9.includes("loadTsModule('src/services/games/boardGameSurfaceLifecycle.ts')") &&
  a9.includes("'../games/boardGameSurfaceLifecycle': sharedSurfaceLifecycleModule"));
check('pre-copy cleanup does not delete shared board lifecycle module', !pre.includes('boardGameSurfaceLifecycle.ts'));
check('clean-apply retains A9 regression gate', clean.includes('test-phase17_9a9-chess-lifecycle-mini-premove.js'));
check('clean-apply registers P2.15.1 shell/copy-over gate', clean.includes('test-phase-p2_15_1-focus-shell-first-copy-over-integrity.js'));
check('package registers P2.15.1 regression command', pkg.scripts?.['phaseP2_15_1:check'] === 'node ./scripts/tests/history/test-phase-p2_15_1-focus-shell-first-copy-over-integrity.js');
check('Debug Android build runs P2.15.1 gate', debugBuild.includes('npm run phaseP2_15_1:check'));
check('Release Android build runs P2.15.1 gate', releaseBuild.includes('npm run phaseP2_15_1:check'));

for (const rel of [
  'src/components/familyGraph/FamilyGraphPrototype.tsx',
  'src/components/familyGraph/FamilyGraphPersonSheet.tsx',
  'src/components/ui/BloomFullScreenFlow.tsx',
  'src/components/familyGraph/familyGraphSceneBuilder.ts',
  'src/services/games/boardGameSurfaceLifecycle.ts',
  'src/services/chess/chessSurfaceStore.ts',
]) check(`syntax ${rel}`, syntax(rel));

console.log(`\nFamily Bloom P2.15.1 Focus Shell First + Copy-over Integrity: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
