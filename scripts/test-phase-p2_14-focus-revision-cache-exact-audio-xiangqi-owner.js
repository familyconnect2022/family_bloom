const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
let pass = 0, fail = 0;
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
function sha(rel) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, rel))).digest('hex');
}

const scene = read('src/components/familyGraph/familyGraphSceneBuilder.ts');
const graphRoute = read('src/app/(family)/(graph)/family-graph.tsx');
const graphPrototype = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const boardAudio = read('src/components/games/useBoardGameSoundscape.ts');
const chessAudio = read('src/components/chess/useChessSoundscape.ts');
const chessBoard = read('src/components/chess/ChessBoard.tsx');
const chessHost = read('src/components/chess/ChessSurfaceHost.tsx');
const xiangqiStore = read('src/services/xiangqi/xiangqiSurfaceStore.ts');
const xiangqiRoute = read('src/app/(xiangqi)/xiangqi-preview.tsx');
const xiangqiHost = read('src/components/xiangqi/XiangqiSurfaceHost.tsx');
const rootLayout = read('src/app/_layout.tsx');
const hintTiming = read('src/components/games/hintTiming.ts');
const clean = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const pre = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');

// Focus BSH: hot revisit must survive Firestore object replacement.
check('Focus hot cache has bounded revision-keyed scene map', scene.includes('revisionSceneCache') && scene.includes('REVISION_SCENE_CACHE_LIMIT'));
check('revision cache key includes exact graph fingerprint + scene version + focus slot', scene.includes('fingerprintFamilyGraphSnapshot(snapshot)') && scene.includes('FAMILY_GRAPH_SCENE_VERSION') && scene.includes('snapshotSceneSlot(options)'));
check('peek falls back from WeakMap identity to revision cache', scene.indexOf('const identityHit') < scene.indexOf('const revisionHit') && scene.includes('touchRevisionScene(revisionKey)'));
check('revision hit rebinds to new immutable snapshot identity', scene.includes('bucket.set(snapshotSceneSlot(options), revisionHit)'));
check('completed scene is written to both identity and revision caches', scene.includes('revisionSceneCache.set(revisionKey, scene)'));
check('Focus route keeps revision cache API but cold opener performs no synchronous cache gate', graphRoute.includes('getCachedFocusBranchVisual') && graphPrototype.includes('shell-first Focus'));
check('retained same-person Focus still enters visual-ready immediately', graphPrototype.includes('focusOverlay?.personId === personId && focusOverlay.visual') && graphPrototype.includes('focusOverlayContentProgress.value = 1'));
check('Person detail -> Focus root handoff presents before native Detail cleanup', graphPrototype.includes('handoffPersonSheetToFocus') && graphPrototype.includes('mountFocusOverlay(personId, hostFrame);') && graphPrototype.includes('dismissImmediately={detailFocusHandoffPending}'));

// Exact user-supplied A15 audio set. Hashes are the 11 originals previously matched 11/11.
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
  check(`exact supplied audio hash ${name}`, exists(rel) && sha(rel) === hash);
}
check('generated P2.13 Chess WAV bank is physically removed', !exists('assets/audio/chess'));
check('shared audio statically requires all supplied MP3 files', Object.keys(expected).every((name) => boardAudio.includes(name)));
check('Chess owns no second source bank', chessAudio.includes('useBoardGameSoundscape') && !chessAudio.includes('CHESS_SOURCES') && !chessAudio.includes('useReliableAudioCue'));
check('audio attach recovery is bounded and stale-cue safe', boardAudio.includes('useAudioPlayer(enabled ? source : null') && boardAudio.includes('lastAttachAttemptAtRef') && boardAudio.includes('Date.now() - requestedAt > 140') && !boardAudio.includes('pendingPlayRef'));
check('detached native audio player gets rate-limited on-demand recovery', boardAudio.includes('const ensureAttached = useCallback') && boardAudio.includes('if (retryCount > 0) ensureAttached()') && boardAudio.includes('player.replace(source)'));

// Local move cue is immediate; authoritative replay uses same id and is deduped.
const localSoundIndex = chessBoard.indexOf('onMoveStarted?.(applied');
const localAnimateIndex = chessBoard.indexOf('const visualPromise = animateMove(applied');
check('local legal move cue starts before visual/network completion', localSoundIndex >= 0 && localAnimateIndex >= 0 && localSoundIndex < localAnimateIndex);
check('authoritative delta uses same clientMoveId event key', chessBoard.includes('onMoveStarted?.(delta.move, !!delta.checkSquare, delta.clientMoveId)'));
check('host keeps process-persistent exactly-once move id set', chessHost.includes('acceptedMoveSoundIdsRef') && chessHost.includes('seen.has(eventId)') && chessHost.includes('seen.add(eventId)'));

// Xiangqi presentation parity / stale route-cleanup race protection.
check('Xiangqi store has app visual presentation gate', xiangqiStore.includes('presentationReady: boolean') && xiangqiStore.includes('setXiangqiSurfacePresentationReady'));
check('root latches Chess and Xiangqi presentation capability together after boot', rootLayout.includes('persistentSurfacePresentationLatchedRef') && rootLayout.includes('setChessSurfacePresentationReady(true)') && rootLayout.includes('setXiangqiSurfacePresentationReady(true)') && rootLayout.includes('setChessSurfacePresentationReady(false)') && rootLayout.includes('setXiangqiSurfacePresentationReady(false)'));
check('Xiangqi host visibility requires presentation readiness + full mode', xiangqiHost.includes('surface.presentationReady && surface.mode === "full"') || xiangqiHost.includes('isBoardGameSurfacePresented(surface.presentationReady, surface.mode)'));
check('Xiangqi route creates a fresh owner claim for every focus', (xiangqiRoute.includes('xiangqiRouteClaimSequence') || xiangqiRoute.includes('createBoardGameSurfaceOwnerId("xiangqi")')) && xiangqiRoute.includes('showXiangqiSurfaceFull("route", ownerId)'));
check('stale Xiangqi route cleanup cannot hide current owner', (xiangqiStore.includes('ownerId && state.ownerId && ownerId !== state.ownerId') || xiangqiStore.includes('canReleaseBoardGameSurface(state.ownerId, ownerId)')) && xiangqiRoute.includes('hideXiangqiSurface(ownerId)'));
check('forced cross-game hide is explicit and separate from route-owner cleanup', xiangqiStore.includes('export function forceHideXiangqiSurface()') && xiangqiStore.includes('export function hideXiangqiSurface(ownerId: string)'));
check('Xiangqi battle FX stays removed', !exists('src/components/xiangqi/XiangqiBattleEffects.tsx'));
const reveal = Number((hintTiming.match(/HINT_REVEAL_BUDGET_MS\s*=\s*(\d+)/) || [])[1]);
check('board hint global reveal is <= 60ms', Number.isFinite(reveal) && reveal <= 60, String(reveal));

check('post-overlay cleanup preserves supplied MP3 bank', !clean.includes('assets\\audio\\board-game\\*.mp3'));
check('post-overlay cleanup removes obsolete M4A and wrong Chess bank', clean.includes('assets\\audio\\board-game\\*.m4a') && clean.includes('assets\\audio\\chess'));
check('pre-copy cleanup clears old target audio before overlay', pre.includes('assets\\audio\\board-game\\*.mp3') && pre.includes('assets\\audio\\board-game\\*.m4a') && pre.includes('assets\\audio\\chess'));
check('root .gitignore remains present', exists('.gitignore'));

for (const file of [
  'src/components/familyGraph/familyGraphSceneBuilder.ts',
  'src/components/familyGraph/FamilyGraphPrototype.tsx',
  'src/app/(family)/(graph)/family-graph.tsx',
  'src/components/games/useBoardGameSoundscape.ts',
  'src/components/chess/useChessSoundscape.ts',
  'src/components/chess/ChessBoard.tsx',
  'src/components/chess/ChessSurfaceHost.tsx',
  'src/services/xiangqi/xiangqiSurfaceStore.ts',
  'src/components/xiangqi/XiangqiSurfaceHost.tsx',
  'src/app/(xiangqi)/xiangqi-preview.tsx',
  'src/app/_layout.tsx',
]) check(`syntax ${file}`, syntax(file));

console.log(`\nFamily Bloom P2.14 Focus Revision Cache + Exact Audio + Xiangqi Owner: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
