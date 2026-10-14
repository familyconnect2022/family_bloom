const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
let pass=0,fail=0;
function check(name,ok){ if(ok){pass++;console.log(`PASS ${String(pass+fail).padStart(2,'0')} - ${name}`)} else {fail++;console.error(`FAIL ${String(pass+fail).padStart(2,'0')} - ${name}`)} }
const host=read('src/components/chess/ChessSurfaceHost.tsx');
const rail=read('src/components/chess/ChessPlayerRail.tsx');
const clock=read('src/components/chess/ChessClock.tsx');
const hints=read('src/components/games/hintTiming.ts');
const hintLayer=read('src/components/chess/v2/HintLayer.tsx');
const tabs=read('src/app/(tabs)/_layout.tsx');
const gate176=read('scripts/test-phase17_6-clean-developer-tools.js');
const cleanup=read('scripts/setup/cleanup-overlay-routes.js');
const aggregate=read('scripts/test-chess-current-build-gates.js');
const pkg=JSON.parse(read('package.json'));
const isA6=!!pkg.scripts?.['phase17_9a6:check'];
const preBuf=fs.readFileSync(path.join(root,'Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat'));
const postBuf=fs.readFileSync(path.join(root,'Family_Bloom_CLEAN_APPLY_FULL.bat'));
const pre=preBuf.toString('ascii'),post=postBuf.toString('ascii');
const debug=read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const release=read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
const crlfOnly=b=>{for(let i=0;i<b.length;i++)if(b[i]===10&&(i===0||b[i-1]!==13))return false;return true};
check('Chess surface is full-screen opaque Bloom shell, not translucent A3 panel', host.includes('...StyleSheet.absoluteFillObject') && host.includes('backgroundColor: "#FFF8FB"') && !host.includes('backgroundColor: "rgba(255,248,251,0.88)"'));
check('Chess board keeps the current intentional edge gutter', isA6 ? host.includes('const CHESS_SCREEN_GUTTER = 5') && host.includes('windowWidth - CHESS_SCREEN_GUTTER * 2') : host.includes('const CHESS_BOARD_GUTTER = 10') && host.includes('padding: CHESS_BOARD_GUTTER') && host.includes('CHESS_BOARD_GUTTER * 2'));
check('HUD rails recover readable height without returning to oversized 70px cards', /rail:[\s\S]{0,120}minHeight: 56/.test(rail) && !/rail:[\s\S]{0,120}minHeight: 70/.test(rail));
check('HUD avatar is readable 32px', /avatar:[\s\S]{0,80}width: 32, height: 32/.test(rail));
check('Clock is balanced at 72x38', /box:[\s\S]{0,120}minWidth: 72,[\s\S]{0,80}minHeight: 38/.test(clock) && clock.includes('fontSize: 16'));
check('Finished game replaces minimize with Exit', host.includes('accessibilityLabel="Thoát bàn cờ"') && host.includes('state.status === "finished" ? (') && host.includes('finishChessSurfaceGame'));
check('Exit hides persistent surface instead of deleting the board component', host.includes('animateSurfaceMode("hidden")') && host.includes('finishChessSurfaceGame(finishedGameId)'));
check('Mini remains unavailable after game-over', host.includes('state.status === "active" || state.status === "paused"'));
check('Rematch immediately enters dedicated preparation state', host.includes('setRematchPreparing(true)') && host.includes('Đang chuẩn bị ván mới…'));
check('Rematch preparation survives only until authoritative new game claims the surface', host.includes('rematchTargetGameIdRef') && host.includes('shouldReleaseRematchPreparing({') && host.includes('if (serverOwnsNewGame)'));
check('Ready overlay is centered on whole Chess surface', (host.includes('style={styles.surfaceOverlay}') || host.includes('styles.chessModalLayer')) && host.includes('showPreparing ? ('));
check('Promotion overlay is centered on whole Chess surface', host.includes('promotion && actualGame') && (host.includes('style={styles.surfaceOverlay}') || host.includes('styles.chessModalLayer')));
check('Result overlay remains centered on whole Chess surface', host.includes('resultOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center"') || host.includes('chessModalLayer: {'));
check('Surface overlay is absolute centered and above board/HUD', (host.includes('surfaceOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center"') && host.includes('zIndex: 110')) || (host.includes('chessModalLayer: {') && host.includes('zIndex: 20000')));
check('Legacy board-only Ready/Promotion overlay style is retired', !host.includes('boardOverlay: {'));
check('Hint reveal budget is sub-100ms', hints.includes('HINT_REVEAL_BUDGET_MS = 96'));
check('Hint pop is reduced to 44ms', hints.includes('HINT_POP_MS = 44'));
check('Hint first visual response uses <=34ms opacity timing', hintLayer.includes('duration: Math.min(34, HINT_POP_MS)'));
check('Hint scale pulse is shortened', hintLayer.includes('duration: 28') && hintLayer.includes('HINT_POP_MS - 28'));
check('Main tab bar restores previous 58px visual height', tabs.includes('height: 58 + bottomInset') && /tabItem:[\s\S]{0,80}height: 58/.test(tabs));
check('Only sliding pill is shorter at 50x36', tabs.includes('TAB_INDICATOR_WIDTH = 50') && tabs.includes('TAB_INDICATOR_HEIGHT = 36'));
check('Sliding pill is vertically centered in 58px row', /slidingIndicator:[\s\S]{0,100}top: 11/.test(tabs));
check('Sliding pill uses lighter Bloom pink', tabs.includes('backgroundColor: "#ECA0B9"'));
check('Powder-pink glow layer exists independently of Android native shadow', (tabs.includes('slidingIndicatorGlow') && (tabs.includes('rgba(244,175,198,0.28)') || tabs.includes('rgba(245,168,195,0.30)') || tabs.includes('rgba(236,160,185,0.38)'))) || (tabs.includes('slidingIndicatorGlowLarge') && tabs.includes('slidingIndicatorGlowSmall') && tabs.includes('rgba(245,184,203,0.26)')));
check('Tab icons remain stable at 26px while indicator stays UI-thread driven', tabs.includes('TAB_ICON_SIZE = 26') && (tabs.includes('indicatorIndex: SharedValue<number>') || (tabs.includes('color={focused ? COLORS.white : COLORS.tabInactive}') && tabs.includes('indicatorIndex.value = withTiming(index'))));
check('Phase 17.6 gate no longer requires historical README wording', gate176.includes('Developer Tools remains Settings-only by production behavior') && !gate176.includes('Copy-over README documents Settings-only Developer Tools'));
check('Phase 17.9A4 package script is registered', pkg.scripts?.['phase17_9a4:check']==='node ./scripts/test-phase17_9a4-chess-ui-rematch-hint-tabbar.js');
check('Current Chess aggregate includes A4', aggregate.includes('test-phase17_9a4-chess-ui-rematch-hint-tabbar.js'));
check('Post-copy updater runs A4 gate', post.includes('test-phase17_9a4-chess-ui-rematch-hint-tabbar.js'));
check('Android Debug and Release run A4 gate', debug.includes('phase17_9a4:check') && release.includes('phase17_9a4:check'));
check('Pre-copy cleanup retires stale A3 report', pre.includes('PHASE_17_9A3_BUILD_REPORT.md'));
check('Overlay cleanup retires stale A3 report', cleanup.includes('PHASE_17_9A3_BUILD_REPORT.md'));
check('Root BATs identify Phase 17.9A4 or successor', (pre.includes('Phase 17.9A4 - Chess UI Rematch Hint Tabbar') && post.includes('Phase 17.9A4 - Chess UI Rematch Hint Tabbar')) || (pre.includes('Phase 17.9A5 - Chess Surface Layer Geometry Tabbar') && post.includes('Phase 17.9A5 - Chess Surface Layer Geometry Tabbar')) || (pre.includes('Phase 17.9A6 - Fixed Screen Geometry Single Icon Tabbar') && post.includes('Phase 17.9A6 - Fixed Screen Geometry Single Icon Tabbar')));
check('Root BATs remain CRLF and ASCII-safe', crlfOnly(preBuf)&&crlfOnly(postBuf)&&[...preBuf,...postBuf].every(v=>v<128));
const protectedHashes={
  'server/src/socket/socketServer.ts':'dd60cbc1345d5e3f577b32f1265646ae51f24c3d6ba12ac6a4935da38a1efd07',
  'firestore.rules':'a872b09e20259f22e04e8564d3f0c0722a895235bac2da71bf663c6c8b81222a',
  'firestore.indexes.json':'b88b9fab1c5db94017e0d1744abf0d1ca98979ef86bdefa2e6831fc0e49d429f',
  'src/components/xiangqi/XiangqiGameBoard.tsx':'a7182cc98c97b299d6a40ea83765230b163f0cc6c921f8792d618967f9e61f93',
  'src/app/(xiangqi)/xiangqi-preview.tsx':'cc1a43c20ef21e3e434f9c9c0c306b08ea09f62bf897f010ee30a413c096c71d',
};
for(const [f,h] of Object.entries(protectedHashes)) check(`Protected baseline unchanged: ${f}`,sha(f)===h);
for(const f of ['src/components/chess/ChessSurfaceHost.tsx','src/components/chess/ChessPlayerRail.tsx','src/components/chess/ChessClock.tsx','src/components/chess/v2/HintLayer.tsx','src/components/games/hintTiming.ts','src/app/(tabs)/_layout.tsx']){
 const r=ts.transpileModule(read(f),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext},reportDiagnostics:true,fileName:f});
 check(`${f} transpiles`,!(r.diagnostics||[]).some(d=>d.category===ts.DiagnosticCategory.Error));
}
console.log(`\nPhase 17.9A4 Chess UI Rematch Hint Tabbar: ${pass}/${pass+fail} PASS`);
if(fail)process.exit(1);
