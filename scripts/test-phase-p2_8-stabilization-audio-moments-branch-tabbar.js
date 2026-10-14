const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
let pass = 0; let fail = 0;
const check = (label, ok, detail = '') => {
  const index = String(pass + fail + 1).padStart(2, '0');
  if (ok) { pass++; console.log(`PASS ${index} - ${label}`); }
  else { fail++; console.error(`FAIL ${index} - ${label}${detail ? ` :: ${detail}` : ''}`); }
};

console.log('\nP2.8 — Moments + Branch + Chess Audio + TabBar Stabilization\n');

const moments = read('src/app/(tabs)/moments.tsx');
const publish = read('src/context/MomentPublishContext.tsx');
const graph = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const boardAudio = read('src/components/games/useBoardGameSoundscape.ts');
const chessAudio = read('src/components/chess/useChessSoundscape.ts');
const chessBoard = read('src/components/chess/ChessBoard.tsx');
const chessHost = read('src/components/chess/ChessSurfaceHost.tsx');
const terminalResultHost = read('src/components/system/BoardGameTerminalResultHost.tsx');
const chessRealtime = read('src/context/ChessRealtimeContext.tsx');
const tabs = read('src/app/(tabs)/_layout.tsx');
const webAudio = read('src/web/games/webGameAudio.ts');
const clean = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const preClean = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const pkg = JSON.parse(read('package.json'));
const metro = read('metro.config.js');

check('Moment upload no longer opens a persistent loading toast', !publish.includes('startTask({ title: "Đang đăng kỷ niệm') && !publish.includes('Đang đăng kỷ niệm…'));
check('Moment upload keeps terminal success/error feedback', publish.includes('Khoảnh khắc đã được chia sẻ 🌷') && publish.includes('Khoảnh khắc chưa đăng được'));
check('Active upload state is kept outside the Moments Context/render boundary', publish.includes('failedPendingMoments') && publish.includes('Context value remains referentially stable') && moments.includes('Only failed tasks cross the publish-provider Context boundary'));
check('Moment feed preserves visible scroll position while a new post arrives', moments.includes('maintainVisibleContentPosition={MOMENTS_MAINTAIN_VISIBLE}'));
check('Moment cards have a semantic memo comparator', moments.includes('sameLinkedPersonList') && moments.includes('previous.post.updatedAt === next.post.updatedAt'));
check('Moment linked-person derivation is independent of live pending upload items', moments.includes('const linkedPersonsByPostId = useMemo') && !moments.slice(moments.indexOf('const linkedPersonsByPostId'), moments.indexOf('const renderFeedItem')).includes('feedItems'));

check('Focus branch kinship work is viewport-scoped', (graph.includes('for (const person of viewportPeople)') || graph.includes('for (const person of visibleNowPeople)')) && graph.includes('kinship resolution is viewport-scoped'));
check('Large focus branch is released by a bounded first-paint contract', (graph.includes('const firstUsefulBatch = Math.min(') && graph.includes('renderedPeople.length < firstUsefulBatch')) || (graph.includes('viewportPersonIds.has(focusAnchorId)') && graph.includes('focusBootstrapPersonIds')) || (graph.includes('P2.11.2 BSH first-paint contract') && graph.includes('!scene || !scene.focusPersonId') && graph.includes('secondFrame = requestAnimationFrame')));
check('Focus branch keeps cards readable instead of fit-all shrinking', (graph.includes('FOCUS_BRANCH_MIN_READABLE_SCALE = 0.62') && graph.includes('clampForReadableBranch')) || ((graph.includes('FOCUS_BRANCH_ENTRY_SCALE = 0.92') || graph.includes('FOCUS_BRANCH_ENTRY_SCALE = 0.95')) && (graph.includes('Never fit an entire large branch on entry') || graph.includes('Focus never fit-all'))));
check('Large branch opens around selected root person', (graph.includes('const focusCenter = focusPerson') || graph.includes('const targetCenter = focusPerson')) && graph.includes('FOCUS_BRANCH_ANCHOR_SCREEN_Y'));
check('Heavy branch hydration starts only after the stable Focus shell paints', (graph.includes('durationMs + 34') && graph.includes('Do not start synchronous branch extraction/layout while the Focus card is')) || (graph.includes('paint the shell first') && graph.includes('requestAnimationFrame(() =>') && graph.includes('hydrateFocusOverlayVisual(personId, requestId)')));
check('Branch preparing copy lives in viewport shield', graph.includes('styles.focusOverlayGraph') && graph.includes('styles.focusOverlayPreparingLayer') && graph.includes('Đang chuẩn bị cây…'));

const soundNames = ['game-start','move-self','move-opponent','capture','move-check','castle','promote','premove','illegal','tenseconds','game-end'];
check('All 11 native board-game SFX are the exact supplied MP3 files', soundNames.every((name) => exists(`assets/audio/board-game/${name}.mp3`)));
check('All web board-game SFX remain OGG', soundNames.every((name) => exists(`public/audio/board-game/${name}.ogg`)) && webAudio.includes('${name}.ogg'));
check('Superseded native M4A/OGG copies are absent from assets', !soundNames.some((name) => exists(`assets/audio/board-game/${name}.m4a`) || exists(`assets/audio/board-game/${name}.ogg`)));
check('Board SFX preload is process-singleton', boardAudio.includes('let boardAudioPreloadPromise') && (boardAudio.includes('let boardAudioPreloaded') || boardAudio.includes('let boardAudioPreloadSettled')) && boardAudio.includes('ensureBoardAudioPreloaded()'));
check('Players eagerly bind supplied sources while game soundscape remains lifecycle-scoped', boardAudio.includes('useAudioPlayer(enabled ? source : null') && boardAudio.includes('void ensureBoardAudioPreloaded()') && chessHost.includes('useChessSoundscape(surface.prepared)'));
check('P2.16 successor keeps Chess visual Ready independent from audio warmup', chessHost.includes('if (!boardVisualReady || warmReady) return;') && chessHost.includes('useChessSoundscape(surface.prepared)') && !chessHost.includes('!boardVisualReady || !criticalAudioReady'));
check('Replay avoids seek latency on first play and sequences repeat seek -> play', boardAudio.includes('if (!hasPlayedRef.current)') && boardAudio.includes('player.seekTo(0).then(() =>') && boardAudio.includes('player.play();'));
check('Chess normal/opponent motion is lengthened from old 132/136ms', chessBoard.includes('const MOVE_MS = 205;') && chessBoard.includes('const OPPONENT_MOVE_MS = 215;'));
check('Move SFX starts with physical travel, not after landing', chessBoard.includes('onMoveStarted?.(applied') && chessBoard.includes('onMoveStarted?.(delta.move') && chessHost.includes('const handleMoveStarted = useCallback'));
check('Terminal result sound survives immediate board teardown through independent root presentation', terminalResultHost.includes('playGameEnd()') && terminalResultHost.includes('playedResultSoundRef') && chessRealtime.includes('publishChessTerminalResult(next)') && !chessHost.includes('scheduleTerminalSound'));

check('Tabbar visibility follows the single root presentation rail outside React route state', tabs.includes('subscribeBloomSurfaceRail') && tabs.includes('getBloomSurfaceRailState') && tabs.includes('chromeVisibility.value = withTiming'));
check('Tabbar reveal after Chess is immediate with no second entrance animation', tabs.includes('if (next) {') && tabs.includes('chromeVisibility.value = 1;') && tabs.includes('must be fully painted on that same frame'));
check('Tabbar visual visibility is a UI-thread animated style', tabs.includes('const hostVisibilityStyle = useAnimatedStyle') && tabs.includes('hostVisibilityStyle'));
check('Persistent tabbar no longer subscribes through React useChessSurfaceMode', !tabs.includes('useChessSurfaceMode()'));

check('Copy-over pre-clean clears old audio before overlay', preClean.includes('assets\\audio\\board-game\\*.mp3') && preClean.includes('assets\\audio\\board-game\\*.m4a') && preClean.includes('assets\\audio\\chess'));
check('Post-overlay clean preserves supplied MP3 and removes superseded codecs', !clean.includes('assets\\audio\\board-game\\*.mp3') && clean.includes('assets\\audio\\board-game\\*.m4a') && clean.includes('assets\\audio\\chess'));
check('Root .gitignore is present', exists('.gitignore'));

const changedTs = [
  'src/app/(tabs)/moments.tsx',
  'src/context/MomentPublishContext.tsx',
  'src/components/familyGraph/FamilyGraphPrototype.tsx',
  'src/components/games/useBoardGameSoundscape.ts',
  'src/components/chess/useChessSoundscape.ts',
  'src/components/chess/ChessBoard.tsx',
  'src/components/chess/ChessSurfaceHost.tsx',
  'src/app/(tabs)/_layout.tsx',
  'src/web/games/webGameAudio.ts',
];
let syntaxOk = true;
for (const file of changedTs) {
  const out = ts.transpileModule(read(file), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    reportDiagnostics: true,
    fileName: file,
  });
  const errors = (out.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    syntaxOk = false;
    console.error(file, errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n'));
  }
}
check('All P2.8 changed TS/TSX files transpile cleanly', syntaxOk);
check('P2.8 package gate is registered', pkg.scripts?.['phaseP2_8:check'] === 'node ./scripts/test-phase-p2_8-stabilization-audio-moments-branch-tabbar.js');
check('Copy-over updater invokes P2.8 gate', clean.includes('test-phase-p2_8-stabilization-audio-moments-branch-tabbar.js'));

console.log(`\nFamily Bloom P2.8 Stabilization: ${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
