const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
let pass=0,fail=0;
function check(name,ok){ if(ok){pass++;console.log(`PASS ${String(pass+fail).padStart(2,'0')} - ${name}`)} else {fail++;console.error(`FAIL ${String(pass+fail).padStart(2,'0')} - ${name}`)} }
const host=read('src/components/chess/ChessSurfaceHost.tsx');
const board=read('src/components/chess/ChessBoard.tsx');
const tabs=read('src/app/(tabs)/_layout.tsx');
const aggregate=read('scripts/test-chess-current-build-gates.js');
const cleanup=read('scripts/setup/cleanup-overlay-routes.js');
const pkg=JSON.parse(read('package.json'));
const preBuf=fs.readFileSync(path.join(root,'Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat'));
const postBuf=fs.readFileSync(path.join(root,'Family_Bloom_CLEAN_APPLY_FULL.bat'));
const pre=preBuf.toString('ascii'),post=postBuf.toString('ascii');
const debug=read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const release=read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
const crlfOnly=b=>{for(let i=0;i<b.length;i++)if(b[i]===10&&(i===0||b[i-1]!==13))return false;return true};
const isA6=!!pkg.scripts?.['phase17_9a6:check'];

check('ChessSurfaceRoot owns one full-window native layer', isA6 ? (host.includes('width: windowWidth') && host.includes('height: windowHeight') && host.includes('left: -screenOrigin.x') && host.includes('top: -screenOrigin.y')) : host.includes('style={styles.chessSurfaceRoot}') && host.includes('chessSurfaceRoot: {') && host.includes('zIndex: 10000'));
check('Chess content and modal are sibling layers', host.includes('styles.chessContentLayer') && host.includes('styles.chessModalLayer') && host.indexOf('</Animated.View>') < host.indexOf('styles.chessModalLayer'));
check('Chess modal layer is absolute centered across the full surface', host.includes('chessModalLayer: {') && host.includes('...StyleSheet.absoluteFillObject') && host.includes('alignItems: "center"') && host.includes('justifyContent: "center"') && host.includes('zIndex: 20000'));
check('Ready Promotion and Result all render through ChessModalLayer', host.includes('modalVisible') && host.includes('showPreparing ? (') && host.includes('promotion && actualGame') && host.includes('showResult ? ('));
check('Board FX is board-owned and cannot own modal layout', host.includes('styles.boardFxLayer') && host.includes('<ChessBattleEffects') && host.includes('boardFxLayer: { ...StyleSheet.absoluteFillObject') && host.indexOf('styles.boardFxLayer') < host.indexOf('styles.chessModalLayer'));
check('Chess host is sole geometry owner', host.includes('useWindowDimensions') && host.includes('windowWidth') && host.includes('windowHeight') && (isA6 ? host.includes('gameStackTop') : host.includes('contentTop') && host.includes('contentBottom')));
check('Board size uses the current explicit geometry contract', isA6 ? host.includes('CHESS_SCREEN_GUTTER = 5') && host.includes('windowWidth - CHESS_SCREEN_GUTTER * 2') && host.includes('boardSize={boardViewportSize}') : host.includes('widthBudget') && host.includes('heightBudget') && host.includes('CHESS_BOARD_GUTTER * 2') && host.includes('boardSize={boardViewportSize}'));
check('Legacy onLayout feedback loop is retired', !host.includes('handleBoardFrameLayout') && !host.includes('onLayout={handleBoardFrameLayout}') && !host.includes('setBoardViewportSize'));
check('ChessBoard no longer measures the window', !board.includes('useWindowDimensions') && !board.includes('width - 12'));
check('Legacy 430 board hard cap is retired', !board.includes('430') && !board.includes('maxBoardSize'));
check('ChessBoard receives exact boardSize from host', board.includes('boardSize: number') && board.includes('normalizedBoardSize') && board.includes('Math.floor(boardSize / 8) * 8'));
check('Board gutter is applied exactly once', isA6 ? host.includes('CHESS_SCREEN_GUTTER = 5') && !/boardFrame:[^\n]*padding:/.test(host) : host.includes('padding: CHESS_BOARD_GUTTER') && !host.includes('paddingHorizontal: CHESS_BOARD_GUTTER'));
check('Tabbar uses one fixed glyph per route', tabs.includes('const iconFor = (route: string)') && !tabs.includes('iconFor(route.name, false)') && !tabs.includes('iconFor(route.name, true)') && !tabs.includes('home-outline') && !tabs.includes('calendar-outline'));
check('Tab icon geometry is stable across active state', isA6 ? (tabs.slice(tabs.indexOf('function BloomTabButton'),tabs.indexOf('function BloomSlidingTabBar')).match(/<Ionicons/g)||[]).length===1 : (tabs.match(/Ionicons name=\{iconFor\(route\.name\)\}/g)||[]).length===2);
check('Tab icon does not scale when active', !tabs.includes('transform: [{ scale: 0.94 + proximity * 0.08 }]'));
check('Tabbar has a dedicated 58px VisualTrack', tabs.includes('style={styles.visualTrack}') && /visualTrack:[\s\S]{0,120}height: 58/.test(tabs));
check('Safe area is a separate spacer below VisualTrack', tabs.includes('<View pointerEvents="none" style={{ height: bottomInset }} />'));
check('Pill keeps 50x36 geometry centered at y=29', tabs.includes('TAB_INDICATOR_WIDTH = 50') && tabs.includes('TAB_INDICATOR_HEIGHT = 36') && /slidingIndicator:[\s\S]{0,100}top: 11/.test(tabs));
check('Pink shadow is rendered with real color layers', isA6 ? tabs.includes('slidingIndicatorGlow') && tabs.includes('rgba(236,160,185,0.38)') : tabs.includes('slidingIndicatorGlowLarge') && tabs.includes('slidingIndicatorGlowSmall') && tabs.includes('rgba(245,184,203,0.16)') && tabs.includes('rgba(245,184,203,0.26)'));
check('Indicator itself does not rely on Android elevation shadow', /slidingIndicator:[\s\S]{0,180}backgroundColor: "#ECA0B9"/.test(tabs) && !/slidingIndicator:[\s\S]{0,260}elevation: [1-9]/.test(tabs));
check('Full Chess hides tab chrome without navigating routes', tabs.includes('chessSurface.mode === "full"') && tabs.includes('opacity: chessSurface.mode === "full" ? 0 : 1'));
check('Phase 17.9A5 package script is registered', pkg.scripts?.['phase17_9a5:check']==='node ./scripts/test-phase17_9a5-chess-surface-layer-geometry-tabbar.js');
check('Current Chess aggregate includes A5', aggregate.includes('test-phase17_9a5-chess-surface-layer-geometry-tabbar.js'));
check('Post-copy updater runs A5 gate', post.includes('test-phase17_9a5-chess-surface-layer-geometry-tabbar.js'));
check('Android Debug and Release run A5 gate', debug.includes('phase17_9a5:check') && release.includes('phase17_9a5:check'));
check('Pre-copy cleanup retires stale A4 report', pre.includes('PHASE_17_9A4_BUILD_REPORT.md'));
check('Overlay cleanup retires stale A4 report', cleanup.includes('PHASE_17_9A4_BUILD_REPORT.md'));
check('Root BATs identify Phase 17.9A5 or successor', (pre.includes('Phase 17.9A5 - Chess Surface Layer Geometry Tabbar') && post.includes('Phase 17.9A5 - Chess Surface Layer Geometry Tabbar')) || (pre.includes('Phase 17.9A6 - Fixed Screen Geometry Single Icon Tabbar') && post.includes('Phase 17.9A6 - Fixed Screen Geometry Single Icon Tabbar')));
check('Root BATs remain CRLF and ASCII-safe', crlfOnly(preBuf)&&crlfOnly(postBuf)&&[...preBuf,...postBuf].every(v=>v<128));
const protectedHashes={
  'server/src/socket/socketServer.ts':'dd60cbc1345d5e3f577b32f1265646ae51f24c3d6ba12ac6a4935da38a1efd07',
  'firestore.rules':'a872b09e20259f22e04e8564d3f0c0722a895235bac2da71bf663c6c8b81222a',
  'firestore.indexes.json':'b88b9fab1c5db94017e0d1744abf0d1ca98979ef86bdefa2e6831fc0e49d429f',
  'src/components/xiangqi/XiangqiGameBoard.tsx':'a7182cc98c97b299d6a40ea83765230b163f0cc6c921f8792d618967f9e61f93',
  'src/app/(xiangqi)/xiangqi-preview.tsx':'cc1a43c20ef21e3e434f9c9c0c306b08ea09f62bf897f010ee30a413c096c71d',
};
for(const [f,h] of Object.entries(protectedHashes)) check(`Protected baseline unchanged: ${f}`,sha(f)===h);
for(const f of ['src/components/chess/ChessSurfaceHost.tsx','src/components/chess/ChessBoard.tsx','src/app/(tabs)/_layout.tsx']){
 const r=ts.transpileModule(read(f),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext},reportDiagnostics:true,fileName:f});
 check(`${f} transpiles`,!(r.diagnostics||[]).some(d=>d.category===ts.DiagnosticCategory.Error));
}
console.log(`\nPhase 17.9A5 Chess Surface Layer Geometry Tabbar: ${pass}/${pass+fail} PASS`);
if(fail)process.exit(1);
