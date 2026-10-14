const fs = require('fs');
const path = require('path');
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

const stack = read('src/components/system/BloomSurfaceStack.tsx');
const appLayout = read('src/app/_layout.tsx');
const lifecycle = read('src/services/presentation/routeOwnedSurfaceLifecycle.ts');
const focus = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const chessRoute = read('src/app/(chess)/chess-game/[gameId].tsx');
const xiangqiRoute = read('src/app/(xiangqi)/xiangqi-preview.tsx');
const chessHost = read('src/components/chess/ChessSurfaceHost.tsx');
const xiangqiHost = read('src/components/xiangqi/XiangqiSurfaceHost.tsx');
const mini = read('src/components/chess/ChessMiniHost.tsx');
const globalUi = read('src/components/chess/ChessGlobalUiHost.tsx');
const lobby = read('src/app/(chess)/chess-lobby.tsx');
const clean = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const debug = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const release = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
const preCopy = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const shareRoot = read('Family_Bloom_BUILD_APK_AND_SHARE.bat');
const shareRelease = read('scripts/android/Family_Bloom_Android_Release_Build_APK_And_Share.bat');
const pkg = JSON.parse(read('package.json'));

console.log('\nP2.16 — Persistent Runtime + Route-Owned Presentation + Paint ACK\n');

check('root no longer imports full Chess visual host', !stack.includes('ChessSurfaceHost'));
check('root no longer imports full Xiangqi visual host', !stack.includes('XiangqiSurfaceHost'));
check('root no longer imports Focus visual host', !stack.includes('FamilyGraphFocusSurfaceHost'));
check('root runtime surface stack keeps only minigame/global presentation', !stack.includes('BoardGameAudioProvider') && stack.includes('ChessMiniHost') && stack.includes('ChessGlobalUiHost'));
check('shared audio owner wraps navigator and root game UI', appLayout.includes('<BoardGameAudioProvider enabled={backgroundWarmReady}>') && appLayout.indexOf('<BoardGameAudioProvider enabled={backgroundWarmReady}>') < appLayout.indexOf('<RootNavigator') && appLayout.indexOf('</BoardGameAudioProvider>') > appLayout.indexOf('<BloomSurfaceStack'));
check('root arbitration consumes paint ACK lifecycle instead of intent visibility', stack.includes('isRouteSurfacePresented(focusLifecycle)'));

check('route lifecycle has explicit REQUESTED -> shell -> hydrate -> content -> active phases',
  lifecycle.includes('"requested"') && lifecycle.includes('"shell_painted"') && lifecycle.includes('"hydrating"') && lifecycle.includes('"content_painted"') && lifecycle.includes('"active"'));
check('REQUESTED is not considered presented', lifecycle.includes('return snapshot.shellPaintedAt != null'));
check('stale owner/request ACKs cannot advance a new route', lifecycle.includes('current.ownerId === ownerId && current.requestId === requestId') && lifecycle.includes('if (!owns(kind, ownerId, requestId)) return false'));
check('route release is owner guarded', lifecycle.includes('if (current.ownerId !== ownerId) return false'));

check('Focus pixels are rendered inside Family Graph route', focus.includes('<PersistentFocusOverlayPresentation') && focus.includes('focusOverlayVisible ?'));
check('Focus root-store publication is retired from active graph path', !focus.includes('publishFamilyGraphFocusSurface('));
check('Focus route requests presentation before ACK', focus.includes('requestRouteSurface("focus"'));
check('Focus presentation request is session-scoped, not branch-scoped', focus.includes('focusPresentationRequestIdRef') && focus.includes('if (focusPresentationRequestIdRef.current) return;'));
check('Focus branch switch cannot reset root presentation arbitration', !focus.includes('requestRouteSurface("focus", focusRootOwnerIdRef.current!, focusOverlay.requestId)'));
check('Focus shell uses two painted frames before shell ACK', focus.includes('requestAnimationFrame(() => requestAnimationFrame(() => onShellPainted'));
check('Focus hydration is independent from shell ACK while ACK remains observational', focus.includes('P2.16.1: hydration is driven by the visible route request') && focus.includes('handleFocusOverlayShown();') && focus.includes('ACK only informs Root z-order'));
check('Focus content paint advances CONTENT_PAINTED then ACTIVE', focus.includes('markRouteSurfaceContentPainted("focus"') && focus.includes('markRouteSurfaceActive("focus"'));
check('Focus geometry is route-local rather than app-root-window relative', focus.includes('P2.16 route-owned Focus uses the Family Graph route coordinate system'));

check('Chess route renders real Chess surface instead of blank backdrop', chessRoute.includes('<ChessSurfaceHost routeOwnedPresentation') && !chessRoute.includes('routeBackdrop'));
check('Chess route always renders a visible shell fallback', chessRoute.includes('Đang chuẩn bị bàn cờ…'));
check('Chess route starts runtime hydration before paint ACK', chessRoute.includes('Route ownership is the hydration trigger') && chessRoute.includes('activateChessSurface(gameId, "full"') && chessRoute.includes('markRouteSurfaceShellPainted("chess"'));
check('Chess board ACKs content before ACTIVE', chessRoute.includes('markRouteSurfaceContentPainted("chess"') && chessRoute.includes('markRouteSurfaceActive("chess"'));
check('Chess host supports route-owned native coordinates', chessHost.includes('routeOwnedPresentation') && chessHost.includes('left: routeOwnedPresentation ? 0'));
check('Chess visual readiness no longer waits for audio', chessHost.includes('if (!boardVisualReady || warmReady) return;') && !chessHost.includes('!boardVisualReady || !criticalAudioReady'));

check('Xiangqi route renders real Xiangqi surface instead of blank backdrop', xiangqiRoute.includes('<XiangqiSurfaceHost routeOwnedPresentation') && !xiangqiRoute.includes('styles.backdrop'));
check('Xiangqi route never paints a shell over the already-warm board', !xiangqiRoute.includes('Đang chuẩn bị Cờ tướng…') && !xiangqiRoute.includes('styles.guard'));
check('Xiangqi route starts runtime hydration before paint ACK', xiangqiRoute.includes('Route ownership wakes the warm 32-piece scene immediately') && xiangqiRoute.includes('showXiangqiSurfaceFull("route"') && xiangqiRoute.includes('markRouteSurfaceShellPainted("xiangqi"'));
check('Xiangqi board ACKs content before ACTIVE', xiangqiRoute.includes('markRouteSurfaceContentPainted("xiangqi"') && xiangqiRoute.includes('markRouteSurfaceActive("xiangqi"'));
check('Xiangqi host supports route-owned presentation', xiangqiHost.includes('routeOwnedPresentation') && xiangqiHost.includes('onContentPainted?.()'));
check('Xiangqi visual readiness no longer waits for audio', xiangqiHost.includes('!serverState || !boardReady') && !xiangqiHost.includes('!serverState || !boardReady || !criticalAudioReady'));

check('Chess lobby active/recovered game navigates to board route', lobby.includes('router.replace({ pathname: "/(chess)/chess-game/[gameId]"'));
check('global challenge accept navigates to route-owned board', globalUi.includes('response.data.gameId') && globalUi.includes('router.push({ pathname: "/(chess)/chess-game/[gameId]"'));
check('global recovery navigates a newly claimed game', globalUi.includes('routedGameRef') && globalUi.includes('router.push({ pathname: "/(chess)/chess-game/[gameId]"'));
check('Chess mini tap navigates to full route instead of relying on root board', mini.includes('useRouter') && mini.includes('router.push({ pathname: "/(chess)/chess-game/[gameId]"'));

for (const rel of [
  'src/services/presentation/routeOwnedSurfaceLifecycle.ts',
  'src/components/system/BloomSurfaceStack.tsx',
  'src/components/familyGraph/FamilyGraphPrototype.tsx',
  'src/app/(chess)/chess-game/[gameId].tsx',
  'src/components/chess/ChessSurfaceHost.tsx',
  'src/app/(xiangqi)/xiangqi-preview.tsx',
  'src/components/xiangqi/XiangqiSurfaceHost.tsx',
  'src/components/chess/ChessMiniHost.tsx',
  'src/components/chess/ChessGlobalUiHost.tsx',
]) check(`syntax ${rel}`, syntax(rel));

check('package registers P2.16 gate', pkg.scripts?.['phaseP2_16:check'] === 'node ./scripts/test-phase-p2_16-route-owned-presentation-paint-ack.js');
check('copy-over updater runs P2.16 gate', clean.includes('test-phase-p2_16-route-owned-presentation-paint-ack.js'));
check('Debug Android build runs P2.16 gate', debug.includes('npm run phaseP2_16:check'));
check('Release Android build runs P2.16 gate', release.includes('npm run phaseP2_16:check'));
check('pre-copy package banner identifies P2.16', preCopy.includes('Performance Architecture P2.16'));
check('root APK share entrypoint identifies P2.16 family', shareRoot.includes('Family Bloom P2.16.3 - BUILD APK AND COPY TO SHARE') || shareRoot.includes('Family Bloom P2.16.2 - BUILD APK AND COPY TO SHARE') || shareRoot.includes('Family Bloom P2.16.1 - BUILD APK AND COPY TO SHARE') || shareRoot.includes('Family Bloom P2.16 - BUILD APK AND COPY TO SHARE'));
check('release share metadata identifies P2.16', shareRelease.includes('Phase  : P2.16') && shareRelease.includes('Release APK - P2.16'));

console.log(`\nFamily Bloom P2.16 Route-Owned Presentation: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
