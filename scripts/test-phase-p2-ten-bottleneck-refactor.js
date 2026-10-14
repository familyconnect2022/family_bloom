const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const Module = require('module');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass = 0, fail = 0;
function check(label, condition, detail = '') {
  const n = String(pass + fail + 1).padStart(2, '0');
  if (condition) { pass++; console.log(`PASS ${n} - ${label}`); }
  else { fail++; console.log(`FAIL ${n} - ${label}${detail ? ` :: ${detail}` : ''}`); }
}
const has = (p, ...needles) => needles.every((n) => read(p).includes(n));

const familyRealtime = read('src/context/FamilyRealtimeContext.tsx');
const warmCache = read('src/services/bootstrap/familyHomeWarmCache.ts');
const membersHook = read('src/hooks/family/useFamilyMembers.ts');
const momentsHook = read('src/hooks/moments/useFamilyMoments.ts');
const eventsHook = read('src/hooks/family/useFamilyEvents.ts');
const runtime = read('src/context/TabRuntimeContext.tsx');
const scheduler = read('src/services/performance/bloomTaskScheduler.ts');
const bootstrap = read('src/services/bootstrap/bootstrapCoordinator.ts');
const rootLayout = read('src/app/_layout.tsx');
const home = read('src/app/(tabs)/index.tsx');
const planner = read('src/app/(tabs)/planner.tsx');
const calendarIndex = read('src/services/calendar/calendarIndex.ts');
const momentCache = read('src/services/moments/momentEntityCache.ts');
const media = read('src/components/media/MediaViewerProvider.tsx');
const graphWarm = read('src/components/familyGraph/familyGraphWarmCache.ts');
const graphAdapter = read('src/components/familyGraph/familyGraphLiveAdapter.ts');
const graphPrototype = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const toast = read('src/components/ui/BloomToast.tsx');
const overlay = read('src/services/overlay/overlayCoordinator.ts');
const signals = read('src/services/realtime/uiSignalStore.ts');
const activitySignal = read('src/services/activity/activityBadgeSignalStore.ts');
const chessRealtime = read('src/context/ChessRealtimeContext.tsx');
const chessPresence = read('src/services/chess/chessPresenceStore.ts');
const lobby = read('src/hooks/chess/useChessLobby.ts');
const routeOwnership = read('src/services/navigation/routeOwnership.ts');

console.log('\nP2 — Ten Bottleneck Architecture Refactor\n');

// 1 — Cache-first / root ownership
check('01 root family provider owns no physical feature Firestore listener', !/watchMembers|subscribeLatest|subscribeUpcoming|subscribeYearly/.test(familyRealtime));
check('01 root bridge is cache-only and uid/family scoped', familyRealtime.includes('familyHomeWarmCache') && familyRealtime.includes('P2 cache bridge'));
check('01 persistent cache is split by feature instead of one giant JSON key', warmCache.includes('featureKey') && warmCache.includes('"members" | "events" | "moments"') && warmCache.includes('AsyncStorage.multiGet'));
check('01 v1 warm cache migration is retained', warmCache.includes('LEGACY_PREFIX') && warmCache.includes('migrateLegacy'));
check('01 members live listener belongs to active surface/detail hook', (membersHook.includes('useTabLiveEffect') || membersHook.includes('useOptionalTabLiveEffect')) && membersHook.includes('runtimeTabId'));
check('01 Moments live listener belongs to active Moments surface', momentsHook.includes('useTabLiveEffect("moments"'));
check('01 Planner Event listeners honor runtime ownership', eventsHook.includes('runtimeTabId') && eventsHook.includes('useTabLiveEffect'));

// 2 — Adaptive lifecycle / scheduler
check('02 lifecycle exposes ACTIVE/WARM/SUSPENDED/RESTORING', /"active"\s*\|\s*"warm"\s*\|\s*"suspended"\s*\|\s*"restoring"/.test(runtime));
check('02 warm retention is cost/memory-budget aware', runtime.includes('SURFACE_PROFILES') && runtime.includes('memoryPressure') && runtime.includes('enforceWarmBudget'));
check('02 freeze barrier carries dirtyVersion/appliedDirtyVersion', runtime.includes('dirtyVersion') && runtime.includes('appliedDirtyVersion') && runtime.includes('markDirty'));
check('02 scheduler has Interaction > Visible > Sync > Prefetch > Idle priorities', ['INTERACTION','VISIBLE','SYNC','PREFETCH','IDLE'].every((x) => scheduler.includes(x)));
check('02 low priority work yields during interaction/critical window', scheduler.includes('beginInteraction') && scheduler.includes('getUiFrameBudgetSnapshot') && scheduler.includes('uiBudget.critical') && scheduler.includes('requestIdleCallback'));

// 3 — Moments/feed/image
check('03 Moments entities are canonicalized by family/id/version', momentCache.includes('canonicalizeFamilyMoments') && momentCache.includes('updatedAt'));
check('03 Moments hook canonicalizes cache/live/page results', momentsHook.includes('canonicalizeFamilyMoments'));
check('03 Cloudinary requests use fixed size buckets', media.includes('[64, 128, 320, 480, 720, 960, 1440]') && media.includes('nearestCloudinaryWidth'));
check('03 Moment card uses avatar thumbnail transformation', read('src/components/moments/MomentCard.tsx').includes('cloudinaryAvatarThumbnail'));

// 4 — Family Tree engine containment
check('04 graph layout has a layout-only fingerprint separate from full data fingerprint', graphWarm.includes('fingerprintFamilyGraphLayout'));
check('04 profile-only graph changes can refresh nodes without layout rebuild', graphWarm.includes('refreshFamilyGraphVisualProfiles') && graphAdapter.includes('refreshFamilyGraphVisualProfiles'));
check('04 graph still has viewport/spatial virtualization', /viewport|spatial|visible/i.test(graphPrototype));
check('04 graph pan/zoom uses SharedValues', graphPrototype.includes('useSharedValue') && graphPrototype.includes('useAnimatedStyle'));

// 5 — Home projection/render islands
check('05 Home dashboard remains projection over feature stores/cache', read('src/hooks/family/useFamilyDashboard.ts').includes('Home projection over cache'));
check('05 Home Events/Moments/Members are independent memo render islands', ['HomeSummaryIsland','HomeUpcomingIsland','HomeOnThisDayIsland','HomeMomentsIsland','HomeMembersIsland'].every((x) => home.includes(`const ${x} = memo`)));
check('05 activity badge is isolated external signal consumer', home.includes('<HomeActivityBell') && read('src/components/home/HomeActivityBell.tsx').includes('useSyncExternalStore'));

// 6 — Planner calendar index
check('06 Planner has explicit CalendarMonthProjection/DaySummary index', calendarIndex.includes('CalendarMonthProjection') && calendarIndex.includes('DaySummary'));
check('06 unchanged day summaries preserve object identity', calendarIndex.includes('sameSummary(old, next) ? old!'));
check('06 Planner DayCell receives DaySummary not full event array', planner.includes('summary={getDaySummary(monthProjection, day)}'));
check('06 selected agenda resolves ids from month projection', planner.includes('monthProjection.byDay.get(selectedDay)'));

// 7 — Bootstrap
check('07 bootstrap state machine has staged first-paint phases', ['COLD','IDENTITY','FIRST_PAINT','INTERACTIVE','SYNCING','SETTLED'].every((x) => bootstrap.includes(x)));
check('07 startup task contracts carry priority/cost/cancel/network/family/first-paint metadata', ['priority','estimatedCostMs','canCancel','requiresNetwork','requiresActiveFamily','blocksFirstPaint'].every((x) => bootstrap.includes(x)));
check('07 root session explicitly marks identity/first-paint/interactive', rootLayout.includes('markIdentityReady') && rootLayout.includes('markFirstPaint') && rootLayout.includes('markInteractive'));
check('07 deferred graph prewarm runs as IDLE scheduler work', read('src/components/system/DeferredFamilyPrewarm.tsx').includes('priority: "IDLE"'));

// 8 — Overlay/App chrome
check('08 Toast context value is stable across host presentation state', toast.includes('const contextValue = useMemo'));
check('08 Toast queue supports dedupe keys', toast.includes('dedupeKey'));
check('08 OverlayCoordinator has priority/dedupe/scope/generation semantics', ['OverlayPriority','dedupeKey','generation','discardStaleScope'].every((x) => overlay.includes(x)));
check('08 overlay priority orders critical/game/challenge above toast', overlay.includes('CRITICAL: 100') && overlay.includes('TOAST: 10'));

// 9 — Signal containment
check('09 generic signal store is key-scoped/coalesced', signals.includes('coalesced per key') && signals.includes('subscribers.get(key)') && signals.includes('pending.set(key, value)'));
check('09 activity badge lives outside Home parent state', activitySignal.includes('activityBadgeSignalStore') && !home.includes('setActivityBadgeCount'));
check('09 Chess presence no longer mutates ChessRealtimeContext state', !chessRealtime.includes('useState<ChessPresence') && chessRealtime.includes('publishChessPresence'));
check('09 Chess lobby subscribes directly to presence signal store', lobby.includes('useChessPresence()') && chessPresence.includes('useSyncExternalStore'));

// 10 — Route ownership
check('10 route contracts distinguish persistent/transient/overlay', ['persistent_surface','transient_route','global_overlay'].every((x) => routeOwnership.includes(x)));
check('10 detail routes explicitly do not own durable feature data', routeOwnership.includes('detail.moment') && routeOwnership.includes('detail.event') && routeOwnership.includes('ownsData: false'));
check('10 Chess/Xiangqi surfaces are declared persistent model owners', routeOwnership.includes('game.chess') && routeOwnership.includes('game.xiangqi') && routeOwnership.includes('ownsEngine: true'));

function loadTsModule(rel) {
  const filename = path.join(root, rel);
  const js = ts.transpileModule(read(rel), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }, fileName: rel }).outputText;
  const mod = new Module(filename, module);
  mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod._compile(js, filename); return mod.exports;
}
try {
  const { OverlayCoordinator } = loadTsModule('src/services/overlay/overlayCoordinator.ts');
  const c = new OverlayCoordinator();
  c.enqueue({ id:'toast', priority:'TOAST', payload:null, dedupeKey:'same', createdAt:1 });
  c.enqueue({ id:'toast2', priority:'TOAST', payload:null, dedupeKey:'same', createdAt:2 });
  c.enqueue({ id:'critical', priority:'CRITICAL', payload:null, createdAt:3 });
  check('08 executable overlay queue dedupes and preempts by priority', c.getCurrent()?.id === 'critical' && c.getQueue().filter((x) => x.dedupeKey === 'same').length === 1);
} catch (e) { check('08 executable overlay queue dedupes and preempts by priority', false, e.message); }

try {
  const cal = loadTsModule('src/services/calendar/calendarIndex.ts');
  const sample = (id, day, title='x') => ({ id, familyId:'f', title, dateISO:'2026-10-10T00:00:00Z', dateKey:`2026-10-${day}`, year:2026, month:10, day, allDay:true, eventType:'family', notificationLevel:'normal', participantsMode:'all', participantIds:[], personIds:[], recurrence:'none', description:null, location:null, attachments:[], attachmentPublicIds:[], coverAttachmentId:null, createdByUid:'u', moderationStatus:'visible', moderatedByUid:null, moderatedAt:null, createdAt:'x', updatedAt:title });
  const p1=cal.buildCalendarMonthProjection([sample('a',10)],2026,10);
  const p2=cal.buildCalendarMonthProjection([sample('a',10,'title changed')],2026,10,p1);
  check('06 executable projection preserves DaySummary identity for non-summary edit', p1.summaries.get(10) === p2.summaries.get(10));
} catch (e) { check('06 executable projection preserves DaySummary identity for non-summary edit', false, e.message); }

const syntaxFiles = [
  'src/context/FamilyRealtimeContext.tsx','src/services/bootstrap/familyHomeWarmCache.ts','src/hooks/family/useFamilyMembers.ts','src/hooks/family/useFamilyDashboard.ts','src/hooks/moments/useFamilyMoments.ts','src/hooks/family/useFamilyEvents.ts',
  'src/context/TabRuntimeContext.tsx','src/services/performance/bloomTaskScheduler.ts','src/services/bootstrap/bootstrapCoordinator.ts','src/app/_layout.tsx','src/components/system/DeferredFamilyPrewarm.tsx',
  'src/services/realtime/uiSignalStore.ts','src/services/activity/activityBadgeSignalStore.ts','src/components/home/HomeActivityBell.tsx','src/app/(tabs)/index.tsx','src/components/ui/BloomToast.tsx',
  'src/app/(tabs)/planner.tsx','src/services/calendar/calendarIndex.ts','src/services/moments/momentEntityCache.ts','src/components/media/MediaViewerProvider.tsx','src/components/moments/MomentCard.tsx',
  'src/components/familyGraph/familyGraphWarmCache.ts','src/components/familyGraph/familyGraphLiveAdapter.ts','src/services/overlay/overlayCoordinator.ts','src/services/navigation/routeOwnership.ts',
  'src/services/chess/chessPresenceStore.ts','src/context/ChessRealtimeContext.tsx','src/hooks/chess/useChessLobby.ts',
];
const syntaxErrors=[];
for (const file of syntaxFiles) {
  const out=ts.transpileModule(read(file), { compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}, reportDiagnostics:true, fileName:file });
  for (const d of out.diagnostics || []) if (d.category === ts.DiagnosticCategory.Error) syntaxErrors.push(`${file}: ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`);
}
check(`P2 changed TypeScript/TSX syntax clean (${syntaxFiles.length} files)`, syntaxErrors.length === 0, syntaxErrors.slice(0,3).join(' | '));


const pkg = JSON.parse(read('package.json'));
const preCopy = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const postCopy = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
check('P2 package gate is registered', pkg.scripts?.['phaseP2:check'] === 'node ./scripts/test-phase-p2-ten-bottleneck-refactor.js');
check('P2 gate runs in post-copy updater', postCopy.includes('test-phase-p2-ten-bottleneck-refactor.js'));
check('P2 gate runs in Android Debug and Release build scripts', debugBat.includes('phaseP2:check') && releaseBat.includes('phaseP2:check'));
check('Copy-over scripts identify P2 architecture build', /Performance Architecture P2/i.test(preCopy) && /Performance Architecture P2/i.test(postCopy));

console.log(`\nFamily Bloom P2 Ten-Bottleneck Refactor: ${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
