const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const exists = p => fs.existsSync(path.join(root,p));
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
let pass=0, fail=0;
function check(name, ok){ if(ok){pass++;console.log(`PASS ${String(pass+fail).padStart(2,'0')} - ${name}`)}else{fail++;console.error(`FAIL ${String(pass+fail).padStart(2,'0')} - ${name}`)} }
function pngSize(file){ const b=fs.readFileSync(path.join(root,file)); if(b.length<24 || b.toString('ascii',1,4)!=='PNG') return null; return [b.readUInt32BE(16),b.readUInt32BE(20)]; }
const host=read('src/components/chess/ChessSurfaceHost.tsx');
const rail=read('src/components/chess/ChessPlayerRail.tsx');
const clock=read('src/components/chess/ChessClock.tsx');
const material=read('src/components/chess/ChessMaterialStrip.tsx');
const board=read('src/components/chess/ChessBoard.tsx');
const piece=read('src/components/chess/v2/ChessPiece.tsx');
const tabs=read('src/app/(tabs)/_layout.tsx');
const cleanup=read('scripts/setup/cleanup-overlay-routes.js');
const aggregate=read('scripts/test-chess-current-build-gates.js');
const pkg=JSON.parse(read('package.json'));
const phase17_9a4 = pkg.scripts?.['phase17_9a4:check'];
const phase17_9a5 = pkg.scripts?.['phase17_9a5:check'];
const phase17_9a6 = pkg.scripts?.['phase17_9a6:check'];
const phase17_9a4OrLater = phase17_9a4 || phase17_9a5 || phase17_9a6;
const preBat=fs.readFileSync(path.join(root,'Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat'));
const postBat=fs.readFileSync(path.join(root,'Family_Bloom_CLEAN_APPLY_FULL.bat'));
const pre=preBat.toString('ascii'), post=postBat.toString('ascii');
const debug=read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const release=read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
const crlfOnly = buffer => { for(let i=0;i<buffer.length;i++) if(buffer[i]===10 && (i===0 || buffer[i-1]!==13)) return false; return true; };

check('Chess full surface layout successor remains intentional', phase17_9a6 ? host.includes('CHESS_SCREEN_GUTTER = 5') : phase17_9a4OrLater ? host.includes('CHESS_BOARD_GUTTER = 10') : /fullSurface:[\s\S]{0,250}top: 5,[\s\S]{0,80}left: 5,[\s\S]{0,80}right: 5,[\s\S]{0,80}bottom: 5/.test(host));
check('Chess full surface visual successor remains intentional', phase17_9a4OrLater ? host.includes('backgroundColor: "#FFF8FB"') : host.includes('backgroundColor: "rgba(255,248,251,0.88)"') && host.includes('borderRadius: 26'));
check('Chess full surface keeps content safe without restoring the old header', (phase17_9a6 ? (host.includes('width: windowWidth, height: windowHeight') && host.includes('gameStackTop')) : host.includes('useSafeAreaInsets') && (phase17_9a5 ? host.includes('const contentTop = insets.top + 8') : phase17_9a4 ? host.includes('paddingTop: insets.top + 8') : host.includes('paddingTop: insets.top + 4'))) && !host.includes('CỜ VUA NHÀ MÌNH'));
check('Legacy dedicated Chess title header is removed', !host.includes('fullTopBar') && !host.includes('fullTitleWrap') && !host.includes('fullEyebrow'));
check('Opponent rail owns overflow and minimize controls', host.includes('actions={(') && host.includes('accessibilityLabel="Tùy chọn ván cờ"') && host.includes('accessibilityLabel="Thu nhỏ bàn cờ"'));
check('Draw and resign remain inside overflow menu', host.includes('Xin hòa') && host.includes('Đầu hàng') && host.includes('styles.overflowMenu'));
check('Player rail successor remains compact/readable', phase17_9a4OrLater ? /rail:[\s\S]{0,120}minHeight: 56/.test(rail) : /rail:[\s\S]{0,120}minHeight: 48/.test(rail) && /avatar:[\s\S]{0,80}width: 30, height: 30/.test(rail));
check('Clock successor remains compact/readable', phase17_9a4OrLater ? /box:[\s\S]{0,120}minWidth: 72,[\s\S]{0,80}minHeight: 38/.test(clock) : /box:[\s\S]{0,120}minWidth: 68,[\s\S]{0,80}minHeight: 34/.test(clock));
check('Material strip is a single compact row', /container:[\s\S]{0,180}minHeight: 14[\s\S]{0,100}flexDirection: "row"/.test(material));
check('Board frame can consume the full available overlay width', (host.includes('boardFrame: { flex: 1') && host.includes('width: "100%"')) || (phase17_9a6 && host.includes('width: boardViewportSize, height: boardViewportSize')) || (phase17_9a5 && host.includes('width: boardViewportSize + CHESS_BOARD_GUTTER * 2')));
check('ChessBoard horizontal reserve is reduced for a larger board', board.includes('Math.min(width - 12, 430, maxBoardSize') || ((phase17_9a5 || phase17_9a6) && board.includes('boardSize: number') && !board.includes('430')));
check('Chess pieces render at 0.88 of square size', piece.includes('squareSize * 0.88') && !piece.includes('squareSize * 0.984'));
const codes=['wk','wq','wr','wb','wn','wp','bk','bq','br','bb','bn','bp'];
check('All 12 production PNG pieces exist', codes.every(c=>exists(`assets/images/chess/pieces-png-default/${c}.png`)));
check('All 12 production PNG pieces are resized to 192x192', codes.every(c=>{ const z=pngSize(`assets/images/chess/pieces-png-default/${c}.png`); return z && z[0]===192 && z[1]===192; }));
check('Legacy WebP piece directory is removed', !exists('assets/images/chess/pieces-webp-default'));
check('Production source has no WebP piece references', ![host,rail,material,board,piece].some(s=>s.includes('pieces-webp-default')));
check('Overlay cleanup removes legacy WebP directory after copy-over', cleanup.includes("'assets/images/chess/pieces-webp-default'"));
check('Pre-copy cleanup removes legacy WebP directory from old projects', pre.includes('assets\\images\\chess\\pieces-webp-default'));
check('Ready and Promotion remain centered in active Chess surface', (phase17_9a5 || phase17_9a6) ? host.includes('chessModalLayer: {') && host.includes('justifyContent: "center"') : phase17_9a4 ? host.includes('surfaceOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center"') : host.includes('boardOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center"'));
check('Result overlay is absolute and centered above the whole Chess surface', (host.includes('resultOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center"') && host.includes('zIndex: 120')) || ((phase17_9a5 || phase17_9a6) && host.includes('chessModalLayer: {') && host.includes('zIndex: 20000')));
check('Result card is compact and no longer flow-pushed below board', host.includes('resultCard: { width: "92%"') && host.includes('maxWidth: 360'));
check('Mini behavior from A2 remains compact and turn-aware', host.includes('width: 94, height: 42') && host.includes('state.turn === myColor ? 1 : 0.5'));
check('Bottom tab successor preserves icon-only UI-thread indicator', phase17_9a4OrLater ? tabs.includes('height: 58 + bottomInset') && tabs.includes('TAB_INDICATOR_HEIGHT = 36') : tabs.includes('height: 52 + bottomInset'));
check('Bottom tab uses Bloom pink with powder-pink shadow/glow', phase17_9a4OrLater ? tabs.includes('backgroundColor: "#ECA0B9"') && (tabs.includes('slidingIndicatorGlow') || tabs.includes('slidingIndicatorGlowLarge')) : tabs.includes('backgroundColor: "#E58AA9"'));
check('Phase 17.9A3 package script is registered', pkg.scripts?.['phase17_9a3:check']==='node ./scripts/test-phase17_9a3-chess-overlay-ui-repair.js');
check('Current Chess aggregate includes Phase 17.9A3', aggregate.includes('test-phase17_9a3-chess-overlay-ui-repair.js'));
check('Root BATs identify current Chess overlay successor', phase17_9a6 ? pre.includes('Phase 17.9A6 - Fixed Screen Geometry Single Icon Tabbar') && post.includes('Phase 17.9A6 - Fixed Screen Geometry Single Icon Tabbar') : phase17_9a5 ? pre.includes('Phase 17.9A5 - Chess Surface Layer Geometry Tabbar') && post.includes('Phase 17.9A5 - Chess Surface Layer Geometry Tabbar') : phase17_9a4 ? pre.includes('Phase 17.9A4 - Chess UI Rematch Hint Tabbar') && post.includes('Phase 17.9A4 - Chess UI Rematch Hint Tabbar') : pre.includes('Phase 17.9A3 - Chess Overlay UI Repair') && post.includes('Phase 17.9A3 - Chess Overlay UI Repair'));
check('Post-copy updater runs Phase 17.9A3', post.includes('test-phase17_9a3-chess-overlay-ui-repair.js'));
check('Android Debug and Release builds run Phase 17.9A3', debug.includes('npm run phase17_9a3:check') && release.includes('npm run phase17_9a3:check'));
check('Overlay cleanup retires stale Phase 17.9A2 report', cleanup.includes('PHASE_17_9A2_BUILD_REPORT.md'));
check('Root BATs remain CRLF and ASCII-safe', crlfOnly(preBat) && crlfOnly(postBat) && [...preBat,...postBat].every(v=>v<128));
const protectedHashes={
  'server/src/socket/socketServer.ts':'dd60cbc1345d5e3f577b32f1265646ae51f24c3d6ba12ac6a4935da38a1efd07',
  'firestore.rules':'a872b09e20259f22e04e8564d3f0c0722a895235bac2da71bf663c6c8b81222a',
  'firestore.indexes.json':'b88b9fab1c5db94017e0d1744abf0d1ca98979ef86bdefa2e6831fc0e49d429f',
  'src/components/xiangqi/XiangqiGameBoard.tsx':'a7182cc98c97b299d6a40ea83765230b163f0cc6c921f8792d618967f9e61f93',
  'src/app/(xiangqi)/xiangqi-preview.tsx':'cc1a43c20ef21e3e434f9c9c0c306b08ea09f62bf897f010ee30a413c096c71d',
};
for(const [f,h] of Object.entries(protectedHashes)) check(`Protected baseline unchanged: ${f}`, sha(f)===h);
for(const f of ['src/components/chess/ChessSurfaceHost.tsx','src/components/chess/ChessPlayerRail.tsx','src/components/chess/ChessClock.tsx','src/components/chess/ChessMaterialStrip.tsx','src/components/chess/ChessBoard.tsx','src/components/chess/v2/ChessPiece.tsx','src/app/(tabs)/_layout.tsx']){
  const r=ts.transpileModule(read(f),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext},reportDiagnostics:true,fileName:f});
  check(`${f} transpiles`, !(r.diagnostics||[]).some(d=>d.category===ts.DiagnosticCategory.Error));
}
console.log(`\nPhase 17.9A3 Chess Overlay UI Repair: ${pass}/${pass+fail} PASS`);
if(fail) process.exit(1);
