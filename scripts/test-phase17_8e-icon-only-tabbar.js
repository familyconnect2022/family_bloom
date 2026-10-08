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
const tabs=read('src/app/(tabs)/_layout.tsx');
const planner=read('src/app/(tabs)/planner.tsx');
const pkg=JSON.parse(read('package.json'));
const phase17_9a6=!!pkg.scripts?.['phase17_9a6:check'];
const pre=bytes('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const post=bytes('Family_Bloom_CLEAN_APPLY_FULL.bat');
const preText=pre.toString('utf8');
const postText=post.toString('utf8');
const cleanup=read('scripts/setup/cleanup-overlay-routes.js');
const debugBat=read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat=read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

check('Bottom tab is icon-only in rendered items', !tabs.includes('<Text numberOfLines={1} style={[styles.tabLabel') && !tabs.includes('styles.tabLabel'));
check('Hidden labels remain available for accessibility', tabs.includes('accessibilityLabel={label}') && tabs.includes('fallbackTitle'));
check('Tab icons remain enlarged and centered', tabs.includes('const TAB_ICON_SIZE = 27') || tabs.includes('const TAB_ICON_SIZE = 26'));
check('Active indicator is a lower-profile compact centered pill', (tabs.includes('const TAB_INDICATOR_WIDTH = 54') && tabs.includes('const TAB_INDICATOR_HEIGHT = 44')) || (tabs.includes('const TAB_INDICATOR_WIDTH = 52') && tabs.includes('const TAB_INDICATOR_HEIGHT = 40')) || (tabs.includes('const TAB_INDICATOR_WIDTH = 50') && tabs.includes('const TAB_INDICATOR_HEIGHT = 36')));
check('Pill is fully rounded', tabs.includes('borderRadius: 999'));
check('Pill uses softer Bloom active pink', tabs.includes('backgroundColor: "#D96F98"') || tabs.includes('backgroundColor: "#E58AA9"') || tabs.includes('backgroundColor: "#ECA0B9"'));
check('Active icon is white', phase17_9a6 ? tabs.includes('color={focused ? COLORS.white : COLORS.tabInactive}') : tabs.includes('color={COLORS.white}'));
check('Inactive icon uses neutral tab color', phase17_9a6 ? tabs.includes('color={focused ? COLORS.white : COLORS.tabInactive}') : tabs.includes('color={COLORS.tabInactive}'));
const buttonSection=tabs.slice(tabs.indexOf('function BloomTabButton'),tabs.indexOf('function BloomSlidingTabBar'));
check('Icon color behavior matches current architecture', phase17_9a6 ? ((buttonSection.match(/<Ionicons/g)||[]).length===1 && !buttonSection.includes('indicatorIndex')) : tabs.includes('indicatorIndex: SharedValue<number>') && (tabs.match(/Math\.abs\(indicatorIndex\.value - index\)/g)||[]).length >= 2);
check('UI-thread tab motion starts optimistically on press-in', tabs.includes('onPressIn={onPressIn}') && tabs.includes('animateIndicatorTo(index)'));
check('Tab motion is deliberately gentler than 17.8D', tabs.includes('const TAB_MOTION_MS = 232'));
check('Tab motion uses premium easing', tabs.includes('Easing.bezier(0.22, 1, 0.36, 1)'));
check('Navigation confirmation does not restart accepted motion', tabs.includes('if (optimisticIndexRef.current === state.index) return'));
check('Prevented tab press rolls the visual state back', tabs.includes('animateIndicatorTo(state.index, 135)'));
check('Main screen transition remains disabled', tabs.includes('animation: BLOOM_MOTION.tabs.animation'));

check('Planner useRef runtime hotfix is bundled', /import \{[^}]*useRef[^}]*\} from "react";/.test(planner) && planner.includes('plannerOptimisticModeRef = useRef<PlannerMode>'));
check('Planner persistent panels remain intact', planner.includes('<CalendarPanel') && planner.includes('<EventsPanel') && planner.includes('plannerModeProgress'));

check('Phase 17.8E gate registered', pkg.scripts?.['phase17_8e:check']==='node ./scripts/test-phase17_8e-icon-only-tabbar.js');
check('Post-copy updater runs Phase 17.8E gate directly', postText.includes('test-phase17_8e-icon-only-tabbar.js'));
check('Debug build runs Phase 17.8E gate', debugBat.includes('npm run phase17_8e:check'));
check('Release build runs Phase 17.8E gate', releaseBat.includes('npm run phase17_8e:check'));
check('PRE-COPY retires stale Phase 17.8D report', preText.includes('PHASE_17_8D_BUILD_REPORT.md'));
check('Overlay cleanup retires stale Phase 17.8D report', cleanup.includes('PHASE_17_8D_BUILD_REPORT.md'));
check('Root BATs identify Phase 17.8E', (preText.includes('Phase 17.8E - Icon-only UI-thread Tab Bar') || (preText.includes('Phase 17.9A - Persistent Chess Surface') || (preText.includes('Phase 17.9A1 - Chess Stabilization') || preText.includes('Phase 17.9A2 - Chess Engine Separation') || (preText.includes('Phase 17.9A3 - Chess Overlay UI Repair') || (preText.includes('Phase 17.9A4 - Chess UI Rematch Hint Tabbar') || preText.includes('Phase 17.9A5 - Chess Surface Layer Geometry Tabbar') || preText.includes('Phase 17.9A6 - Fixed Screen Geometry Single Icon Tabbar')))))) && (postText.includes('Phase 17.8E - Icon-only UI-thread Tab Bar') || (postText.includes('Phase 17.9A - Persistent Chess Surface') || (postText.includes('Phase 17.9A1 - Chess Stabilization') || postText.includes('Phase 17.9A2 - Chess Engine Separation') || (postText.includes('Phase 17.9A3 - Chess Overlay UI Repair') || (postText.includes('Phase 17.9A4 - Chess UI Rematch Hint Tabbar') || postText.includes('Phase 17.9A5 - Chess Surface Layer Geometry Tabbar') || postText.includes('Phase 17.9A6 - Fixed Screen Geometry Single Icon Tabbar')))))));
check('Post-copy updater still avoids npm dependency', !postText.includes('NPM_CMD') && !postText.includes('where npm.cmd'));
const crlfOnly = b => { for(let i=0;i<b.length;i++){ if(b[i]===10 && (i===0 || b[i-1]!==13)) return false; } return true; };
check('Root BATs use Windows CRLF only', crlfOnly(pre) && crlfOnly(post));
check('Root BAT command text remains ASCII-safe', [...pre,...post].every(v=>v<128));

for(const f of ['src/app/(tabs)/_layout.tsx','src/app/(tabs)/planner.tsx']){
  const out=ts.transpileModule(read(f),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true,fileName:f});
  check(`Syntax clean: ${f}`, !(out.diagnostics||[]).some(d=>d.category===ts.DiagnosticCategory.Error));
}

// Lightweight hook-import regression guard for the runtime crash seen in 17.8D.
for (const [file, hook] of [['src/app/(tabs)/_layout.tsx','useRef'],['src/app/(tabs)/planner.tsx','useRef']]) {
  const source=read(file);
  const importLine=(source.match(/import(?: React,)? \{[^}]+\} from "react";/)||[])[0]||'';
  check(`${hook} imported where used: ${file}`, !source.includes(`${hook}(`) || importLine.includes(hook));
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

console.log(`\nPhase 17.8E Icon-only UI-thread Tab Bar gate: ${pass}/${pass+fail} PASS`); if(fail) process.exit(1);
