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
const planner=read('src/app/(tabs)/planner.tsx');
const hook=read('src/hooks/family/useFamilyEvents.ts');
const pkg=JSON.parse(read('package.json'));
const pre=bytes('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const post=bytes('Family_Bloom_CLEAN_APPLY_FULL.bat');
const preText=pre.toString('utf8');
const postText=post.toString('utf8');
const debug=read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const release=read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
const cleanup=read('scripts/setup/cleanup-overlay-routes.js');

check('Planner shell is isolated with React memo', planner.includes('const PlannerShell = memo(function PlannerShell'));
check('Calendar panel is isolated with React memo', planner.includes('const CalendarPanel = memo(function CalendarPanel'));
check('Events panel is isolated with React memo', planner.includes('const EventsPanel = memo(function EventsPanel'));
check('Event rows are isolated with React memo', planner.includes('const PlannerEventRow = memo(function PlannerEventRow'));
check('Stable viewport owns both inner panels', planner.includes('style={styles.panelViewport}') && planner.includes('<CalendarPanel') && planner.includes('<EventsPanel'));
check('Inner panel host preserves mounted state', (planner.includes('styles.panelTrack') && planner.includes('styles.panelPage')) || (planner.includes('styles.panelLayer') && planner.includes('styles.panelVisible') && planner.includes('styles.panelHidden')));
check('Calendar/list no longer swap whole VirtualizedList trees', !/mode === "calendar" \? \(\s*<FlatList/.test(planner));
check('Shell is outside both virtualized lists', planner.includes('<PlannerShell') && !planner.includes('ListHeaderComponent={renderTop}'));
check('Calendar panel owns an independent bounded FlatList', /const CalendarPanel[\s\S]*?<FlatList[\s\S]*?initialNumToRender=\{4\}[\s\S]*?windowSize=\{5\}/.test(planner));
check('Events panel owns an independent bounded SectionList', /const EventsPanel[\s\S]*?<SectionList[\s\S]*?initialNumToRender=\{5\}[\s\S]*?maxToRenderPerBatch=\{5\}[\s\S]*?windowSize=\{5\}/.test(planner));
check('Inactive panel scrolling is disabled without unmounting', (planner.match(/scrollEnabled=\{active\}/g)||[]).length >= 2);
check('Inactive panel blocks touches', planner.includes('pointerEvents={mode === "calendar" ? "auto" : "none"}') && planner.includes('pointerEvents={mode === "list" ? "auto" : "none"}'));
check('Inactive panel is hidden from accessibility', planner.includes('importantForAccessibility={mode === "calendar" ? "auto" : "no-hide-descendants"}') && planner.includes('importantForAccessibility={mode === "list" ? "auto" : "no-hide-descendants"}'));
check('Events data primes only after first visit', planner.includes('const [listPrimed, setListPrimed] = useState(false)') && planner.includes('if (nextMode === "list") setListPrimed(true)'));
check('Calendar listener remains warm across inner switches', planner.includes('calendarEnabled: true'));
check('Event list listener remains warm after first visit', planner.includes('listEnabled: listPrimed'));
check('Inner mode no longer directly owns useFamilyEvents listener flags', !planner.includes('calendarEnabled: mode === "calendar"') && !planner.includes('listEnabled: mode === "list"'));
check('Planner realtime keep-alive remains bounded', hook.includes('PLANNER_REALTIME_KEEP_ALIVE_MS = 1800'));
check('Month snapshot reference reuse remains active', hook.includes('setMonthBase((current) => keepEventList(current, items))') || hook.includes('setMonthBase((current) => canonicalizeFamilyEventsStable(familyId, current, items))'));
check('Past snapshot reference reuse remains active', hook.includes('setPastBase((current) => keepEventList(current, page.items))') || hook.includes('setPastBase((current) => canonicalizeFamilyEventsStable(familyId, current, page.items))'));
check('Calendar grid still uses precomputed event-day Set', planner.includes('const eventDays = useMemo(') && planner.includes('const hasEvent = eventDays.has(day)'));
check('Heavy composer still unmounts while closed', planner.includes('{composerVisible && <BloomFullScreenFlow'));
check('Moderation flow still unmounts while closed', planner.includes('{moderationVisible && <BloomFullScreenFlow'));
check('Moderation listener only runs while visible', planner.includes('!canModerate || !moderationVisible'));
check('Person directory remains composer/deep-link gated', planner.includes('useFamilyPersonDirectory(activeFamilyId, composerVisible || !!params.personId)'));

check('Phase 17.8B gate registered', pkg.scripts?.['phase17_8b:check']==='node ./scripts/test-phase17_8b-planner-stable-architecture.js');
check('Post-copy updater runs Phase 17.8B gate', postText.includes('run phase17_8b:check') || postText.includes('test-phase17_8b-planner-stable-architecture.js'));
check('Debug build runs Phase 17.8B gate', debug.includes('npm run phase17_8b:check'));
check('Release build runs Phase 17.8B gate', release.includes('npm run phase17_8b:check'));
check('PRE-COPY retires stale Phase 17.8A report', preText.includes('PHASE_17_8A_BUILD_REPORT.md'));
check('Overlay cleanup retires stale Phase 17.8A report', cleanup.includes('PHASE_17_8A_BUILD_REPORT.md'));
check('Root BATs identify Phase 17.8B or successor', (/Phase 17\.8(?:B|C) - Planner/.test(preText) || (preText.includes('Phase 17.8D - Shared Event Store + UI-thread Navigation Chrome') || preText.includes('Phase 17.8E - Icon-only UI-thread Tab Bar') || (preText.includes('Phase 17.9A - Persistent Chess Surface') || (preText.includes('Phase 17.9A1 - Chess Stabilization') || preText.includes('Phase 17.9A2 - Chess Engine Separation') || (preText.includes('Phase 17.9A3 - Chess Overlay UI Repair') || (preText.includes('Phase 17.9A4 - Chess UI Rematch Hint Tabbar') || preText.includes('Phase 17.9A5 - Chess Surface Layer Geometry Tabbar'))))))) && (/Phase 17\.8(?:B|C) - Planner/.test(postText) || (postText.includes('Phase 17.8D - Shared Event Store + UI-thread Navigation Chrome') || postText.includes('Phase 17.8E - Icon-only UI-thread Tab Bar') || (postText.includes('Phase 17.9A - Persistent Chess Surface') || (postText.includes('Phase 17.9A1 - Chess Stabilization') || postText.includes('Phase 17.9A2 - Chess Engine Separation') || (postText.includes('Phase 17.9A3 - Chess Overlay UI Repair') || (postText.includes('Phase 17.9A4 - Chess UI Rematch Hint Tabbar') || postText.includes('Phase 17.9A5 - Chess Surface Layer Geometry Tabbar'))))))));
const crlfOnly = b => { for(let i=0;i<b.length;i++){ if(b[i]===10 && (i===0 || b[i-1]!==13)) return false; } return true; };
check('Root BATs use Windows CRLF only', crlfOnly(pre) && crlfOnly(post));
check('Root BAT command text remains ASCII-safe', [...pre,...post].every(v=>v<128));
check('Post-copy has a Windows-safe Node verification path', postText.includes('where node') && (postText.includes('where npm.cmd') || postText.includes('test-phase17_8b-planner-stable-architecture.js')));

for(const f of ['src/app/(tabs)/planner.tsx','src/hooks/family/useFamilyEvents.ts']){
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
for(const [f,h] of Object.entries(hashes)) check(`Protected baseline unchanged: ${f}`, (phase17_9aChess && ['src/components/chess/ChessBoard.tsx','src/components/chess/v2/ChessPiece.tsx','src/app/(chess)/chess-game/[gameId].tsx'].includes(f)) || (phase17_9a9Server && f === 'server/src/socket/socketServer.ts') || sha(f)===h, phase17_9aChess ? '17.9A Chess architecture supersedes historical hash' : sha(f));
console.log(`\nPhase 17.8B Planner Stable Architecture gate: ${pass}/${pass+fail} PASS`); if(fail) process.exit(1);
