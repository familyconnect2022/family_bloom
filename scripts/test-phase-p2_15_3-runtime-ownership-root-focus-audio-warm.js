#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
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
const focusHost = read('src/components/familyGraph/FamilyGraphFocusSurfaceHost.tsx');
const focusStore = read('src/services/presentation/familyGraphFocusSurfaceStore.ts');
const stack = read('src/components/system/BloomSurfaceStack.tsx');
const audio = read('src/components/games/useBoardGameSoundscape.ts');
const chessHost = read('src/components/chess/ChessSurfaceHost.tsx');
const chessBoard = read('src/components/chess/ChessBoard.tsx');
const xiangqiHost = read('src/components/xiangqi/XiangqiSurfaceHost.tsx');
const xiangqiStore = read('src/services/xiangqi/xiangqiSurfaceStore.ts');
const chessStore = read('src/services/chess/chessSurfaceStore.ts');
const chessRoute = read('src/app/(chess)/chess-game/[gameId].tsx');
const xiangqiRoute = read('src/app/(xiangqi)/xiangqi-preview.tsx');
const clean = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const debug = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const release = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
const pkg = JSON.parse(read('package.json'));

console.log('\nP2.15.3 — Runtime Ownership + Persistent Root Focus + Audio Warm\n');

check('Focus root store source exists', exists('src/services/presentation/familyGraphFocusSurfaceStore.ts'));
check('Focus root host source exists', exists('src/components/familyGraph/FamilyGraphFocusSurfaceHost.tsx'));
check('root stack mounts exactly one Focus host in modal plane',
  (stack.match(/<FamilyGraphFocusSurfaceHost\s*\/>/g) || []).length === 1 &&
  stack.indexOf('<FamilyGraphFocusSurfaceHost />') > stack.indexOf('styles.modalLayer'));
check('Focus no longer creates native Modal window', !/<Modal\s+[\s\S]*?visible=\{focusOverlayVisible\}/m.test(prototype));
check('Focus owner publishes typed root snapshots',
  prototype.includes('publishFamilyGraphFocusSurface') && focusStore.includes('FamilyGraphFocusSurfaceSnapshot'));
check('hidden Focus stays mounted instead of unmounting Scene tree',
  focusHost.includes('if (!snapshot) return null') && focusHost.includes('opacity: 0') && focusHost.includes('pointerEvents={snapshot.visible ? "auto" : "none"}'));
check('same-person retained Scene hot path remains intact',
  prototype.includes('focusOverlay?.personId === personId && focusOverlay.visual') && prototype.includes('setFocusOverlayVisible(true)'));
check('Focus hydration starts from post-commit effect, not native onShow',
  prototype.includes('No native onShow exists anymore') && prototype.includes('handleFocusOverlayShown();'));
check('Detail handoff makes Focus visible before Detail cleanup',
  prototype.includes('mountFocusOverlay(personId, hostFrame);') &&
  prototype.indexOf('mountFocusOverlay(personId, hostFrame);') < prototype.indexOf('setDetailPersonId(null);', prototype.indexOf('const handoffPersonSheetToFocus')));
check('root Focus owner is released only when graph owner unmounts',
  prototype.includes('releaseFamilyGraphFocusSurface(focusRootOwnerIdRef.current!)'));
check('Focus store transports data/callbacks, never ReactNode', !focusStore.includes('ReactNode'));

check('board audio bank warms after app first paint',
  stack.includes('<BoardGameAudioProvider enabled={backgroundWarmReady}>') && !stack.includes('useChessSurfacePrepared') && !stack.includes('useXiangqiSurfacePrepared'));
check('exactly one 11-cue native bank remains', (audio.match(/useReliableAudioCue\(SOURCES\./g) || []).length === 11);
check('stale cold audio requests have bounded age',
  audio.includes('Date.now() - requestedAt > 140') && audio.includes('retryCount < 3'));
check('stale cue is discarded instead of replayed late',
  !audio.includes('pendingPlayRef.current = true') && audio.includes('requestId !== playRequestRef.current'));
check('replay still rewinds to native zero', audio.includes('player.seekTo(0)'));
check('Chess local move cue still starts before animation/network RTT',
  chessBoard.indexOf('onMoveStarted?.(applied') >= 0 && chessBoard.indexOf('onMoveStarted?.(applied') < chessBoard.indexOf('const visualPromise = animateMove(applied'));
check('Chess local/server duplicate protection still uses clientMoveId',
  chessHost.includes('acceptedMoveSoundIdsRef') && chessBoard.includes('delta.clientMoveId'));
check('castle semantic supports flags and SAN',
  chessHost.includes('move.flags.includes("k")') && chessHost.includes('move.flags.includes("q")') && chessHost.includes('/^O-O(?:-O)?[+#]?$/.test(move.san)'));
check('finished-state fallback still schedules terminal cue',
  chessHost.includes('state.status !== "finished"') && chessHost.includes('scheduleTerminalSound(surface.gameId'));

check('Xiangqi host never hides presentation on auth/family churn',
  !xiangqiHost.includes('hideXiangqiSurface(') && xiangqiHost.includes('host never releases presentation ownership'));
check('Xiangqi route cleanup requires its owner token',
  xiangqiStore.includes('export function hideXiangqiSurface(ownerId: string)') && xiangqiRoute.includes('hideXiangqiSurface(ownerId)'));
check('Xiangqi cross-game force hide is explicit',
  xiangqiStore.includes('export function forceHideXiangqiSurface()') && chessRoute.includes('forceHideXiangqiSurface()'));
check('Chess cross-game force hide is explicit and symmetric',
  chessStore.includes('export function forceHideChessSurface()') && xiangqiRoute.includes('forceHideChessSurface()'));
check('stale owner guard remains active on both stores',
  xiangqiStore.includes('canReleaseBoardGameSurface(state.ownerId, ownerId)') &&
  chessStore.includes('canReleaseBoardGameSurface(state.ownerId, ownerId)'));

for (const rel of [
  'src/services/presentation/familyGraphFocusSurfaceStore.ts',
  'src/components/familyGraph/FamilyGraphFocusSurfaceHost.tsx',
  'src/components/familyGraph/FamilyGraphPrototype.tsx',
  'src/components/system/BloomSurfaceStack.tsx',
  'src/components/games/useBoardGameSoundscape.ts',
  'src/components/chess/ChessSurfaceHost.tsx',
  'src/services/chess/chessSurfaceStore.ts',
  'src/components/xiangqi/XiangqiSurfaceHost.tsx',
  'src/services/xiangqi/xiangqiSurfaceStore.ts',
  'src/app/(chess)/chess-game/[gameId].tsx',
  'src/app/(xiangqi)/xiangqi-preview.tsx',
]) check(`syntax ${rel}`, syntax(rel));

check('package registers P2.15.3 gate', pkg.scripts?.['phaseP2_15_3:check'] === 'node ./scripts/test-phase-p2_15_3-runtime-ownership-root-focus-audio-warm.js');
check('copy-over updater runs P2.15.3 gate', clean.includes('test-phase-p2_15_3-runtime-ownership-root-focus-audio-warm.js'));
check('Debug Android build runs P2.15.3 gate', debug.includes('npm run phaseP2_15_3:check'));
check('Release Android build runs P2.15.3 gate', release.includes('npm run phaseP2_15_3:check'));

console.log(`\nFamily Bloom P2.15.3 Runtime Ownership Finalization: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
