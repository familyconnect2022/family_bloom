const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let pass = 0, fail = 0;
function check(label, ok) {
  if (ok) { pass++; console.log(`PASS ${String(pass + fail).padStart(2,'0')} - ${label}`); }
  else { fail++; console.error(`FAIL -- ${label}`); }
}
function syntax(rel) {
  const out = ts.transpileModule(read(rel), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    reportDiagnostics: true,
    fileName: rel,
  });
  return !(out.diagnostics || []).some((d) => d.category === ts.DiagnosticCategory.Error);
}
function loadLifecycle() {
  const rel = 'src/services/presentation/routeOwnedSurfaceLifecycle.ts';
  const out = ts.transpileModule(read(rel), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    fileName: rel,
  }).outputText;
  const module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    require(name) {
      if (name === 'react') return { useSyncExternalStore: () => null };
      throw new Error(`Unexpected require: ${name}`);
    },
    Date,
    console,
  };
  vm.runInNewContext(out, sandbox, { filename: rel });
  return module.exports;
}

console.log('\nP2.16.1 — Hydration Without Paint-ACK Deadlock\n');

const lifecycleSource = read('src/services/presentation/routeOwnedSurfaceLifecycle.ts');
const focus = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const chessRoute = read('src/app/(chess)/chess-game/[gameId].tsx');
const xiangqiRoute = read('src/app/(xiangqi)/xiangqi-preview.tsx');
const chessHost = read('src/components/chess/ChessSurfaceHost.tsx');
const xiangqiHost = read('src/components/xiangqi/XiangqiSurfaceHost.tsx');
const chessContext = read('src/context/ChessRealtimeContext.tsx');

check('paint lifecycle explicitly says ACK is observational, not a hydration gate', lifecycleSource.includes('Paint ACK is observational, never a hydration gate'));
check('Root presentation requires a real shellPaintedAt timestamp', lifecycleSource.includes('return snapshot.shellPaintedAt != null'));
check('content ACK can be recorded before shell ACK', lifecycleSource.includes('const phase: RouteSurfacePhase = current.shellPaintedAt != null ? "content_painted" : current.phase'));

const lifecycle = loadLifecycle();
const requestId = lifecycle.requestRouteSurface('focus', 'owner-a');
check('REQUESTED alone is not presented', lifecycle.isRouteSurfacePresented(lifecycle.getRouteSurfaceSnapshot('focus')) === false);
lifecycle.markRouteSurfaceContentPainted('focus', 'owner-a', requestId);
check('content may hydrate before shell without faking presentation', lifecycle.getRouteSurfaceSnapshot('focus').contentPaintedAt != null && lifecycle.isRouteSurfacePresented(lifecycle.getRouteSurfaceSnapshot('focus')) === false);
lifecycle.markRouteSurfaceShellPainted('focus', 'owner-a', requestId);
check('real shell ACK makes surface presented', lifecycle.isRouteSurfacePresented(lifecycle.getRouteSurfaceSnapshot('focus')) === true);
lifecycle.markRouteSurfaceActive('focus', 'owner-a', requestId);
check('surface becomes active after independent shell+content ACKs', lifecycle.getRouteSurfaceSnapshot('focus').phase === 'active');
const beforeStale = JSON.stringify(lifecycle.getRouteSurfaceSnapshot('focus'));
lifecycle.markRouteSurfaceContentPainted('focus', 'stale-owner', requestId);
check('stale owner ACK cannot mutate current lifecycle', JSON.stringify(lifecycle.getRouteSurfaceSnapshot('focus')) === beforeStale);

const openBranchStart = focus.indexOf('const handleOpenBranch = useCallback');
const openBranchEnd = focus.indexOf('const handleFocusOverlayPersonRequest', openBranchStart);
const openBranch = focus.slice(openBranchStart, openBranchEnd);
check('Focus press path uses route-local geometry', openBranch.includes('rootLocalFrameRef.current'));
check('Focus press path no longer waits for measureInWindow', !openBranch.includes('rootRef.current?.measureInWindow'));
check('Focus hydration has an effect independent from shell ACK', focus.includes('hydration is driven by the visible route request') && focus.includes('handleFocusOverlayShown();'));
check('Focus shell ACK does not start hydration anymore', focus.includes('ACK only informs Root z-order'));

check('Chess route wakes runtime in layout effect before paint ACK', chessRoute.includes('Route ownership is the hydration trigger') && chessRoute.includes('activateChessSurface(gameId, "full"'));
check('Chess route-owned host is visible independent of global mode race', chessHost.includes('const fullVisible = routeOwnedPresentation\n    ? true'));
check('Chess route claims full mode before the mode-gated game subscription runs', chessRoute.includes('activateChessSurface(gameId, "full"') && chessHost.includes('useChessGame(activeFamilyId, surface.gameId, surface.mode === "full"'));
check('Chess lobby explicitly connects transport before lobby ACK', chessContext.includes('entering the lobby is an explicit hydration request') && chessContext.includes('await chessSocketService.connect()'));

check('Xiangqi route wakes warm board in layout effect before paint ACK', xiangqiRoute.includes('Route ownership wakes the warm 32-piece scene immediately') && xiangqiRoute.includes('showXiangqiSurfaceFull("route"'));
check('Xiangqi route-owned host is focused independent of global mode race', xiangqiHost.includes('const screenFocused = routeOwnedPresentation'));
check('Xiangqi route-owned pixels have explicit stacking above shell', xiangqiHost.includes('zIndex: 2') && xiangqiHost.includes('elevation: 2'));

for (const rel of [
  'src/services/presentation/routeOwnedSurfaceLifecycle.ts',
  'src/components/familyGraph/FamilyGraphPrototype.tsx',
  'src/app/(chess)/chess-game/[gameId].tsx',
  'src/components/chess/ChessSurfaceHost.tsx',
  'src/app/(xiangqi)/xiangqi-preview.tsx',
  'src/components/xiangqi/XiangqiSurfaceHost.tsx',
  'src/context/ChessRealtimeContext.tsx',
]) check(`syntax ${rel}`, syntax(rel));


const pkg = JSON.parse(read('package.json'));
const clean = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const debug = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const release = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
check('package registers P2.16.1 gate', pkg.scripts?.['phaseP2_16_1:check'] === 'node ./scripts/test-phase-p2_16_1-hydration-no-ack-deadlock.js');
check('copy-over updater runs P2.16.1 gate', clean.includes('phaseP2_16_1:check') || clean.includes('test-phase-p2_16_1-hydration-no-ack-deadlock.js'));
check('Debug Android build runs P2.16.1 gate', debug.includes('phaseP2_16_1:check'));
check('Release Android build runs P2.16.1 gate', release.includes('phaseP2_16_1:check'));

console.log(`\nFamily Bloom P2.16.1 Hydration Contract: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
