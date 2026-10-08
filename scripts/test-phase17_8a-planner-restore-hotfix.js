const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const bytes = p => fs.readFileSync(path.join(root,p));
const sha = p => crypto.createHash('sha256').update(bytes(p)).digest('hex');
let pass=0, fail=0;
function check(label, ok){ const n=String(pass+fail+1).padStart(2,'0'); if(ok){pass++;console.log(`PASS ${n} - ${label}`)} else {fail++;console.log(`FAIL ${n} - ${label}`)} }
const phase17_9aChess = fs.existsSync(path.join(root, 'src/components/chess/ChessSurfaceHost.tsx')) && read('package.json').includes('phase17_9a:check');
const phase17_9a9Server = read('package.json').includes('phase17_9a9:check') && fs.existsSync(path.join(root, 'server/src/chess/rematchProposalStore.ts'));
const planner=read('src/app/(tabs)/planner.tsx');
const hook=read('src/hooks/family/useFamilyEvents.ts');
const registry=read('src/services/realtime/sharedRealtimeRegistry.ts');
const pkg=JSON.parse(read('package.json'));
const pre=bytes('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const post=bytes('Family_Bloom_CLEAN_APPLY_FULL.bat');
const preText=pre.toString('utf8'); const postText=post.toString('utf8');
const debug=read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const release=read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
check('Planner realtime uses bounded keep-alive grace', hook.includes('PLANNER_REALTIME_KEEP_ALIVE_MS = 1800'));
check('Month listener opts into keep-alive grace', /planner\.events\.month[\s\S]*keepAliveMs: PLANNER_REALTIME_KEEP_ALIVE_MS/.test(hook));
check('Past/list listeners opt into keep-alive grace', (hook.match(/keepAliveMs: PLANNER_REALTIME_KEEP_ALIVE_MS/g)||[]).length >= 4);
check('Registry supports delayed disposal', registry.includes('disposeTimer') && registry.includes('setTimeout(dispose, keepAliveMs)'));
check('Registry cancels delayed disposal on quick resubscribe', registry.includes('clearTimeout(entry.disposeTimer)'));
check('Registry keeps latest snapshot while idle grace is active', registry.includes('current.lastValue = value'));
check('Moderation listener only runs while moderation screen is open', planner.includes('!canModerate || !moderationVisible'));
check('Moderation visibility participates in live effect dependencies', planner.includes('[activeFamilyId, canModerate, moderationVisible]'));
check('Calendar grid is isolated with React memo', planner.includes('const CalendarMonthGrid = memo(function CalendarMonthGrid'));
check('Calendar grid receives precomputed event-day set', planner.includes('eventDays={eventDays}'));
check('Calendar day selection callback is stable', planner.includes('const selectDay = useCallback'));
check('Month navigation callback is stable', planner.includes('const moveMonth = useCallback'));
check('Phase 17.8A gate registered', pkg.scripts?.['phase17_8a:check']==='node ./scripts/test-phase17_8a-planner-restore-hotfix.js');
check('Post-copy runs Phase 17.8A gate', postText.includes('run phase17_8a:check') || postText.includes('test-phase17_8a-planner-restore-hotfix.js'));
check('Debug build runs Phase 17.8A gate', debug.includes('npm run phase17_8a:check'));
check('Release build runs Phase 17.8A gate', release.includes('npm run phase17_8a:check'));
check('Root BATs identify Phase 17.8A or successor', (/Phase 17\.8(?:A|B|C) - Planner/.test(preText) || (preText.includes('Phase 17.8D - Shared Event Store + UI-thread Navigation Chrome') || preText.includes('Phase 17.8E - Icon-only UI-thread Tab Bar') || (preText.includes('Phase 17.9A - Persistent Chess Surface') || (preText.includes('Phase 17.9A1 - Chess Stabilization') || preText.includes('Phase 17.9A2 - Chess Engine Separation') || (preText.includes('Phase 17.9A3 - Chess Overlay UI Repair') || (preText.includes('Phase 17.9A4 - Chess UI Rematch Hint Tabbar') || preText.includes('Phase 17.9A5 - Chess Surface Layer Geometry Tabbar'))))))) && (/Phase 17\.8(?:A|B|C) - Planner/.test(postText) || (postText.includes('Phase 17.8D - Shared Event Store + UI-thread Navigation Chrome') || postText.includes('Phase 17.8E - Icon-only UI-thread Tab Bar') || (postText.includes('Phase 17.9A - Persistent Chess Surface') || (postText.includes('Phase 17.9A1 - Chess Stabilization') || postText.includes('Phase 17.9A2 - Chess Engine Separation') || (postText.includes('Phase 17.9A3 - Chess Overlay UI Repair') || (postText.includes('Phase 17.9A4 - Chess UI Rematch Hint Tabbar') || postText.includes('Phase 17.9A5 - Chess Surface Layer Geometry Tabbar'))))))));
check('PRE-COPY removes stale Phase 17.8 reports', preText.includes('PHASE_17_8_BUILD_REPORT.md') && (!preText.includes('Phase 17.8B - Planner Stable Architecture') || preText.includes('PHASE_17_8A_BUILD_REPORT.md')));
const hasOnlyCrLf = b => { for(let i=0;i<b.length;i++){ if(b[i]===10 && (i===0 || b[i-1]!==13)) return false; } return true; };
check('Root BAT files use Windows CRLF line endings', hasOnlyCrLf(pre) && hasOnlyCrLf(post));
check('Root BAT command text is ASCII-safe', [...pre,...post].every(v => v < 128));
for (const f of ['src/app/(tabs)/planner.tsx','src/hooks/family/useFamilyEvents.ts','src/services/realtime/sharedRealtimeRegistry.ts']) {
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
for(const [f,h] of Object.entries(hashes)) check(`Protected baseline unchanged: ${f}`, ((phase17_9aChess && ['src/components/chess/ChessBoard.tsx','src/components/chess/v2/ChessPiece.tsx','src/app/(chess)/chess-game/[gameId].tsx'].includes(f)) || (phase17_9a9Server && f === 'server/src/socket/socketServer.ts') || sha(f)===h));
console.log(`\nPhase 17.8A Planner Restore Hotfix gate: ${pass}/${pass+fail} PASS`); if(fail) process.exit(1);
