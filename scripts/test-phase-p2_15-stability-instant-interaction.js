const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
let pass = 0;
let fail = 0;
function check(name, ok, detail = '') {
  if (ok) {
    pass += 1;
    console.log(`PASS ${String(pass).padStart(2, '0')} - ${name}`);
  } else {
    fail += 1;
    console.error(`FAIL -- ${name}${detail ? ` :: ${detail}` : ''}`);
  }
}
function syntax(rel) {
  const out = ts.transpileModule(read(rel), {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
    reportDiagnostics: true,
    fileName: rel,
  });
  return !(out.diagnostics || []).some((d) => d.category === ts.DiagnosticCategory.Error);
}
function sha(rel) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, rel))).digest('hex');
}

const prototype = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const scene = read('src/components/familyGraph/familyGraphSceneBuilder.ts');
const personSheet = read('src/components/familyGraph/FamilyGraphPersonSheet.tsx');
const audio = read('src/components/games/useBoardGameSoundscape.ts');
const chessAudio = read('src/components/chess/useChessSoundscape.ts');
const chessBoard = read('src/components/chess/ChessBoard.tsx');
const chessHost = read('src/components/chess/ChessSurfaceHost.tsx');
const stack = read('src/components/system/BloomSurfaceStack.tsx');
const sharedLifecycle = read('src/services/games/boardGameSurfaceLifecycle.ts');
const chessStore = read('src/services/chess/chessSurfaceStore.ts');
const xiangqiStore = read('src/services/xiangqi/xiangqiSurfaceStore.ts');
const chessRoute = read('src/app/(chess)/chess-game/[gameId].tsx');
const xiangqiRoute = read('src/app/(xiangqi)/xiangqi-preview.tsx');
const xiangqiHost = read('src/components/xiangqi/XiangqiSurfaceHost.tsx');
const xiangqiBoard = read('src/components/xiangqi/XiangqiGameBoard.tsx');
const hintTiming = read('src/components/games/hintTiming.ts');

// Focus View: prepared Focus Scene must commit atomically and survive snapshot identity churn.
check('Focus auto-fit seeds runtime with complete prepared scene',
  prototype.includes('surfaceMode === "focusOverlay" && autoFitOnMount ? scene.personIds : scene.bootstrapPersonIds'));
check('Focus retained runtime hydrates from atomic initial id set',
  prototype.includes('hydrateFamilyGraphRuntimeState(scene.sceneKey, initialRetainedPersonIds)'));
check('standard graph still keeps bootstrap spatial-retention path',
  prototype.includes(': scene.bootstrapPersonIds'));
check('cold Focus never prewarms branch work on Person detail',
  !prototype.includes('InteractionManager.runAfterInteractions') && prototype.includes('intentionally no Detail-screen Focus prewarm'));
check('cold Focus shell attaches before any revision-cache/topology work',
  prototype.includes('shell-first Focus') && prototype.includes('visual: null') && prototype.includes('setFocusOverlayVisible(true)'));
check('retained same-person Focus still reopens without remounting',
  prototype.includes('focusOverlay?.personId === personId && focusOverlay.visual') && prototype.includes('setFocusOverlayVisible(true)'));
check('scene cache is revision/fingerprint keyed, not WeakMap-only',
  scene.includes('revisionSceneCache') && scene.includes('fingerprintFamilyGraphSnapshot(snapshot)') && scene.includes('FAMILY_GRAPH_SCENE_VERSION'));
check('revision cache rebinds hot scene to replacement snapshot identity',
  scene.includes('bucket.set(snapshotSceneSlot(options), revisionHit)'));
check('Detail -> Focus uses real native dismiss boundary without unmounting Person first',
  prototype.includes('onDismiss={handlePersonSheetDismiss}') &&
  prototype.includes('visible={!!detailPerson && !detailFocusHandoffPending}') &&
  prototype.includes('dismissImmediately={detailFocusHandoffPending}'));
check('Person sheet forwards native dismiss/immediate props',
  personSheet.includes('onDismiss={onDismiss}') && personSheet.includes('dismissImmediately={dismissImmediately}'));
check('native dismiss handoff has short bounded vendor fallback only',
  prototype.includes('detailFocusHandoffFallbackRef') && prototype.includes('}, 96);'));
check('Focus hydration waits two painted frames after shell show',
  prototype.includes('Give the Focus shell + Back affordance two real frames') &&
  (prototype.match(/scheduleFocusFrame\(\(\) => \{/g) || []).length >= 2);
check('Focus loader copy describes tree preparation',
  prototype.includes('Đang chuẩn bị cây…'));

// One process-wide exact physical-board sound bank shared by both games.
const expected = {
  'capture.mp3': '7158a77f3eb9a763fe723e9c9291819de8748444a1192d10383159fd8175709b',
  'castle.mp3': 'da05719e6b3f0d04a2ac1a551e643ab14f4e840ae3b9410c0ea15ba4bcac5010',
  'game-end.mp3': '9b53d24c925bcc96b05ca4808ff1198293f0bb3422176927cef5d3a10c4c9023',
  'game-start.mp3': 'cdb01ddc68a1406abd065597ec604053dd9ea8e20636f27d41a6fe1d6b1a835d',
  'illegal.mp3': '3224eb7a6d93e52229ddcb49c62e584764d1474c123d25c91ecb2c74aa6291f9',
  'move-check.mp3': 'ef4764a74d19d0db1659e413e8afadc25f1e8cfba83a4a76e6e64f28f3077d52',
  'move-opponent.mp3': '0931855637e50e4edbc7916ec7a66cca2f0eee763e1c791ff774a9945517ea61',
  'move-self.mp3': '3a2eb75af1334c06dafd735c23388a560285e0df9436a44d27adc95a010a8547',
  'premove.mp3': '7d1057ba9537f92d20214028e6dd7e82f4c9c9fb607c6eb55e6f8cdc641f89af',
  'promote.mp3': '69219212aa2dce6031d6a641f8813779809bdff33562a8418d8e003eea465815',
  'tenseconds.mp3': '797b878fc67d1c368c661c5e78511edc0796b5aba2e959204213a9547ba1d277',
};
for (const [name, hash] of Object.entries(expected)) {
  const rel = `assets/audio/board-game/${name}`;
  check(`exact original sound ${name}`, exists(rel) && sha(rel) === hash);
}
check('wrong generated Chess WAV bank remains removed', !exists('assets/audio/chess'));
check('shared provider owns one 11-player bank',
  audio.includes('function useBoardGameAudioBank()') &&
  (audio.match(/useReliableAudioCue\(SOURCES\./g) || []).length === 11 &&
  audio.includes('export function BoardGameAudioProvider'));
check('root persistent surface stack owns shared audio provider',
  stack.includes('<BoardGameAudioProvider enabled={backgroundWarmReady}>') &&
  stack.includes('<ChessSurfaceHost occludedByHigherSurface={policy.gamesOccluded} />') &&
  stack.includes('<XiangqiSurfaceHost occludedByHigherSurface={policy.gamesOccluded} />'));
check('audio bank warms after app first paint before either game route opens',
  stack.includes('<BoardGameAudioProvider enabled={backgroundWarmReady}>'));
check('Chess wrapper owns no independent native cue players',
  chessAudio.includes('useBoardGameSoundscape') && !chessAudio.includes('useAudioPlayer(') && !chessAudio.includes('useReliableAudioCue('));
check('audio recovery uses newest-request token to suppress stale async replay',
  audio.includes('playRequestRef') && audio.includes('requestId !== playRequestRef.current') && audio.includes('requestId === playRequestRef.current'));
check('detached audio recovery wakes only inside a current cue retry',
  audio.includes('if (retryCount > 0) ensureAttached()') && audio.includes('Date.now() - requestedAt > 140') && !audio.includes('pendingPlayRef'));
check('audio retry polling is bounded',
  audio.includes('elapsed >= 3000') && audio.includes('elapsed >= 700') && audio.includes('now - lastAttachAttemptAtRef.current < 480'));
check('local Chess cue is emitted before move animation/server confirmation',
  chessBoard.indexOf('onMoveStarted?.(applied') >= 0 &&
  chessBoard.indexOf('onMoveStarted?.(applied') < chessBoard.indexOf('const visualPromise = animateMove(applied'));
check('authoritative Chess confirmation preserves clientMoveId',
  chessBoard.includes('onMoveStarted?.(delta.move, !!delta.checkSquare, delta.clientMoveId)'));
check('Chess host dedupes local/authoritative cue by event id',
  chessHost.includes('acceptedMoveSoundIdsRef') && chessHost.includes('seen.has(eventId)') && chessHost.includes('seen.add(eventId)'));

// Shared persistent lifecycle for Chess + Xiangqi.
check('shared route owner token generator covers both board kinds',
  sharedLifecycle.includes('"chess" | "xiangqi"') && sharedLifecycle.includes('createBoardGameSurfaceOwnerId'));
check('shared stale-owner release guard exists', sharedLifecycle.includes('canReleaseBoardGameSurface'));
check('shared presentation-ready predicate exists', sharedLifecycle.includes('isBoardGameSurfacePresented'));
check('Chess store now tracks route owner id', chessStore.includes('ownerId: string | null') && chessStore.includes('canReleaseBoardGameSurface(state.ownerId, ownerId)'));
check('Xiangqi store uses same stale-owner guard', xiangqiStore.includes('canReleaseBoardGameSurface(state.ownerId, ownerId)'));
check('Chess route claims fresh shared owner token',
  chessRoute.includes('createBoardGameSurfaceOwnerId("chess")') && chessRoute.includes('activateChessSurface(gameId, "full", ownerId)'));
check('Chess stale blur can only minimize its own claim', chessRoute.includes('minimizeChessSurface(ownerId)'));
check('Xiangqi route claims fresh shared owner token',
  xiangqiRoute.includes('createBoardGameSurfaceOwnerId("xiangqi")') && xiangqiRoute.includes('showXiangqiSurfaceFull("route", ownerId)'));
check('Xiangqi stale blur can only hide its own claim', xiangqiRoute.includes('hideXiangqiSurface(ownerId)'));
check('cross-game exclusivity uses explicit force-hide APIs', chessRoute.includes('forceHideXiangqiSurface()') && xiangqiRoute.includes('forceHideChessSurface()'));

// Xiangqi board must be born ready like Chess, never empty/staged 8->18->26->32.
check('Xiangqi persistent host starts from full warm board',
  xiangqiHost.includes('const warmBoard = useMemo(() => createInitialXiangqiState(), [])') && xiangqiHost.includes('serverState?.board ?? warmBoard'));
check('Xiangqi visibility uses shared presentation gate',
  xiangqiHost.includes('isBoardGameSurfacePresented(surface.presentationReady, surface.mode)'));
check('Xiangqi outer persistent host is memoized against provider rerenders',
  xiangqiHost.includes('export const XiangqiSurfaceHost = React.memo(function XiangqiSurfaceHost({'));
check('Xiangqi renders complete piece collection directly', xiangqiBoard.includes('{pieces.map((piece) =>'));
check('Xiangqi staged piece-count renderer is removed',
  !xiangqiBoard.includes('pieceRenderCount') && !xiangqiBoard.includes('Math.min(8') && !xiangqiBoard.includes('Math.min(18') && !xiangqiBoard.includes('Math.min(26'));
check('Xiangqi Ready still waits for layout + all piece assets + two frames',
  xiangqiBoard.includes('readyAssetIdsRef.current.size < pieces.length') &&
  xiangqiBoard.includes('requestAnimationFrame(() => requestAnimationFrame(() =>'));
const reveal = Number((hintTiming.match(/HINT_REVEAL_BUDGET_MS\s*=\s*(\d+)/) || [])[1]);
check('shared directional hint reveal remains <= 60ms', Number.isFinite(reveal) && reveal <= 60, String(reveal));
check('Xiangqi battle FX stays physically removed', !exists('src/components/xiangqi/XiangqiBattleEffects.tsx'));

for (const file of [
  'src/components/familyGraph/FamilyGraphPrototype.tsx',
  'src/components/familyGraph/FamilyGraphPersonSheet.tsx',
  'src/components/familyGraph/familyGraphSceneBuilder.ts',
  'src/components/games/useBoardGameSoundscape.ts',
  'src/components/system/BloomSurfaceStack.tsx',
  'src/services/games/boardGameSurfaceLifecycle.ts',
  'src/services/chess/chessSurfaceStore.ts',
  'src/services/xiangqi/xiangqiSurfaceStore.ts',
  'src/app/(chess)/chess-game/[gameId].tsx',
  'src/app/(xiangqi)/xiangqi-preview.tsx',
  'src/components/xiangqi/XiangqiSurfaceHost.tsx',
  'src/components/xiangqi/XiangqiGameBoard.tsx',
]) check(`syntax ${file}`, syntax(file));

console.log(`\nFamily Bloom P2.15 Stability + Instant Interaction: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
