const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
let pass = 0, fail = 0;
function check(label, cond, detail='') {
  const n = String(pass + fail + 1).padStart(2,'0');
  if (cond) { pass++; console.log(`PASS ${n} - ${label}`); }
  else { fail++; console.log(`FAIL ${n} - ${label}${detail ? ` :: ${detail}` : ''}`); }
}

const tabs = read('src/app/(tabs)/_layout.tsx');
const moments = read('src/app/(tabs)/moments.tsx');
const pkg = JSON.parse(read('package.json'));
const phaseP1 = pkg.scripts?.['phaseP1:check'] === 'node ./scripts/test-phase-p1-android-performance-foundation.js';
const phaseP2_3 = pkg.scripts?.['phaseP2_3:check'] === 'node ./scripts/test-phase-p2_3-zero-work-tab-press.js';
const phaseP2_4 = pkg.scripts?.['phaseP2_4:check'] === 'node ./scripts/test-phase-p2_4-frozen-tab-surfaces.js';
const phaseP2_5 = pkg.scripts?.['phaseP2_5:check'] === 'node ./scripts/test-phase-p2_5-visual-ready-no-reload.js';
const phaseP2_7 = pkg.scripts?.['phaseP2_7:check'] === 'node ./scripts/test-phase-p2_7-hard-isolated-tabbar-branch-visual-ready.js';
const phaseP2_8 = pkg.scripts?.['phaseP2_8:check'] === 'node ./scripts/test-phase-p2_8-stabilization-audio-moments-branch-tabbar.js';
const phaseP2_12_4 = pkg.scripts?.['phaseP2_12_4:check'] === 'node ./scripts/test-phase-p2_12_4-build-integrity-chess-audio.js';
const phaseP2_13 = pkg.scripts?.['phaseP2_13:check'] === 'node ./scripts/test-phase-p2_13-focus-audio-xiangqi-exclusive-runtime.js';
const phaseP2_15 = pkg.scripts?.['phaseP2_15:check'] === 'node ./scripts/test-phase-p2_15-stability-instant-interaction.js';
const phaseP2_16 = pkg.scripts?.['phaseP2_16:check'] === 'node ./scripts/test-phase-p2_16-route-owned-presentation-paint-ack.js';
const phaseP2_17 = pkg.scripts?.['phaseP2_17:check'] === 'node ./scripts/test-phase-p2_17-presentation-rail-single-owner.js';
const post = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
const buttonEnd = phaseP2_7 ? tabs.indexOf('function PersistentBloomTabBarHost') : tabs.indexOf('function BloomSlidingTabBar');
const button = tabs.slice(Math.max(0,tabs.indexOf('const BloomTabButton')), buttonEnd);

check('Inactive native tab screens are explicitly kept attached', tabs.includes('detachInactiveScreens={false}'));
check('Main tab surface policy matches current successor', phaseP2_5 ? (tabs.includes('lazy: true') && tabs.includes('tabs:idle-prewarm:')) : tabs.includes('lazy: false'));
check('Inactive screen policy matches current persistent-surface successor', (phaseP2_4 || phaseP2_5) ? tabs.includes('freezeOnBlur: true') : !tabs.includes('freezeOnBlur: true'));
check('Screen transition remains centrally owned by Bloom motion config', tabs.includes('animation: BLOOM_MOTION.tabs.animation'));
check('Tab visual motion remains one SharedValue source', (phaseP2_7 ? tabs.includes('const indicatorIndex = useSharedValue(initialIndex)') : tabs.includes('const indicatorIndex = useSharedValue(state.index)')) && tabs.includes('indicatorIndex.value = withTiming(index'));
check('Indicator still uses the same SharedValue', tabs.includes('indicatorIndex.value * itemWidth'));
check('A17/A18 compatibility keeps indicator SharedValue isolated in tab bar', tabs.includes('indicatorIndex.value = withTiming(index') && !button.includes('indicatorIndex: SharedValue<number>'));
const glyphCount=phaseP2_3?(button.match(/<AnimatedIonicons/g)||[]).length:(button.match(/<Ionicons/g)||[]).length;
check('Tab icon architecture is either A17 overlay or A18 single glyph', glyphCount===1 || glyphCount===2, `glyphs=${glyphCount}`);
check('A18 single glyph uses one fixed 26x26 slot and cannot push another icon', glyphCount===2 || (tabs.includes('tabIconSlot:') && tabs.includes('width: TAB_ICON_SIZE') && tabs.includes('height: TAB_ICON_SIZE')));
check('A18 icon has no scale/overlay work', glyphCount===2 || (!button.includes('transform: [{ scale }]') && !tabs.includes('tabIconLayer:')));
check('A18 focused state changes only glyph color', glyphCount===2 || (phaseP2_3 ? button.includes('visualTargetIndex.value === index ? COLORS.white : COLORS.tabInactive') : button.includes('focused ? COLORS.white : COLORS.tabInactive')));
check('Pill geometry remains exactly A16 50x36 at y=11', tabs.includes('const TAB_INDICATOR_WIDTH = 50') && tabs.includes('const TAB_INDICATOR_HEIGHT = 36') && /slidingIndicator:[\s\S]{0,100}top: 11/.test(tabs));
check('Tab row geometry remains exactly 58px', phaseP2_7 ? (tabs.includes('const TAB_VISUAL_HEIGHT = 58') && tabs.includes('height: TAB_VISUAL_HEIGHT + bottomInset')) : (tabs.includes('height: 58') && tabs.includes('height: 58 + bottomInset')));
check('Optimistic press-in still starts motion before navigation commit', (tabs.includes('onPressIn={onPressIn}') || tabs.includes('onPressIn={() => onPressInIndex(index)}')) && tabs.includes('animateIndicatorTo(index)'));
check('Navigation state does not restart an accepted tab animation', phaseP2_7 ? (tabs.includes('if (latestRequested != null)') && tabs.includes('indicatorIndex.value = index') && tabs.includes('only after the pill has already finished')) : tabs.includes('if (optimisticIndexRef.current === state.index) return'));
check('Moments focus-wide render is deferred beyond 232ms tab motion', phaseP1 ? (moments.includes('useTabLiveState("moments")') && !moments.includes('screenFocusGateTimerRef')) : (moments.includes('screenFocusGateTimerRef') && (moments.match(/}, 280\);/g)||[]).length >= 2));
check('Moments no longer resumes visible-card realtime on the next animation frame', !/useFocusEffect\([\s\S]{0,450}requestAnimationFrame/.test(moments));
check('Moments focus timers are canceled on unmount/rapid switches', phaseP1 ? (!moments.includes('screenFocusGateTimerRef') && moments.includes('useTabLiveState("moments")')) : (moments.includes('clearTimeout(screenFocusGateTimerRef.current)') && moments.includes('screenFocusMountedRef.current')));

const protectedHashes = {
  'src/components/chess/ChessBoard.tsx':'a5e09a317a2f3eee9ac27c171b925c021c6270fc87e14601852ff14f7ba48eac',
  'src/components/chess/ChessSurfaceHost.tsx':'e99d8435c5b8dde50c1ba77259afa53888b78863b54444cc0f9db09c45eb98a0',
  'src/components/xiangqi/XiangqiGameBoard.tsx':'8885b9034c4f9366c6b75ce3256a6a9cbc5ff3ad07c56d2bd06746d66b1f15d3',
  'src/app/(xiangqi)/xiangqi-preview.tsx':'4486e90f481118461b1562f1130c4d66d64293b665d1dea10d9b0bccfd47906f',
  'server/src/socket/socketServer.ts':'c0d46d5e343d323effc0a06fef64f1cf424b2f27e38dbf080a66c0a00d6dd63a',
  'server/src/xiangqi/xiangqiGameManager.ts':'bacf1a3e73a81bdcdeecce9f215fae124b4dcd1a5f66ac243e8d5f3a9f9aa3ed',
  'firestore.rules':'a872b09e20259f22e04e8564d3f0c0722a895235bac2da71bf663c6c8b81222a',
  'firestore.indexes.json':'b88b9fab1c5db94017e0d1744abf0d1ca98979ef86bdefa2e6831fc0e49d429f',
};
for (const [file, expected] of Object.entries(protectedHashes)) {
  const p28ChessSuccessor = phaseP2_8 && (
    (file === 'src/components/chess/ChessBoard.tsx'
      && read(file).includes('onMoveStarted?.(applied')
      && read(file).includes('const MOVE_MS = 205;'))
    || (file === 'src/components/chess/ChessSurfaceHost.tsx'
      && read(file).includes('const handleMoveStarted = useCallback')
      && (read(file).includes('audioReady') || (phaseP2_12_4 && read(file).includes('if (!boardVisualReady || warmReady) return;'))))
  );
  const p213BoardGameSuccessor = phaseP2_13 && (
    (file === 'src/components/chess/ChessBoard.tsx'
      && read(file).includes('`${delta.gameId}:${delta.version}:${delta.clientMoveId}`')
      && !read(file).includes('onMoveStarted?.(applied'))
    || (file === 'src/app/(xiangqi)/xiangqi-preview.tsx'
      && read(file).includes('showXiangqiSurfaceFull("route")')
      && !read(file).includes('<XiangqiGameBoard'))
    || (file === 'server/src/socket/socketServer.ts'
      && read(file).includes('busy_other_game')
      && read(file).includes('gameKind: "xiangqi"'))
  );
  const p216RouteOwnedChess = file === 'src/components/chess/ChessSurfaceHost.tsx'
    && read(file).includes('routeOwnedPresentation')
    && read(file).includes('if (!boardVisualReady || warmReady) return;');
  const p216RouteOwnedXiangqi = file === 'src/app/(xiangqi)/xiangqi-preview.tsx'
    && read(file).includes('<XiangqiSurfaceHost routeOwnedPresentation')
    && read(file).includes('markRouteSurfaceShellPainted("xiangqi"')
    && read(file).includes('showXiangqiSurfaceFull("route", ownerIdRef.current)');
  const p217RailSuccessor = phaseP2_17 && (
    (file === 'src/components/chess/ChessSurfaceHost.tsx'
      && read(file).includes('rail.gamePresentation')
      && read(file).includes('left: -screenOrigin.x'))
    || (file === 'src/app/(xiangqi)/xiangqi-preview.tsx'
      && read(file).includes('claimAndPresentBoardGame')
      && read(file).includes('resolveOrCreateXiangqiSession')
      && !read(file).includes('<XiangqiGameBoard'))
  );
  const p216RouteOwnedSuccessor = phaseP2_16 && (p216RouteOwnedChess || p216RouteOwnedXiangqi);
  const p215BoardGameSuccessor = phaseP2_15 && (
    (file === 'src/components/chess/ChessSurfaceHost.tsx'
      && read(file).includes('const handleMoveStarted = useCallback')
      && read(file).includes('criticalAudioReady')
      && read(file).includes('!boardVisualReady || !criticalAudioReady || warmReady'))
    || (file === 'src/components/xiangqi/XiangqiGameBoard.tsx'
      && read(file).includes('{pieces.map((piece) =>')
      && !read(file).includes('pieceRenderCount'))
    || (file === 'src/app/(xiangqi)/xiangqi-preview.tsx'
      && read(file).includes('createBoardGameSurfaceOwnerId("xiangqi")')
      && read(file).includes('showXiangqiSurfaceFull("route", ownerId)')
      && read(file).includes('hideXiangqiSurface(ownerId)'))
  );
  check(`A16 game/server baseline unchanged or intentional current board-game successor: ${file}`, p217RailSuccessor || p216RouteOwnedSuccessor || p215BoardGameSuccessor || p213BoardGameSuccessor || p28ChessSuccessor || sha(file) === expected, sha(file));
}

for (const file of ['src/app/(tabs)/_layout.tsx','src/app/(tabs)/moments.tsx']) {
  const out = ts.transpileModule(read(file), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }, reportDiagnostics: true, fileName: file });
  check(`Syntax clean: ${file}`, !(out.diagnostics||[]).some((d) => d.category === ts.DiagnosticCategory.Error));
}

check('A17 package gate is registered', pkg.scripts?.['phase17_9a17:check'] === 'node ./scripts/test-phase17_9a17-native-persistent-tabbar.js');
check('Post-copy updater runs A17 gate', post.includes('test-phase17_9a17-native-persistent-tabbar.js'));
check('Debug Android build runs A17 gate', debugBat.includes('npm run phase17_9a17:check'));
check('Release Android build runs A17 gate', releaseBat.includes('npm run phase17_9a17:check'));
check('Current game aggregate includes A17', read('scripts/test-chess-current-build-gates.js').includes('test-phase17_9a17-native-persistent-tabbar.js'));

console.log(`\nPhase 17.9A17 Native-Persistent Tabbar: ${pass}/${pass+fail} PASS`);
process.exit(fail ? 1 : 0);
