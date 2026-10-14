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

console.log('\nP2.10 — Branch Camera + Chess Actions + Native Audio + Xiangqi Icon\n');

const graph = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const config = read('src/constants/appConfiguration.ts');
const chess = read('src/components/chess/ChessSurfaceHost.tsx');
const audio = read('src/components/games/useBoardGameSoundscape.ts');
const games = read('src/app/(home)/(games)/home-games.tsx');
const metro = read('metro.config.js');
const preClean = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const clean = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const pkg = JSON.parse(read('package.json'));
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

// Genealogy Focus View: fixed readable entry camera + actual viewport culling.
check('Focus View has a dedicated tight viewport overscan', config.includes('focusViewportOverscanScreens: 0.24'));
check('Focus View has its own bounded progressive batch', config.includes('focusInitialBatch: 28') && config.includes('focusBatchSize: 24'));
check('Focus entry uses fixed readable scale, not whole-branch fit', (graph.includes('FOCUS_BRANCH_ENTRY_SCALE = 0.92') || graph.includes('FOCUS_BRANCH_ENTRY_SCALE = 0.95')) && (graph.includes('Never fit an entire large branch on entry') || graph.includes('Focus never fit-all')));
check('Focus camera opens around the selected Person', graph.includes('const targetCenter = focusPerson') && graph.includes('FOCUS_BRANCH_ANCHOR_SCREEN_Y'));
check('Initial culling camera matches the 42% visual anchor', graph.includes('FOCUS_BRANCH_ANCHOR_SCREEN_Y') && (graph.includes('const cameraCenterY = targetCenter.y') || graph.includes('getFamilyGraphCameraSnapshotFromTransform')));
check('Focus culling uses the dedicated small overscan', graph.includes('surfaceMode === "focusOverlay"') && graph.includes('FAMILY_GRAPH_RENDER_CONFIG.focusViewportOverscanScreens'));
check('React Person nodes are derived from viewportPersonIds', graph.includes('const viewportPeople = useMemo') && graph.includes('viewportPersonIds.has(person.id)'));
check('Focus visual-ready uses the successor first-paint contract after viewport measurement', graph.includes('P2.11.2 BSH first-paint contract') && graph.includes('viewport.width <= 0 || viewport.height <= 0'));
check('Focus visual-ready requires a prepared scene and applied entry camera', graph.includes('!hasCenteredInitially.current') && graph.includes('!scene || !scene.focusPersonId'));
check('Branch loading shield is absolute-fill inside graph viewport', graph.includes('focusOverlayGraph: { flex: 1') && graph.includes('focusOverlayPreparing: { ...StyleSheet.absoluteFillObject'));
check('Branch loading copy has its own centered preparation treatment', graph.includes('styles.focusOverlayPreparingInline') && graph.includes('Đang chuẩn bị cây…'));

// Chess actions: root-level hero surface, never a child dropdown under native board.
check('Old rail-local overflow menu is removed', !chess.includes('styles.overflowMenu') && !chess.includes('overflowMenu:'));
check('Game action panel is a root sibling after persistent content', chess.includes('P2.10 game actions live in the root screen coordinate system'));
check('Game action layer paints above board but below modal', chess.includes('gameActionLayer: { position: "absolute"') && chess.includes('zIndex: 15000') && chess.includes('zIndex: 20000'));
check('Chess actions use Cầu hòa and Xin thua wording', chess.includes('>Cầu hòa</Text>') && chess.includes('>Xin thua</Text>'));
check('Chess action hero has Bloom Super Hero treatment', chess.includes('BLOOM SUPER HERO') && chess.includes('gameActionGlowA') && chess.includes('gameActionSpark'));
check('Chess action hero animates independently on UI thread', chess.includes('actionMenuProgress') && chess.includes('withTiming(menuOpen ? 1 : 0') && chess.includes('interpolate(actionMenuProgress.value'));

// Native board audio: exact user-supplied MP3 set for Android, OGG retained for Web.
const soundNames = ['game-start','move-self','move-opponent','capture','move-check','castle','promote','premove','illegal','tenseconds','game-end'];
check('All 11 native SFX are supplied MP3 originals', soundNames.every((name) => exists(`assets/audio/board-game/${name}.mp3`)));
check('No superseded native OGG/M4A SFX remain', soundNames.every((name) => !exists(`assets/audio/board-game/${name}.ogg`) && !exists(`assets/audio/board-game/${name}.m4a`)));
check('Web keeps all 11 OGG SFX', soundNames.every((name) => exists(`public/audio/board-game/${name}.ogg`)));
const nativeBytes = soundNames.reduce((sum, name) => sum + fs.statSync(path.join(root, `assets/audio/board-game/${name}.mp3`)).size, 0);
check('Native supplied SFX pack is non-empty', nativeBytes > 32 * 1024, `${nativeBytes} bytes`);
check('Native soundscape references supplied MP3 assets', soundNames.every((name) => audio.includes(`${name}.mp3`)));
check('Preload result is not falsely marked successful on failure', audio.includes('Promise.allSettled') && audio.includes('boardAudioPreloadSucceeded = results.every'));
check('Long-lived players bind source eagerly with rate-limited replace recovery', audio.includes('useAudioPlayer(enabled ? source : null') && audio.includes('player.replace(source)') && audio.includes('lastAttachAttemptAtRef'));
check('Player readiness observes actual loaded cues with no timeout lie', audio.includes('loadedCount === cues.length') && !audio.includes('setPlayersReady(true)'));
check('First SFX play avoids asynchronous seek', audio.includes('if (!hasPlayedRef.current)') && audio.includes('player.play();') && audio.includes('hasPlayedRef.current = true'));
check('Repeat SFX sequences seek then play', audio.includes('player.seekTo(0).then(() =>') && audio.includes('if (requestId !== playRequestRef.current') && audio.includes('player.play();'));
check('Copy-over removes stale native OGG/M4A assets', preClean.includes('assets\\audio\\board-game\\*.m4a') && clean.includes('assets\\audio\\board-game\\*.m4a'));

// Xiangqi hub icon: independent PNG through RN Image, not expo-image WebP path.
check('Dedicated Xiangqi hub PNG exists', exists('assets/images/games/xiangqi-general-icon.png'));
check('Games hub renders Xiangqi icon through RN Image', games.includes('xiangqi-general-icon.png') && games.includes('accessibilityLabel="Quân Tướng cờ tướng"'));
check('Games hub no longer depends on XiangqiPiece for card icon', !games.includes('import { XiangqiPiece }'));
check('Xiangqi icon has explicit stable dimensions', games.includes('xiangqiPieceIcon: { width: 50, height: 50 }'));

// Syntax + delivery/governance.
const changedTs = [
  'src/components/familyGraph/FamilyGraphPrototype.tsx',
  'src/components/chess/ChessSurfaceHost.tsx',
  'src/components/games/useBoardGameSoundscape.ts',
  'src/app/(home)/(games)/home-games.tsx',
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
check('All P2.10 changed TS/TSX files transpile cleanly', syntaxOk);
check('P2.10 package gate is registered', pkg.scripts?.['phaseP2_10:check'] === 'node ./scripts/test-phase-p2_10-branch-camera-chess-actions-audio-xiangqi-icon.js');
check('Copy-over updater invokes P2.10 gate', clean.includes('test-phase-p2_10-branch-camera-chess-actions-audio-xiangqi-icon.js'));
check('Debug Android build invokes P2.10 gate', debugBat.includes('npm run phaseP2_10:check'));
check('Release Android build invokes P2.10 gate', releaseBat.includes('npm run phaseP2_10:check'));

console.log(`\nFamily Bloom P2.10: ${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
