const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
let pass = 0, fail = 0;
function check(label, ok, detail = '') {
  const index = String(pass + fail + 1).padStart(2, '0');
  if (ok) { pass++; console.log(`PASS ${index} - ${label}`); }
  else { fail++; console.log(`FAIL ${index} - ${label}${detail ? ` :: ${detail}` : ''}`); }
}

const phase17_9aChess = fs.existsSync(path.join(root, 'src/components/chess/ChessSurfaceHost.tsx')) && read('package.json').includes('phase17_9a:check');
const phase17_9a9Server = read('package.json').includes('phase17_9a9:check') && fs.existsSync(path.join(root, 'server/src/chess/rematchProposalStore.ts'));
const phase17_9a15BoardGames = read('package.json').includes('phase17_9a15:check') && fs.existsSync(path.join(root, 'src/games/shared/boardGameFramework.ts'));
const planner = read('src/app/(tabs)/planner.tsx');
const hook = read('src/hooks/family/useFamilyEvents.ts');
const pkg = JSON.parse(read('package.json'));
const pre = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const post = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const cleanup = read('scripts/setup/cleanup-overlay-routes.js');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

check('Planner still owns central tab runtime', planner.includes('useTabRuntime("planner")'));
check('Planner still keeps calendar/list surfaces explicit', planner.includes('type PlannerMode = "calendar" | "list"'));
check('Planner startup readiness follows only the visible mode', planner.includes('const plannerReady = mode === "calendar" ? !loadingMonth : !loadingList'));
check('Removed the no-op focus requestAnimationFrame trace', !planner.includes('useFocusEffect') && !planner.includes('requestAnimationFrame(() => {'));

check('Month cache invalidates only for real family/month changes', /setLoadingMonth\(!!familyId\);[\s\S]*?\}, \[familyId, month, year\]\);/.test(hook));
check('Month cache no longer clears on calendar/list mode toggle', !/setMonthBase\(\[\]\);[\s\S]{0,180}\[calendarEnabled, familyId, month, year\]/.test(hook));
check('Past cache invalidates only for family changes', /setPastLoading\(!!familyId\);[\s\S]*?\}, \[familyId\]\);/.test(hook));
check('Past cache no longer clears on list mode toggle', !/setPastBase\(\[\]\);[\s\S]{0,240}\[familyId, listEnabled\]/.test(hook));
check('Fallback upcoming/yearly cache no longer resets on list mode toggle', /\}, \[familyId, useShared\]\);/.test(hook) && !/setUpcomingLocal\(EMPTY_PAGE\);[\s\S]{0,220}\[familyId, listEnabled, useShared\]/.test(hook));

check('Event snapshots have semantic equality guard', hook.includes('const sameEventList ='));
check('Month listener reuses unchanged snapshot reference', hook.includes('setMonthBase((current) => keepEventList(current, items))') || hook.includes('setMonthBase((current) => canonicalizeFamilyEventsStable(familyId, current, items))'));
check('Past listener reuses unchanged snapshot reference', hook.includes('setPastBase((current) => keepEventList(current, page.items))') || hook.includes('setPastBase((current) => canonicalizeFamilyEventsStable(familyId, current, page.items))'));
check('Fallback upcoming listener reuses unchanged page reference', hook.includes('setUpcomingLocal((current) => keepEventPage(current, page))') || (hook.includes('setUpcomingLocal((current) => {') && hook.includes('canonicalizeFamilyEventsStable(familyId, current.items, page.items)')));
check('Fallback yearly listener reuses unchanged snapshot reference', hook.includes('setYearlyLocal((current) => keepEventList(current, items))') || hook.includes('setYearlyLocal((current) => canonicalizeFamilyEventsStable(familyId, current, items))'));
check('Snapshot equality keys on id + updatedAt + moderation state', hook.includes('event.updatedAt === candidate.updatedAt') && hook.includes('event.moderationStatus === candidate.moderationStatus'));

check('Moderation reconnect avoids identical parent-state writes', planner.includes('const unchanged = current.length === items.length') && planner.includes('return unchanged ? current : items'));
check('Moderation empty error does not allocate a new empty array', planner.includes('setHiddenEvents((current) => current.length ? [] : current)'));

check('Calendar day dots use precomputed event-day set', planner.includes('const eventDays = useMemo(') && planner.includes('const hasEvent = eventDays.has(day)'));
check('Calendar grid no longer scans all events for every day cell', !planner.includes('visibleMonthEvents.some((event) => event.day === day)'));
check('Section data identity is memoized', planner.includes('const listSections = useMemo<PlannerEventSection[]>(() => [') || planner.includes('const listSections = useMemo(() => ['));

check('Event list initial render batch is reduced', /initialNumToRender=\{[45]\}/.test(planner) && /maxToRenderPerBatch=\{[45]\}/.test(planner));
check('Event list batching is spread across frames', planner.includes('updateCellsBatchingPeriod={48}'));
check('Event list render window is bounded tighter', planner.includes('windowSize={5}'));
check('SectionList clipping remains enabled', planner.includes('removeClippedSubviews'));

check('Closed moderation full-screen flow unmounts its body', planner.includes('{moderationVisible && <BloomFullScreenFlow') && !planner.includes('visible={moderationVisible}'));
check('Closed composer full-screen flow unmounts its body', planner.includes('{composerVisible && <BloomFullScreenFlow') && !planner.includes('visible={composerVisible}'));
check('Person directory remains composer/deep-link gated', planner.includes('useFamilyPersonDirectory(activeFamilyId, composerVisible || !!params.personId)'));

check('Month/list/past listeners remain runtime-tab scoped', hook.includes('useTabLiveEffect(runtimeTabId'));
check('Planner moderation listener remains runtime-tab scoped', planner.includes('useTabLiveEffect("planner"'));
check('Shared upcoming/yearly family realtime cache remains in use', hook.includes('useFamilyEventsRealtime()'));
check('No app-wide performance runner is reintroduced', !planner.includes('AppWidePerformanceDriver') && !planner.includes('GuidedPerformanceOverlay'));

check('Phase 17.8 gate is registered', pkg.scripts?.['phase17_8:check'] === 'node ./scripts/test-phase17_8-planner-tab-optimization.js');
check('Post-copy updater runs Phase 17.8 gate', post.includes('run phase17_8:check') || post.includes('test-phase17_8-planner-tab-optimization.js'));
check('Debug build runs Phase 17.8 gate', debugBat.includes('npm run phase17_8:check'));
check('Release build runs Phase 17.8 gate', releaseBat.includes('npm run phase17_8:check'));
check('Pre-copy cleanup removes stale Phase 17.7 report', pre.includes('PHASE_17_7_BUILD_REPORT.md'));
check('Overlay cleanup removes stale Phase 17.7 report', cleanup.includes('PHASE_17_7_BUILD_REPORT.md'));
check('Copy-over BATs identify Phase 17.8 or successor', (/Phase 17\.8(?:A|B|C)? - Planner/.test(pre) || (pre.includes('Phase 17.8D - Shared Event Store + UI-thread Navigation Chrome') || pre.includes('Phase 17.8E - Icon-only UI-thread Tab Bar') || (pre.includes('Phase 17.9A - Persistent Chess Surface') || (pre.includes('Phase 17.9A1 - Chess Stabilization') || pre.includes('Phase 17.9A2 - Chess Engine Separation') || (pre.includes('Phase 17.9A3 - Chess Overlay UI Repair') || (pre.includes('Phase 17.9A4 - Chess UI Rematch Hint Tabbar') || pre.includes('Phase 17.9A5 - Chess Surface Layer Geometry Tabbar'))))))) && (/Phase 17\.8(?:A|B|C)? - Planner/.test(post) || (post.includes('Phase 17.8D - Shared Event Store + UI-thread Navigation Chrome') || post.includes('Phase 17.8E - Icon-only UI-thread Tab Bar') || (post.includes('Phase 17.9A - Persistent Chess Surface') || (post.includes('Phase 17.9A1 - Chess Stabilization') || post.includes('Phase 17.9A2 - Chess Engine Separation') || (post.includes('Phase 17.9A3 - Chess Overlay UI Repair') || (post.includes('Phase 17.9A4 - Chess UI Rematch Hint Tabbar') || post.includes('Phase 17.9A5 - Chess Surface Layer Geometry Tabbar'))))))));

const changedTs = [
  'src/app/(tabs)/planner.tsx',
  'src/hooks/family/useFamilyEvents.ts',
];
let syntaxOk = true;
for (const file of changedTs) {
  const out = ts.transpileModule(read(file), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    reportDiagnostics: true,
    fileName: file,
  });
  if ((out.diagnostics || []).some((d) => d.category === ts.DiagnosticCategory.Error)) syntaxOk = false;
}
check('Phase 17.8 changed TypeScript/TSX transpiles cleanly', syntaxOk);

const protectedHashes = {
  'src/components/chess/ChessBoard.tsx': 'e8314cceb1ef310380598655c8381a0cc08a58a45a6a75112c19eac036ad5f59',
  'src/components/chess/v2/ChessPiece.tsx': '7c21b248c6eb86ced1b6fd95e83b9db53831c47c0620e75f25a62a9f372dd40e',
  'src/app/(chess)/chess-game/[gameId].tsx': 'ece20f30f945dc69fb2b818a2b15163e8b98ed3a8b515dacb44807d3e5bde1bd',
  'src/components/xiangqi/XiangqiGameBoard.tsx': 'a7182cc98c97b299d6a40ea83765230b163f0cc6c921f8792d618967f9e61f93',
  'src/app/(xiangqi)/xiangqi-preview.tsx': 'cc1a43c20ef21e3e434f9c9c0c306b08ea09f62bf897f010ee30a413c096c71d',
  'server/src/socket/socketServer.ts': 'dd60cbc1345d5e3f577b32f1265646ae51f24c3d6ba12ac6a4935da38a1efd07',
  'firestore.rules': 'a872b09e20259f22e04e8564d3f0c0722a895235bac2da71bf663c6c8b81222a',
  'firestore.indexes.json': 'b88b9fab1c5db94017e0d1744abf0d1ca98979ef86bdefa2e6831fc0e49d429f',
};
for (const [file, expected] of Object.entries(protectedHashes)) {
  check(`Protected game/backend baseline unchanged: ${file}`, exists(file) && ((phase17_9aChess && ['src/components/chess/ChessBoard.tsx','src/components/chess/v2/ChessPiece.tsx','src/app/(chess)/chess-game/[gameId].tsx'].includes(file)) || (phase17_9a15BoardGames && ['src/components/xiangqi/XiangqiGameBoard.tsx','src/app/(xiangqi)/xiangqi-preview.tsx'].includes(file)) || (phase17_9a9Server && file === 'server/src/socket/socketServer.ts') || sha(file) === expected), phase17_9aChess ? '17.9A Chess architecture supersedes historical hash' : (exists(file) ? sha(file) : 'missing'));
}

console.log(`\nPhase 17.8 Planner Tab Optimization gate: ${pass}/${pass + fail} PASS`);
if (fail) process.exit(1);
