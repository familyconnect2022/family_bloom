const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let pass = 0, fail = 0;
function check(label, ok) {
  if (ok) { pass++; console.log(`PASS ${String(pass + fail).padStart(2, '0')} - ${label}`); }
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

console.log('\nP2.16.3 — Single-session presentation + route audio + Focus hard recovery\n');

const layout = read('src/app/_layout.tsx');
const audio = read('src/components/games/useBoardGameSoundscape.ts');
const stack = read('src/components/system/BloomSurfaceStack.tsx');
const homeGames = read('src/app/(home)/(games)/home-games.tsx');
const chessRoute = read('src/app/(chess)/chess-game/[gameId].tsx');
const xiangqiRoute = read('src/app/(xiangqi)/xiangqi-preview.tsx');
const xiangqiHost = read('src/components/xiangqi/XiangqiSurfaceHost.tsx');
const focus = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const chessServer = read('server/src/chess/chessPersistenceService.ts');
const xiangqiServer = read('server/src/xiangqi/xiangqiPersistenceService.ts');
const xiangqiSocket = read('server/src/xiangqi/xiangqiSocket.ts');

// Exact audio root cause: route-owned hosts must be descendants of the one audio provider.
const providerOpen = layout.indexOf('<BoardGameAudioProvider enabled={backgroundWarmReady}>');
const navigator = layout.indexOf('<RootNavigator');
const providerClose = layout.indexOf('</BoardGameAudioProvider>');
const rootStack = layout.indexOf('<BloomSurfaceStack');
check('one shared audio provider wraps route navigator', providerOpen >= 0 && providerOpen < navigator && providerClose > navigator);
check('same audio provider also wraps mini/global game layer', providerOpen >= 0 && providerOpen < rootStack && providerClose > rootStack);
check('BloomSurfaceStack no longer creates a sibling audio provider', !stack.includes('BoardGameAudioProvider'));
check('audio provider identity is stable while warm readiness flips', audio.includes('return createElement(EnabledBoardGameAudioProvider, { enabled }, children)') && !audio.includes('if (!enabled) return createElement(BoardGameAudioContext.Provider'));
check('all eleven supplied board cues remain in one bank', (audio.match(/useReliableAudioCue\(SOURCES\./g) || []).length === 11);

// A route may present its own pixels, but never steal the other game session on mount/focus.
check('Chess route no longer force-hides Xiangqi on route lifecycle', !chessRoute.includes('forceHideXiangqiSurface'));
check('Xiangqi route no longer force-hides Chess on route lifecycle', !xiangqiRoute.includes('forceHideChessSurface'));
check('Xiangqi route renders warm host directly with no blocking shell/guard', xiangqiRoute.includes('<XiangqiSurfaceHost routeOwnedPresentation') && !xiangqiRoute.includes('Đang chuẩn bị Cờ tướng…') && !xiangqiRoute.includes('styles.guard'));
const openXiangqiBlock = homeGames.slice(homeGames.indexOf('const openXiangqi = () => {'), homeGames.indexOf('\n\n  return (', homeGames.indexOf('const openXiangqi = () => {')));
check('Home Games blocks Xiangqi navigation while Chess is active', openXiangqiBlock.includes('if (chessRealtime.activeGameId)') && openXiangqiBlock.includes('Cờ vua vẫn đang tiếp tục') && openXiangqiBlock.indexOf('if (chessRealtime.activeGameId)') < openXiangqiBlock.indexOf('router.push("/xiangqi-preview"'));
check('Home Games resumes active Chess directly instead of creating another flow', homeGames.includes('pathname: "/(chess)/chess-game/[gameId]"') && homeGames.includes('gameId: chessRealtime.activeGameId'));

// Server durable lock remains the authority. Xiangqi only clears stale Chess presentation after authoritative Xiangqi ownership is proven.
check('Chess and Xiangqi still share one durable uid lock', chessServer.includes('chessActiveUsers/${uid}') && xiangqiServer.includes('chessActiveUsers/${uid}'));
check('server lock records game kind for both games', chessServer.includes('gameKind: "chess"') && xiangqiServer.includes('gameKind:"xiangqi"'));
check('Xiangqi recovery reports active Chess instead of creating Xiangqi', xiangqiSocket.includes('kind:"busy_other_game"') && xiangqiSocket.includes('gameKind:"chess"'));
const recover = xiangqiHost.slice(xiangqiHost.indexOf('const startOrRecover'), xiangqiHost.indexOf('useEffect(() => {\n    const offState'));
const busyIndex = recover.indexOf('recovered.data.kind === "busy_other_game"');
const recoveredOwnIndex = recover.indexOf('if (recovered.ok && (recovered.data.kind === "active"');
const firstForceHide = recover.indexOf('forceHideChessSurface()');
check('Xiangqi never clears Chess before busy-other-game arbitration', busyIndex >= 0 && recoveredOwnIndex > busyIndex && firstForceHide > recoveredOwnIndex);
check('new Xiangqi game clears only stale Chess presentation after accept succeeds', recover.indexOf('if (!accepted.ok)') >= 0 && recover.lastIndexOf('forceHideChessSurface()') > recover.indexOf('if (!accepted.ok)'));

// Focus opening must not silently fail due to a transient zero-size viewport.
const geometry = focus.slice(focus.indexOf('const buildFocusOverlayGeometry'), focus.indexOf('const closeFocusOverlay'));
check('Focus geometry no longer returns null on transient zero viewport', !geometry.includes('viewport.width <= 0') && !geometry.includes('return null'));
check('Focus geometry falls back to route root dimensions', geometry.includes('rootLocalFrameRef.current.width') && geometry.includes('rootLocalFrameRef.current.height'));
check('Focus still reuses hot BSH scene synchronously', focus.includes('const hotVisual = getHotFocusVisual(personId);') && focus.includes('visual: hotVisual') && focus.includes('visualReady: true'));

for (const rel of [
  'src/app/_layout.tsx',
  'src/components/games/useBoardGameSoundscape.ts',
  'src/components/system/BloomSurfaceStack.tsx',
  'src/app/(home)/(games)/home-games.tsx',
  'src/app/(chess)/chess-game/[gameId].tsx',
  'src/app/(xiangqi)/xiangqi-preview.tsx',
  'src/components/xiangqi/XiangqiSurfaceHost.tsx',
  'src/components/familyGraph/FamilyGraphPrototype.tsx',
]) check(`syntax ${rel}`, syntax(rel));

const pkg = JSON.parse(read('package.json'));
const clean = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const debug = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const release = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
check('package registers P2.16.3 gate', pkg.scripts?.['phaseP2_16_3:check'] === 'node ./scripts/test-phase-p2_16_3-game-session-audio-focus-recovery.js');
check('copy-over updater runs P2.16.3 gate', clean.includes('test-phase-p2_16_3-game-session-audio-focus-recovery.js'));
check('Debug Android build runs P2.16.3 gate', debug.includes('phaseP2_16_3:check'));
check('Release Android build runs P2.16.3 gate', release.includes('phaseP2_16_3:check'));

console.log(`\nFamily Bloom P2.16.3 Session/Audio/Focus Recovery: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
