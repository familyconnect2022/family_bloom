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

console.log('\nP2.17.1 — Xiangqi shared transport + Family Graph first-paint boundary\n');

const chessTransport = read('src/services/chess/chessSocketService.ts');
const xiangqiTransport = read('src/services/xiangqi/xiangqiSocketService.ts');
const xiangqiBootstrap = read('src/services/xiangqi/xiangqiSessionBootstrap.ts');
const xiangqiRoute = read('src/app/(xiangqi)/xiangqi-preview.tsx');
const graphScreen = read('src/app/(family)/(graph)/family-graph.tsx');
const sceneBuilder = read('src/components/familyGraph/familyGraphSceneBuilder.ts');
const pkg = JSON.parse(read('package.json'));
const clean = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

check('shared socket transport exposes protocol ACKs', chessTransport.includes('export type SocketProtocolAck') && chessTransport.includes('emitProtocolAck<T = undefined>'));
check('shared socket transport dispatches arbitrary protocol events', chessTransport.includes('socket.onAny((event, ...args) =>') && chessTransport.includes('this.protocolListeners.get(event)'));
check('Xiangqi delegates to the process-owned Chess transport', xiangqiTransport.includes('import { chessSocketService }') && xiangqiTransport.includes('return chessSocketService.connect()'));
check('Xiangqi no longer opens a second socket.io-client connection', !xiangqiTransport.includes('socket.io-client') && !xiangqiTransport.includes('io('));
check('Xiangqi prewake is shared too', xiangqiTransport.includes('return chessSocketService.prewake()'));
check('Xiangqi state stream rides the shared transport', xiangqiTransport.includes('onProtocol<XiangqiRealtimeState>(XIANGQI_EVENTS.gameState'));
check('Xiangqi move stream rides the shared transport', xiangqiTransport.includes('onProtocol<XiangqiMoveDelta>(XIANGQI_EVENTS.gameMoveApplied'));
check('Xiangqi reconnect callback rides the shared transport', xiangqiTransport.includes('return chessSocketService.on("connected", fn)'));
check('Xiangqi bootstrap remains server-confirmed before presentation', xiangqiBootstrap.includes('XIANGQI_EVENTS.sessionRecover') && xiangqiBootstrap.includes('XIANGQI_EVENTS.inviteAccept') && xiangqiRoute.indexOf('resolveOrCreateXiangqiSession') < xiangqiRoute.indexOf('openResolvedSession(result.state.gameId)'));
check('Xiangqi route still cannot directly wake legacy surface state', !/showXiangqiSurfaceFull|activateXiangqiSurface\(|hideXiangqiSurface\(/.test(xiangqiRoute));

check('Family Graph hot scene probe stays O(1) identity-only', graphScreen.includes('peekFamilyGraphRenderSceneIdentity(snapshot'));
check('Family Graph route no longer calls synchronous Full Tree builder', !graphScreen.includes('buildFamilyGraphRenderScene(snapshot, { mode: "fullTree"'));
check('Family Graph cold build is deferred until after first route frame', graphScreen.includes('const frame = requestAnimationFrame(() =>') && graphScreen.includes('buildFamilyGraphRenderSceneInterruptible('));
check('Family Graph cold build is cancellation-aware', graphScreen.includes('isCancelled: () => cancelled') && graphScreen.includes('cancelAnimationFrame(frame)'));
check('Family Graph never renders a scene from another snapshot/focus identity', graphScreen.includes('preparedVisual?.snapshot === snapshot') && graphScreen.includes('preparedVisual.focusPersonId === resolvedFocusId'));
check('Family Graph paints a visible loader shell while cold scene hydrates', graphScreen.includes(') : !visual ? (') && graphScreen.includes('Bloom đang mở phả hệ…'));
check('Focus branch work cannot start before Full Tree scene exists', graphScreen.includes('if (!queryEngine || !visual) return Promise.resolve(null)'));
check('interruptible BSH facade still supports Full Tree mode', sceneBuilder.includes('options.mode === "focusBranch"') && sceneBuilder.includes('buildFamilyGraphModel(snapshot, options)'));

for (const rel of [
  'src/services/chess/chessSocketService.ts',
  'src/services/xiangqi/xiangqiSocketService.ts',
  'src/app/(family)/(graph)/family-graph.tsx',
]) check(`syntax ${rel}`, syntax(rel));

check('package registers P2.17.1 gate', pkg.scripts?.['phaseP2_17_1:check'] === 'node ./scripts/test-phase-p2_17_1-xiangqi-shared-transport-family-graph-first-paint.js');
check('copy-over updater runs P2.17.1 gate', clean.includes('test-phase-p2_17_1-xiangqi-shared-transport-family-graph-first-paint.js'));
check('Debug Android build runs P2.17.1 gate', debugBat.includes('phaseP2_17_1:check'));
check('Release Android build runs P2.17.1 gate', releaseBat.includes('phaseP2_17_1:check'));

console.log(`\nFamily Bloom P2.17.1: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
