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
const pkg=JSON.parse(read('package.json'));
const pre=bytes('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const post=bytes('Family_Bloom_CLEAN_APPLY_FULL.bat');
const preText=pre.toString('utf8');
const postText=post.toString('utf8');
const cleanup=read('scripts/setup/cleanup-overlay-routes.js');

check('Planner still uses isolated memo shell', planner.includes('const PlannerShell = memo(function PlannerShell'));
check('Calendar panel remains memoized', planner.includes('const CalendarPanel = memo(function CalendarPanel'));
check('Events panel remains memoized', planner.includes('const EventsPanel = memo(function EventsPanel'));
check('Both panels stay mounted in one stable host', planner.includes('styles.panelTrack') && planner.includes('styles.panelPage') && planner.includes('<CalendarPanel') && planner.includes('<EventsPanel'));
check('Android-host no longer stacks panels with absoluteFill', !planner.includes('StyleSheet.absoluteFillObject') && !planner.includes('styles.panelLayer'));
check('Android-host no longer hides VirtualizedLists with opacity', !planner.includes('styles.panelVisible') && !planner.includes('styles.panelHidden'));
check('Viewport clips a horizontal real-layout track', planner.includes('panelViewport: { flex: 1, minHeight: 0, overflow: "hidden"') && planner.includes('panelTrack: { flex: 1, minHeight: 0, flexDirection: "row"'));
check('Track translates by measured viewport width', planner.includes('transform: [{ translateX: mode === "list" ? -panelWidth : 0 }]') || (planner.includes('panelTrackStyle') && planner.includes('plannerModeProgress.value * panelWidthValue.value')));
check('Viewport width is captured from native layout', planner.includes('capturePanelWidth(event.nativeEvent.layout.width)'));
check('Initial panel width avoids a blank first layout', planner.includes('useWindowDimensions()') && planner.includes('Math.max(1, Math.round(windowWidth))'));
check('Calendar and Events have independent real-width pages', (planner.match(/style=\{\[styles\.panelPage, \{ width: panelWidth \}\]\}/g)||[]).length >= 2);
check('Inactive Calendar panel blocks touches without unmounting', planner.includes('pointerEvents={mode === "calendar" ? "auto" : "none"}'));
check('Inactive Events panel blocks touches without unmounting', planner.includes('pointerEvents={mode === "list" ? "auto" : "none"}'));
check('Persistent Calendar list disables Android clipped-subview detachment', /const CalendarPanel[\s\S]*?removeClippedSubviews=\{false\}/.test(planner));
check('Persistent Events list disables Android clipped-subview detachment', /const EventsPanel[\s\S]*?removeClippedSubviews=\{false\}/.test(planner));
check('Calendar FlatList remains bounded', /const CalendarPanel[\s\S]*?initialNumToRender=\{4\}[\s\S]*?maxToRenderPerBatch=\{4\}[\s\S]*?windowSize=\{5\}/.test(planner));
check('Events SectionList remains bounded', /const EventsPanel[\s\S]*?initialNumToRender=\{5\}[\s\S]*?maxToRenderPerBatch=\{5\}[\s\S]*?windowSize=\{5\}/.test(planner));
check('Events listener still primes once and stays warm', planner.includes('const [listPrimed, setListPrimed] = useState(false)') && planner.includes('listEnabled: listPrimed'));
check('Calendar listener still stays warm', planner.includes('calendarEnabled: true'));
check('Composer still unmounts when closed', planner.includes('{composerVisible && <BloomFullScreenFlow'));
check('Moderation still unmounts when closed', planner.includes('{moderationVisible && <BloomFullScreenFlow'));

check('Phase 17.8C gate is registered', pkg.scripts?.['phase17_8c:check']==='node ./scripts/test-phase17_8c-planner-android-stable-panels.js');
check('Post-copy updater runs Phase 17.8C gate directly', postText.includes('test-phase17_8c-planner-android-stable-panels.js'));
check('Post-copy verification does not require npm.cmd', !postText.includes('NPM_CMD') && !postText.includes('where npm.cmd'));
check('PRE-COPY retires stale Phase 17.8B report', preText.includes('PHASE_17_8B_BUILD_REPORT.md'));
check('Overlay cleanup retires stale Phase 17.8B report', cleanup.includes('PHASE_17_8B_BUILD_REPORT.md'));
check('Root BATs identify Phase 17.8C or successor', (preText.includes('Phase 17.8C - Planner Android Stable Panels') || (preText.includes('Phase 17.8D - Shared Event Store + UI-thread Navigation Chrome') || preText.includes('Phase 17.8E - Icon-only UI-thread Tab Bar') || (preText.includes('Phase 17.9A - Persistent Chess Surface') || (preText.includes('Phase 17.9A1 - Chess Stabilization') || preText.includes('Phase 17.9A2 - Chess Engine Separation') || (preText.includes('Phase 17.9A3 - Chess Overlay UI Repair') || (preText.includes('Phase 17.9A4 - Chess UI Rematch Hint Tabbar') || preText.includes('Phase 17.9A5 - Chess Surface Layer Geometry Tabbar'))))))) && (postText.includes('Phase 17.8C - Planner Android Stable Panels') || (postText.includes('Phase 17.8D - Shared Event Store + UI-thread Navigation Chrome') || postText.includes('Phase 17.8E - Icon-only UI-thread Tab Bar') || (postText.includes('Phase 17.9A - Persistent Chess Surface') || (postText.includes('Phase 17.9A1 - Chess Stabilization') || postText.includes('Phase 17.9A2 - Chess Engine Separation') || (postText.includes('Phase 17.9A3 - Chess Overlay UI Repair') || (postText.includes('Phase 17.9A4 - Chess UI Rematch Hint Tabbar') || postText.includes('Phase 17.9A5 - Chess Surface Layer Geometry Tabbar'))))))));
const crlfOnly = b => { for(let i=0;i<b.length;i++){ if(b[i]===10 && (i===0 || b[i-1]!==13)) return false; } return true; };
check('Root BATs use Windows CRLF only', crlfOnly(pre) && crlfOnly(post));
check('Root BAT command text remains ASCII-safe', [...pre,...post].every(v=>v<128));

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
console.log(`\nPhase 17.8C Planner Android Stable Panels gate: ${pass}/${pass+fail} PASS`); if(fail) process.exit(1);
