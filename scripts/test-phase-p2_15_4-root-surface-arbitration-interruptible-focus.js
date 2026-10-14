#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let pass = 0;
let fail = 0;
function check(name, ok, detail='') {
  if (ok) { pass++; console.log(`PASS ${String(pass).padStart(2,'0')} - ${name}`); }
  else { fail++; console.error(`FAIL -- ${name}${detail ? ` :: ${detail}` : ''}`); }
}
function syntax(rel) {
  const out = ts.transpileModule(read(rel), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    reportDiagnostics: true,
    fileName: rel,
  });
  return !(out.diagnostics || []).some((d) => d.category === ts.DiagnosticCategory.Error);
}

const stack = read('src/components/system/BloomSurfaceStack.tsx');
const manager = read('src/services/presentation/bloomRootSurfaceManager.ts');
const legacyLayers = read('src/services/presentation/bloomSurfaceStackStore.ts');
const focusHost = read('src/components/familyGraph/FamilyGraphFocusSurfaceHost.tsx');
const mini = read('src/components/chess/ChessMiniHost.tsx');
const chess = read('src/components/chess/ChessSurfaceHost.tsx');
const xiangqi = read('src/components/xiangqi/XiangqiSurfaceHost.tsx');
const globalChess = read('src/components/chess/ChessGlobalUiHost.tsx');
const query = read('src/services/familyGraph/familyGraphQueryEngine.ts');
const scene = read('src/components/familyGraph/familyGraphSceneBuilder.ts');
const prototype = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const pkg = JSON.parse(read('package.json'));
const clean = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const debug = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const release = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

console.log('\nP2.15.4 — Root Surface Arbitration + Interruptible Focus BSH\n');

check('root manager is the single canonical z-order authority',
  manager.includes('BLOOM_ROOT_Z_ORDER') && legacyLayers.includes('BLOOM_ROOT_Z_ORDER'));
check('Focus z-order is strictly above game z-order',
  /game:\s*100/.test(manager) && /focus:\s*200/.test(manager));
check('Root stack does not depend on Chess/Xiangqi prepared hooks',
  !stack.includes('useChessSurfacePrepared') && !stack.includes('useXiangqiSurfacePrepared'));
check('Root stack derives arbitration only from Focus presentation state',
  stack.includes('useFamilyGraphFocusSurfaceState') && stack.includes('resolveBloomRootSurfacePolicy'));
check('Focus occludes whole game plane input',
  stack.includes('pointerEvents={policy.gamesOccluded ? "none" : "box-none"}'));
check('Focus propagates occlusion to Chess full host',
  stack.includes('<ChessSurfaceHost occludedByHigherSurface={policy.gamesOccluded} />'));
check('Focus propagates occlusion to Xiangqi full host',
  stack.includes('<XiangqiSurfaceHost occludedByHigherSurface={policy.gamesOccluded} />'));
check('Focus propagates occlusion to Chess mini host',
  stack.includes('<ChessMiniHost occludedByHigherSurface={policy.gamesOccluded} />'));
check('Focus suspends Chess global challenge actions',
  stack.includes('<ChessGlobalUiHost suspendedByHigherSurface={policy.globalGameUiSuspended} />'));
check('Chess mini remains mounted but cannot show or tick under Focus',
  mini.includes('!occludedByHigherSurface && !!state && visible') && mini.includes('if (occludedByHigherSurface)') && mini.includes('progress.value = 0'));
check('Chess full retained board moves offscreen under higher surface',
  chess.includes('surface.mode === "full" && !occludedByHigherSurface'));
check('Xiangqi runtime is presentation-suspended under higher surface',
  xiangqi.includes('isBoardGameSurfacePresented(surface.presentationReady, surface.mode) && !occludedByHigherSurface'));
check('Pending Chess challenge is retained but not presented over Focus',
  globalChess.includes('const presentedInvite = suspendedByHigherSurface ? null : invite'));
check('Chess notification cannot reopen game while Focus owns top plane',
  globalChess.includes('event.gameId && !suspendedByHigherSurface'));
check('hidden Focus retains native/React scene tree rather than display none',
  focusHost.includes('opacity: 0') && !focusHost.includes('display: "none"') && !focusHost.includes("display: 'none'"));

check('Focus query has cooperative interruptible branch API',
  query.includes('getFocusBranchSubgraphInterruptible') && query.includes('budgetMs = 5'));
check('Focus traversal checks cancellation inside descendant queue',
  query.includes('for (let index = 0; index < queue.length') && query.includes('if (!(await checkpoint())) return null;'));
check('Focus partner expansion is cooperatively cancellable',
  query.includes('for (const personId of branchIds)') && query.includes('const partners = this.getPartners(personId)'));
check('Focus relationship materialization is cooperatively cancellable',
  query.includes('for (const relationship of this.relationshipsById.values())'));
check('Focus Scene builder uses cooperative Stage-1 model',
  scene.includes('buildFamilyGraphFocusModelInterruptible') && scene.includes('getFocusBranchSubgraphInterruptible'));
check('Focus reuses the already-built route query engine and Full-Tree topology revision',
  scene.includes('queryEngineHint ?? createFamilyGraphQueryEngine(snapshot)') &&
  scene.includes('topologyRevisionHint ?? fingerprintFamilyGraphTopology(snapshot)') &&
  read('src/app/(family)/(graph)/family-graph.tsx').includes('}, cancellation, visual, queryEngine)'));
check('Focus projection itself is cooperatively interruptible',
  scene.includes('buildFamilyGraphFocusProjectionSceneInterruptible') && scene.includes('createFamilyGraphBuildCheckpoint'));
check('routing-plan projection yields inside large map/set loops',
  scene.includes('for (const [connectionId, value] of baseRouting.routeByConnectionId)') && scene.includes('for (const [key, value] of baseRouting.portOccupancy)'));
check('Back invalidates active Focus build token before hiding',
  prototype.includes('cancelFocusScheduledWork();') && prototype.includes('token.cancelled = true') && prototype.includes('setFocusOverlayVisible(false)'));
check('Focus shell remains root-persistent and non-native-modal',
  prototype.includes('publishFamilyGraphFocusSurface') && !/<Modal\s+[\s\S]*?visible=\{focusOverlayVisible\}/m.test(prototype));

for (const rel of [
  'src/services/presentation/bloomRootSurfaceManager.ts',
  'src/services/presentation/bloomSurfaceStackStore.ts',
  'src/components/system/BloomSurfaceStack.tsx',
  'src/components/chess/ChessMiniHost.tsx',
  'src/components/chess/ChessSurfaceHost.tsx',
  'src/components/chess/ChessGlobalUiHost.tsx',
  'src/components/xiangqi/XiangqiSurfaceHost.tsx',
  'src/services/familyGraph/familyGraphQueryEngine.ts',
  'src/components/familyGraph/familyGraphSceneBuilder.ts',
]) check(`syntax ${rel}`, syntax(rel));

// Execute the pure arbitration policy to catch accidental policy inversion.
try {
  const js = ts.transpileModule(manager, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(js, { module, exports: module.exports, require });
  const fn = module.exports.resolveBloomRootSurfacePolicy;
  const focus = fn({ focusVisible: true });
  const normal = fn({ focusVisible: false });
  check('policy runtime: Focus blocks game interaction', focus.gamesOccluded && !focus.miniGamesInteractive && focus.globalGameUiSuspended);
  check('policy runtime: closing Focus restores game interaction', !normal.gamesOccluded && normal.miniGamesInteractive && !normal.globalGameUiSuspended);
} catch (error) {
  check('root policy runtime executes', false, String(error));
}

check('package registers P2.15.4 gate', pkg.scripts?.['phaseP2_15_4:check'] === 'node ./scripts/test-phase-p2_15_4-root-surface-arbitration-interruptible-focus.js');
check('copy-over updater runs P2.15.4 gate', clean.includes('test-phase-p2_15_4-root-surface-arbitration-interruptible-focus.js'));
check('Debug build runs P2.15.4 gate', debug.includes('npm run phaseP2_15_4:check'));
check('Release build runs P2.15.4 gate', release.includes('npm run phaseP2_15_4:check'));

console.log(`\nFamily Bloom P2.15.4 Root Surface Arbitration: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
