const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const bytes = p => fs.readFileSync(path.join(root,p));
const sha = p => crypto.createHash('sha256').update(bytes(p)).digest('hex');
let pass=0, fail=0;
function check(label, ok, detail=''){ const n=String(pass+fail+1).padStart(2,'0'); if(ok){pass++;console.log(`PASS ${n} - ${label}`)} else {fail++;console.log(`FAIL ${n} - ${label}${detail?` :: ${detail}`:''}`)} }

const phase17_9aChess = fs.existsSync(path.join(root, 'src/components/chess/ChessSurfaceHost.tsx')) && read('package.json').includes('phase17_9a:check');
const phase17_9a9Server = read('package.json').includes('phase17_9a9:check') && fs.existsSync(path.join(root, 'server/src/chess/rematchProposalStore.ts'));
const phase17_9a15BoardGames = read('package.json').includes('phase17_9a15:check') && fs.existsSync(path.join(root, 'src/games/shared/boardGameFramework.ts'));
const tabs=read('src/app/(tabs)/_layout.tsx');
const planner=read('src/app/(tabs)/planner.tsx');
const hook=read('src/hooks/family/useFamilyEvents.ts');
const realtime=read('src/context/FamilyRealtimeContext.tsx');
const cache=read('src/services/event/eventEntityCache.ts');
const pkg=JSON.parse(read('package.json'));
const pre=bytes('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const post=bytes('Family_Bloom_CLEAN_APPLY_FULL.bat');
const preText=pre.toString('utf8');
const postText=post.toString('utf8');
const cleanup=read('scripts/setup/cleanup-overlay-routes.js');
const debugBat=read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat=read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

check('Bottom tab has optimistic UI-thread indicator helper', tabs.includes('const animateIndicatorTo = useCallback') && tabs.includes('indicatorIndex.value = withTiming'));
check('Bottom tab starts indicator motion on press-in', tabs.includes('onPressIn={onPressIn}') && tabs.includes('if (!focused) animateIndicatorTo(index)'));
check('Bottom tab navigation remains a separate commit step', tabs.includes('const onPress = () =>') && tabs.includes('navigation.navigate(route.name)'));
check('Navigation confirmation does not restart an already-running indicator', tabs.includes('if (optimisticIndexRef.current === state.index) return'));
check('Prevented tab press rolls indicator back', tabs.includes('if (event.defaultPrevented)') && tabs.includes('animateIndicatorTo(state.index, 135)'));
check('Bottom screen transition remains disabled', tabs.includes('animation: BLOOM_MOTION.tabs.animation'));

check('Planner owns one SharedValue mode progress', planner.includes('const plannerModeProgress = useSharedValue(0)'));
check('Planner persistent track is driven by useAnimatedStyle', planner.includes('const panelTrackStyle = useAnimatedStyle') && planner.includes('plannerModeProgress.value * panelWidthValue.value'));
check('Planner segment pill uses the same SharedValue', planner.includes('modeProgress: SharedValue<number>') && planner.includes('modeProgress.value * (itemWidth + gap)'));
check('Planner segment starts visual motion on press-in', planner.includes('onPressIn={() => onPreviewMode("calendar")}') && planner.includes('onPressIn={() => onPreviewMode("list")}'));
check('Planner press commit does not restart an already-running preview animation', planner.includes('plannerOptimisticModeRef.current !== nextMode') && planner.includes('if (plannerOptimisticModeRef.current !== nextMode) previewMode(nextMode)'));
check('Planner content mode remains React-owned for interaction/accessibility', planner.includes('pointerEvents={mode === "calendar" ? "auto" : "none"}') && planner.includes('pointerEvents={mode === "list" ? "auto" : "none"}'));
check('Calendar and Events panels remain persistently mounted', planner.includes('<CalendarPanel') && planner.includes('<EventsPanel') && planner.includes('<Animated.View'));
check('Persistent lists remain bounded', /const CalendarPanel[\s\S]*?initialNumToRender=\{4\}[\s\S]*?windowSize=\{5\}/.test(planner) && /const EventsPanel[\s\S]*?initialNumToRender=\{5\}[\s\S]*?windowSize=\{5\}/.test(planner));
check('No absolute/opacity VirtualizedList hiding regression', !planner.includes('StyleSheet.absoluteFillObject') && !planner.includes('styles.panelHidden'));

check('Shared event entity cache exists', cache.includes('familyCaches = new Map<string, FamilyEventCache>()'));
check('Entity cache is bounded by family count', cache.includes('MAX_FAMILY_CACHES = 2'));
check('Entity cache is bounded by event count', cache.includes('MAX_EVENTS_PER_FAMILY = 800'));
check('Canonical cache chooses event id/version', cache.includes('cache.entities.get(candidate.id)') && cache.includes('eventVersionTime(candidate)'));
check('Canonical list can reuse the previous array reference', cache.includes('canonicalizeFamilyEventsStable') && cache.includes('previous.every((event, index) => event === next[index])'));
check('Global upcoming realtime uses canonical event objects', realtime.includes('canonicalizeFamilyEventsStable(familyId, current.items, page.items)'));
check('Global yearly realtime uses canonical event objects', realtime.includes('setYearlyEvents((current) => canonicalizeFamilyEventsStable(familyId, current, items))'));
check('Planner month realtime uses canonical event objects', hook.includes('setMonthBase((current) => canonicalizeFamilyEventsStable(familyId, current, items))'));
check('Planner past realtime uses canonical event objects', hook.includes('setPastBase((current) => canonicalizeFamilyEventsStable(familyId, current, page.items))'));
check('Planner fallback upcoming/yearly use canonical references', hook.includes('canonicalizeFamilyEventsStable(familyId, current.items, page.items)') && hook.includes('setYearlyLocal((current) => canonicalizeFamilyEventsStable(familyId, current, items))'));
check('Planner pagination canonicalizes merged event pages', (hook.match(/canonicalizeFamilyEvents\(/g)||[]).length >= 4);
check('Month query remains independent for complete calendar coverage', hook.includes('calendarService.subscribeMonthRegular') && hook.includes('calendarService.subscribeMonth'));
check('Shared upcoming cache remains in use instead of a duplicate Planner listener', hook.includes('const useShared = !!familyId && shared?.familyId === familyId') && hook.includes('if (!familyId || !listEnabled || useShared) return'));
check('Large Firestore event arrays are not stored in SharedValue', !hook.includes('useSharedValue') && !realtime.includes('useSharedValue') && !cache.includes('useSharedValue'));

check('Phase 17.8D gate registered', pkg.scripts?.['phase17_8d:check']==='node ./scripts/test-phase17_8d-shared-event-ui-thread-navigation.js');
check('Post-copy updater runs Phase 17.8D gate directly', postText.includes('test-phase17_8d-shared-event-ui-thread-navigation.js'));
check('Debug build runs Phase 17.8D gate', debugBat.includes('npm run phase17_8d:check'));
check('Release build runs Phase 17.8D gate', releaseBat.includes('npm run phase17_8d:check'));
check('PRE-COPY retires stale Phase 17.8C report', preText.includes('PHASE_17_8C_BUILD_REPORT.md'));
check('Overlay cleanup retires stale Phase 17.8C report', cleanup.includes('PHASE_17_8C_BUILD_REPORT.md'));
check('Root BATs identify Phase 17.8D', (preText.includes('Phase 17.8D - Shared Event Store + UI-thread Navigation Chrome') || preText.includes('Phase 17.8E - Icon-only UI-thread Tab Bar') || (preText.includes('Phase 17.9A - Persistent Chess Surface') || (preText.includes('Phase 17.9A1 - Chess Stabilization') || preText.includes('Phase 17.9A2 - Chess Engine Separation') || (preText.includes('Phase 17.9A3 - Chess Overlay UI Repair') || (preText.includes('Phase 17.9A4 - Chess UI Rematch Hint Tabbar') || preText.includes('Phase 17.9A5 - Chess Surface Layer Geometry Tabbar')))))) && (postText.includes('Phase 17.8D - Shared Event Store + UI-thread Navigation Chrome') || postText.includes('Phase 17.8E - Icon-only UI-thread Tab Bar') || (postText.includes('Phase 17.9A - Persistent Chess Surface') || (postText.includes('Phase 17.9A1 - Chess Stabilization') || postText.includes('Phase 17.9A2 - Chess Engine Separation') || (postText.includes('Phase 17.9A3 - Chess Overlay UI Repair') || (postText.includes('Phase 17.9A4 - Chess UI Rematch Hint Tabbar') || postText.includes('Phase 17.9A5 - Chess Surface Layer Geometry Tabbar')))))));
check('Post-copy updater still avoids npm dependency', !postText.includes('NPM_CMD') && !postText.includes('where npm.cmd'));
const crlfOnly = b => { for(let i=0;i<b.length;i++){ if(b[i]===10 && (i===0 || b[i-1]!==13)) return false; } return true; };
check('Root BATs use Windows CRLF only', crlfOnly(pre) && crlfOnly(post));
check('Root BAT command text remains ASCII-safe', [...pre,...post].every(v=>v<128));

for(const f of ['src/app/(tabs)/_layout.tsx','src/app/(tabs)/planner.tsx','src/hooks/family/useFamilyEvents.ts','src/context/FamilyRealtimeContext.tsx','src/services/event/eventEntityCache.ts']){
  const out=ts.transpileModule(read(f),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true,fileName:f});
  check(`Syntax clean: ${f}`, !(out.diagnostics||[]).some(d=>d.category===ts.DiagnosticCategory.Error));
}

const hashes={
 'src/components/chess/ChessBoard.tsx':'e8314cceb1ef310380598655c8381a0cc08a58a45a6a75112c19eac036ad5f59',
 'src/components/chess/v2/ChessPiece.tsx':'7c21b248c6eb86ced1b6fd95e83b9db53831c47c0620e75f25a62a9f372dd40e',
 'src/app/(chess)/chess-game/[gameId].tsx':'ece20f30f945dc69fb2b818a2b15163e8b98ed3a8b515dacb44807d3e5bde1bd',
 'src/components/xiangqi/XiangqiGameBoard.tsx':'a7182cc98c97b299d6a40ea83765230b163f0cc6c921f8792d618967f9e61f93',
 'src/app/(xiangqi)/xiangqi-preview.tsx':'cc1a43c20ef21e3e434f9c9c0c306b08ea09f62bf897f010ee30a413c096c71d',
 'server/src/socket/socketServer.ts':'dd60cbc1345d5e3f577b32f1265646ae51f24c3d6ba12ac6a4935da38a1efd07',
 'firestore.rules':'a872b09e20259f22e04e8564d3f0c0722a895235bac2da71bf663c6c8b81222a',
 'firestore.indexes.json':'b88b9fab1c5db94017e0d1744abf0d1ca98979ef86bdefa2e6831fc0e49d429f'};
for(const [f,h] of Object.entries(hashes)) check(`Protected baseline unchanged: ${f}`, (phase17_9aChess && ['src/components/chess/ChessBoard.tsx','src/components/chess/v2/ChessPiece.tsx','src/app/(chess)/chess-game/[gameId].tsx'].includes(f)) || (phase17_9a15BoardGames && ['src/components/xiangqi/XiangqiGameBoard.tsx','src/app/(xiangqi)/xiangqi-preview.tsx'].includes(f)) || (phase17_9a9Server && f === 'server/src/socket/socketServer.ts') || sha(f)===h, phase17_9aChess ? '17.9A Chess architecture supersedes historical hash' : sha(f));

console.log(`\nPhase 17.8D Shared Event Store + UI-thread Navigation gate: ${pass}/${pass+fail} PASS`); if(fail) process.exit(1);
