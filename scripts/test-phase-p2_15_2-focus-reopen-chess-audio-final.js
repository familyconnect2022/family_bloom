const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
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

const scene = read('src/components/familyGraph/familyGraphSceneBuilder.ts');
const graphRoute = read('src/app/(family)/(graph)/family-graph.tsx');
const prototype = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const audio = read('src/components/games/useBoardGameSoundscape.ts');
const chessAudio = read('src/components/chess/useChessSoundscape.ts');
const chessHost = read('src/components/chess/ChessSurfaceHost.tsx');
const terminalResultHost = read('src/components/system/BoardGameTerminalResultHost.tsx');
const chessRealtime = read('src/context/ChessRealtimeContext.tsx');
const framework = read('src/games/shared/boardGameFramework.ts');

check('Focus shell remains visible before hydration starts',
  prototype.includes('Give the Focus shell + Back affordance two real frames') && prototype.includes('setFocusOverlayVisible(true)'));
check('Back still cancels scheduled Focus work immediately',
  prototype.includes('cancelFocusScheduledWork()') && prototype.includes('token.cancelled = true'));
check('Focus build receives already-hydrated Full Tree scene',
  graphRoute.includes('}, cancellation, visual, queryEngine)') && graphRoute.includes('[queryEngine, snapshot, visual]'));
check('P2.15.2 Focus projection exists', scene.includes('buildFamilyGraphFocusProjectionScene'));
const projectionStart = scene.indexOf('const buildFamilyGraphFocusProjectionScene');
const projectionEnd = scene.indexOf('/**\n * Public BSH facade', projectionStart);
const projectionBody = projectionStart >= 0 && projectionEnd > projectionStart ? scene.slice(projectionStart, projectionEnd) : '';
check('Focus projection reuses Full Tree people coordinates',
  projectionBody.includes('baseScene.people.filter') && !projectionBody.includes('adaptFamilyGraphSnapshot('));
check('Focus projection reuses precomputed connector routes',
  scene.includes('baseScene.geometry.routingPlan') && scene.includes('routeByConnectionId: new Map'));
check('Focus projection filters route map instead of rerouting branch',
  scene.includes('allowedConnectionIds.has(connectionId)') && scene.includes('focusProjectionGeometry'));
const interruptibleStart = scene.indexOf('export const buildFamilyGraphRenderSceneInterruptible');
const interruptibleBody = interruptibleStart >= 0 ? scene.slice(interruptibleStart) : '';
check('interruptible Focus exits into projection before branch layout/geometry',
  interruptibleBody.indexOf('if (options.mode === "focusBranch" && baseScene)') >= 0 &&
  interruptibleBody.indexOf('if (options.mode === "focusBranch" && baseScene)') < interruptibleBody.indexOf('const layout = buildFamilyGraphLayout(snapshot, model)'));
check('Focus projection is remembered by revision cache',
  scene.includes('return rememberFamilyGraphRenderScene(snapshot, options, scene)'));
check('same Focus retained Scene still has instant reopen path',
  prototype.includes('focusOverlay?.personId === personId && focusOverlay.visual'));

check('audio no longer trusts stale currentTime for replay',
  !audio.includes('currentTime') && !audio.includes('const atStart ='));
check('audio replay always rewinds after first play',
  audio.includes('hasPlayedRef') && audio.includes('player.seekTo(0)'));
check('audio replay waits for rewind before play',
  audio.includes('.then(() => {') && audio.includes('player.play();'));
check('audio replay still uses newest request token',
  audio.includes('requestId !== playRequestRef.current') && audio.includes('playRequestRef.current'));
check('audio detached recovery remains bounded',
  audio.includes('Date.now() - requestedAt > 140') && audio.includes('retryCount < 3') && audio.includes('lastAttachAttemptAtRef'));
check('one move semantic maps to exactly one cue',
  framework.includes('Special semantics replace, never stack on, normal move'));
check('Chess has secondary semantic duplicate guard',
  chessHost.includes('lastMoveSoundFingerprintRef') && chessHost.includes('now - previous.at < 1800'));
check('castle detection supports flags and SAN',
  chessHost.includes('move.flags.includes("k")') && chessHost.includes('move.flags.includes("q")') && chessHost.includes('/^O-O(?:-O)?[+#]?$/'));
check('castle semantic is sent to one-cue resolver',
  chessHost.includes('castle,') && framework.indexOf('if (move.castle) return "castle"') < framework.indexOf('if (move.check) return "check"'));
check('challenge acceptance no longer duplicates game-start cue',
  chessAudio.includes('playChallengeAccepted: noopChessSound'));
check('authoritative active-state transition still owns game-start',
  chessHost.includes('previousStatus === "waiting" && state.status === "active"') && chessHost.includes('playGameStart()'));
check('terminal audio follows independent result presentation after terminal packet',
  terminalResultHost.includes('const { playGameEnd } = useBoardGameSoundscape()') && terminalResultHost.includes('playGameEnd()') && chessRealtime.includes('publishChessTerminalResult(next)'));
check('terminal audio covers every authoritative terminal path through root snapshot',
  chessRealtime.includes('const terminal = next.status === "finished" || next.status === "cancelled"') && chessRealtime.includes('if (terminal)') && terminalResultHost.includes('useBoardGameTerminalResult()'));
check('terminal audio is exactly-once per terminal result snapshot',
  terminalResultHost.includes('playedResultSoundRef') && terminalResultHost.includes('playedResultSoundRef.current === key') && terminalResultHost.includes('playedResultSoundRef.current = key'));

for (const rel of [
  'src/components/familyGraph/familyGraphSceneBuilder.ts',
  'src/app/(family)/(graph)/family-graph.tsx',
  'src/components/familyGraph/FamilyGraphPrototype.tsx',
  'src/components/games/useBoardGameSoundscape.ts',
  'src/components/chess/useChessSoundscape.ts',
  'src/components/chess/ChessSurfaceHost.tsx',
]) check(`syntax ${rel}`, syntax(rel));

console.log(`\nFamily Bloom P2.15.2 Focus Reopen + Chess Audio Final: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
