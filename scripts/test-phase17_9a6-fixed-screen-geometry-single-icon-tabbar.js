const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
let pass=0,fail=0;
function check(name,ok){if(ok){pass++;console.log(`PASS ${String(pass+fail).padStart(2,'0')} - ${name}`)}else{fail++;console.error(`FAIL ${String(pass+fail).padStart(2,'0')} - ${name}`)}}
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

check('Chess surface root uses explicit screen width and height', host.includes('width: windowWidth') && host.includes('height: windowHeight') && /chessSurfaceRoot:[\s\S]{0,160}position: "absolute"/.test(host));
check('Chess root corrects its native window origin once after prewarm', host.includes('measureInWindow((x, y) =>') && host.includes('left: -screenOrigin.x') && host.includes('top: -screenOrigin.y') && host.includes('collapsable={false}'));
check('Board size is screen-width owned with one 5dp gutter per side', host.includes('const CHESS_SCREEN_GUTTER = 5') && host.includes('windowWidth - CHESS_SCREEN_GUTTER * 2') && host.includes('Math.floor(raw / 8) * 8'));
const boardGeometryBlock=host.slice(host.indexOf('const boardViewportSize'),host.indexOf('const gameStackHeight'));
check('Board size no longer depends on screen height', boardGeometryBlock.includes('[windowWidth]') && !boardGeometryBlock.includes('windowHeight'));
check('Game stack height is numeric HUD plus board geometry', host.includes('const gameStackHeight = CHESS_HUD_HEIGHT * 2 + CHESS_CONTENT_GAP * 2 + boardViewportSize'));
check('Game stack is vertically centered directly from screen height', host.includes('const gameStackTop = Math.max(0, Math.floor((windowHeight - gameStackHeight) / 2))'));
check('Game stack receives explicit top width and height', host.includes('styles.gameStack, { top: gameStackTop, width: windowWidth, height: gameStackHeight }'));
check('Board frame is exactly boardSize with no extra padding', host.includes('width: boardViewportSize, height: boardViewportSize') && !/boardFrame:[^\n]*padding:/.test(host));
check('ChessBoard only receives exact host boardSize', host.includes('boardSize={boardViewportSize}') && board.includes('boardSize: number') && !board.includes('useWindowDimensions'));
check('Ready Promotion and Result share one explicit screen-sized modal layer', host.includes('styles.chessModalLayer, { width: windowWidth, height: windowHeight }') && host.includes('showPreparing ? (') && host.includes('promotion && actualGame') && host.includes('showResult ? ('));
check('Modal layer center is independent of game stack and FX', /chessModalLayer:[\s\S]{0,220}position: "absolute"[\s\S]{0,120}alignItems: "center"[\s\S]{0,120}justifyContent: "center"/.test(host) && host.indexOf('styles.boardFxLayer') < host.indexOf('styles.chessModalLayer'));
check('FX remains board-local only', host.includes('styles.boardFxLayer') && host.includes('<ChessBattleEffects') && /boardFxLayer:[^\n]*absoluteFillObject/.test(host));
check('Legacy A5 height budget and safe-area board sizing are retired', !host.includes('heightBudget') && !host.includes('contentTop') && !host.includes('contentBottom') && !host.includes('useSafeAreaInsets'));

const buttonSection=tabs.slice(tabs.indexOf('function BloomTabButton'),tabs.indexOf('function BloomSlidingTabBar'));
check('Each tab button renders exactly one Ionicon', (buttonSection.match(/<Ionicons/g)||[]).length===1);
check('Tab active state changes only icon color', buttonSection.includes('color={focused ? COLORS.white : COLORS.tabInactive}') && !buttonSection.includes('activeIconStyle') && !buttonSection.includes('inactiveIconStyle'));
check('Single tab glyph uses a fixed Android font box', tabs.includes('style={styles.tabIconGlyph}') && tabs.includes('lineHeight: TAB_ICON_SIZE') && tabs.includes('includeFontPadding: false') && tabs.includes('textAlignVertical: "center"') && !tabs.includes('tabIconLayer:'));
check('Tab button no longer subscribes to indicator SharedValue', !buttonSection.includes('indicatorIndex') && !buttonSection.includes('useAnimatedStyle'));
check('Tab icons never scale or translate between active states', !buttonSection.includes('transform:') && !buttonSection.includes('scale:'));
check('Indicator still moves independently on UI thread', tabs.includes('indicatorIndex.value = withTiming(index') && tabs.includes('const indicatorStyle = useAnimatedStyle'));
check('Tabbar retains 58px visual track plus separate safe-area spacer', /visualTrack:[\s\S]{0,100}height: 58/.test(tabs) && tabs.includes('<View pointerEvents="none" style={{ height: bottomInset }} />'));
check('Pill remains 50x36 centered in visual track', tabs.includes('TAB_INDICATOR_WIDTH = 50') && tabs.includes('TAB_INDICATOR_HEIGHT = 36') && /slidingIndicator:[\s\S]{0,80}top: 11/.test(tabs));
check('Pink halo is one real-color view, not native shadow', (tabs.match(/style=\{\[styles\.slidingIndicatorGlow/g)||[]).length===1 && tabs.includes('rgba(236,160,185,0.38)') && !tabs.includes('slidingIndicatorGlowLarge') && !tabs.includes('slidingIndicatorGlowSmall'));
check('Indicator and halo do not use Android elevation shadow', !/slidingIndicator(?:Glow)?:[\s\S]{0,220}elevation: [1-9]/.test(tabs));
check('Full Chess still hides tab chrome without navigation', tabs.includes('chessSurface.mode === "full"') && tabs.includes('opacity: chessSurface.mode === "full" ? 0 : 1'));

check('Phase 17.9A6 package script is registered',pkg.scripts?.['phase17_9a6:check']==='node ./scripts/test-phase17_9a6-fixed-screen-geometry-single-icon-tabbar.js');
check('Current Chess aggregate includes A6',aggregate.includes('test-phase17_9a6-fixed-screen-geometry-single-icon-tabbar.js'));
check('Post-copy updater runs A6 gate',post.includes('test-phase17_9a6-fixed-screen-geometry-single-icon-tabbar.js'));
check('Android Debug and Release run A6 gate',debug.includes('phase17_9a6:check')&&release.includes('phase17_9a6:check'));
check('Pre-copy and overlay cleanup retire stale A5 report',pre.includes('PHASE_17_9A5_BUILD_REPORT.md')&&cleanup.includes('PHASE_17_9A5_BUILD_REPORT.md'));
check('Root BATs identify Phase 17.9A6',pre.includes('Phase 17.9A6 - Fixed Screen Geometry Single Icon Tabbar')&&post.includes('Phase 17.9A6 - Fixed Screen Geometry Single Icon Tabbar'));
check('Root BATs remain CRLF and ASCII-safe',crlfOnly(preBuf)&&crlfOnly(postBuf)&&[...preBuf,...postBuf].every(v=>v<128));
const protectedHashes={
 'server/src/socket/socketServer.ts':'dd60cbc1345d5e3f577b32f1265646ae51f24c3d6ba12ac6a4935da38a1efd07',
 'firestore.rules':'a872b09e20259f22e04e8564d3f0c0722a895235bac2da71bf663c6c8b81222a',
 'firestore.indexes.json':'b88b9fab1c5db94017e0d1744abf0d1ca98979ef86bdefa2e6831fc0e49d429f',
 'src/components/xiangqi/XiangqiGameBoard.tsx':'a7182cc98c97b299d6a40ea83765230b163f0cc6c921f8792d618967f9e61f93',
 'src/app/(xiangqi)/xiangqi-preview.tsx':'cc1a43c20ef21e3e434f9c9c0c306b08ea09f62bf897f010ee30a413c096c71d',
};
for(const [f,h] of Object.entries(protectedHashes))check(`Protected baseline unchanged: ${f}`,sha(f)===h);
for(const f of ['src/components/chess/ChessSurfaceHost.tsx','src/components/chess/ChessBoard.tsx','src/app/(tabs)/_layout.tsx']){
 const r=ts.transpileModule(read(f),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext},reportDiagnostics:true,fileName:f});
 check(`${f} transpiles`,!(r.diagnostics||[]).some(d=>d.category===ts.DiagnosticCategory.Error));
}
console.log(`\nPhase 17.9A6 Fixed Screen Geometry Single Icon Tabbar: ${pass}/${pass+fail} PASS`);
if(fail)process.exit(1);
