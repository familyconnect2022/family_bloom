const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
let pass = 0, fail = 0;
function check(name, ok) {
  if (ok) { pass++; console.log(`PASS ${String(pass + fail).padStart(2, '0')} - ${name}`); }
  else { fail++; console.error(`FAIL ${String(pass + fail).padStart(2, '0')} - ${name}`); }
}

const host = read('src/components/chess/ChessSurfaceHost.tsx');
const store = read('src/services/chess/chessSurfaceStore.ts');
const rootLayout = read('src/app/_layout.tsx');
const tabs = read('src/app/(tabs)/_layout.tsx');
const aggregate = read('scripts/test-chess-current-build-gates.js');
const cleanup = read('scripts/setup/cleanup-overlay-routes.js');
const pkg = JSON.parse(read('package.json'));
const preBuf = fs.readFileSync(path.join(root, 'Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat'));
const postBuf = fs.readFileSync(path.join(root, 'Family_Bloom_CLEAN_APPLY_FULL.bat'));
const pre = preBuf.toString('ascii');
const post = postBuf.toString('ascii');
const debug = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const release = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
const crlfOnly = (b) => { for (let i = 0; i < b.length; i++) if (b[i] === 10 && (i === 0 || b[i - 1] !== 13)) return false; return true; };

check('Root still mounts exactly one persistent ChessSurfaceHost sibling', rootLayout.includes('<ChessSurfaceHost />') && (rootLayout.match(/<ChessSurfaceHost/g) || []).length === 1);
check('App bootstrap publishes a Chess presentation-ready gate', rootLayout.includes('setChessSurfacePresentationReady') && /useEffect\(\(\) => \{[\s\S]{0,180}setChessSurfacePresentationReady\(bootstrapReady\)/.test(rootLayout));
check('Presentation gate defaults closed before bootstrap', store.includes('presentationReady: false'));
check('Presentation gate updates store without rebuilding surface', store.includes('export function setChessSurfacePresentationReady') && store.includes('emit({ ...state, presentationReady: ready })'));
check('Full Chess cannot present before bootstrap is ready', host.includes('const fullVisible = presentationReady && surface.mode === "full"'));
check('Mini Chess cannot present before bootstrap is ready', host.includes('const miniVisible = presentationReady && actualGame && surface.mode === "mini"'));
check('Persistent root becomes visually inert during bootstrap without unmounting', host.includes('opacity: presentationReady ? 1 : 0') && (host.match(/<ChessBoard/g) || []).length === 1);
check('Cold active-game restore cannot leak hidden warmup notice over Bloom bootstrap', host.includes('surface.prepareReason !== "active_game"') && /presentationReady[\s\S]{0,120}surface\.preparing[\s\S]{0,120}surface\.mode === "hidden"/.test(host));
check('Board FX has its own clipping viewport', /boardFxClip:[^\n]*absoluteFillObject[^\n]*overflow: "hidden"/.test(host));
check('Board FX clip retains rounded board boundary', /boardFxClip:[^\n]*borderRadius: 22/.test(host));
check('Battle FX renders inside boardFxClip', /style=\{styles\.boardFxClip\}[\s\S]{0,180}<ChessBattleEffects/.test(host));
check('Board frame may stay overflow-visible without letting FX escape', /boardFrame:[^\n]*overflow: "visible"/.test(host) && host.includes('boardFxClip'));
check('Ready Promotion and Result remain on one explicit screen-sized centered modal layer', host.includes('styles.chessModalLayer, { width: windowWidth, height: windowHeight }') && /chessModalLayer:[\s\S]{0,240}alignItems: "center"[\s\S]{0,120}justifyContent: "center"/.test(host));
check('A6 width-owned board geometry is preserved', host.includes('const CHESS_SCREEN_GUTTER = 5') && host.includes('windowWidth - CHESS_SCREEN_GUTTER * 2') && host.includes('Math.floor(raw / 8) * 8'));
check('A6 physical origin correction is preserved', host.includes('measureInWindow((x, y) =>') && host.includes('left: -screenOrigin.x') && host.includes('top: -screenOrigin.y'));
const buttonSection = tabs.slice(tabs.indexOf('function BloomTabButton'), tabs.indexOf('function BloomSlidingTabBar'));
check('Bottom tab still renders exactly one icon node per tab', (buttonSection.match(/<Ionicons/g) || []).length === 1);
check('Bottom tab keeps white active icon and neutral inactive icon', buttonSection.includes('color={focused ? COLORS.white : COLORS.tabInactive}'));
check('Bottom tab surface remains white', tabs.includes('backgroundColor: COLORS.tabSurface'));
check('Phase 17.9A7 package script is registered', pkg.scripts?.['phase17_9a7:check'] === 'node ./scripts/test-phase17_9a7-real-device-surface-ownership-fx-clip.js');
check('Current Chess aggregate includes A7', aggregate.includes('test-phase17_9a7-real-device-surface-ownership-fx-clip.js'));
check('Post-copy updater runs A7 gate', post.includes('test-phase17_9a7-real-device-surface-ownership-fx-clip.js'));
check('Android Debug and Release run A7 gate', debug.includes('phase17_9a7:check') && release.includes('phase17_9a7:check'));
check('Pre-copy and overlay cleanup retire stale A6 report', pre.includes('PHASE_17_9A6_BUILD_REPORT.md') && cleanup.includes('PHASE_17_9A6_BUILD_REPORT.md'));
check('Root BATs identify A7 while retaining A6 successor marker', pre.includes('Phase 17.9A7 - Real Device Surface Ownership FX Clip') && post.includes('Phase 17.9A7 - Real Device Surface Ownership FX Clip') && pre.includes('Phase 17.9A6 - Fixed Screen Geometry Single Icon Tabbar'));
check('Root BATs remain CRLF and ASCII-safe', crlfOnly(preBuf) && crlfOnly(postBuf) && [...preBuf, ...postBuf].every((v) => v < 128));

const protectedHashes = {
  'server/src/socket/socketServer.ts': 'dd60cbc1345d5e3f577b32f1265646ae51f24c3d6ba12ac6a4935da38a1efd07',
  'firestore.rules': 'a872b09e20259f22e04e8564d3f0c0722a895235bac2da71bf663c6c8b81222a',
  'firestore.indexes.json': 'b88b9fab1c5db94017e0d1744abf0d1ca98979ef86bdefa2e6831fc0e49d429f',
  'src/components/xiangqi/XiangqiGameBoard.tsx': 'a7182cc98c97b299d6a40ea83765230b163f0cc6c921f8792d618967f9e61f93',
  'src/app/(xiangqi)/xiangqi-preview.tsx': 'cc1a43c20ef21e3e434f9c9c0c306b08ea09f62bf897f010ee30a413c096c71d',
};
for (const [f, h] of Object.entries(protectedHashes)) check(`Protected baseline unchanged: ${f}`, sha(f) === h);

for (const f of ['src/components/chess/ChessSurfaceHost.tsx', 'src/services/chess/chessSurfaceStore.ts', 'src/app/_layout.tsx', 'src/app/(tabs)/_layout.tsx']) {
  const r = ts.transpileModule(read(f), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext }, reportDiagnostics: true, fileName: f });
  check(`${f} transpiles`, !(r.diagnostics || []).some((d) => d.category === ts.DiagnosticCategory.Error));
}

console.log(`\nPhase 17.9A7 Real Device Surface Ownership + FX Clip: ${pass}/${pass + fail} PASS`);
if (fail) process.exit(1);
