const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
let pass = 0, fail = 0;
function ok(label, cond, detail='') { if (cond) { console.log(`PASS ${String(++pass).padStart(2,'0')} - ${label}`); } else { fail++; console.log(`FAIL ${String(pass+fail).padStart(2,'0')} - ${label}${detail?` :: ${detail}`:''}`); } }

const tabs = read('src/app/(tabs)/_layout.tsx');
const runtime = read('src/context/TabRuntimeContext.tsx');
const home = read('src/app/(tabs)/index.tsx');
const phase17_9aChess = fs.existsSync(path.join(root, 'src/components/chess/ChessSurfaceHost.tsx')) && read('package.json').includes('phase17_9a:check');
const phase17_9a9Server = read('package.json').includes('phase17_9a9:check') && fs.existsSync(path.join(root, 'server/src/chess/rematchProposalStore.ts'));
const phase17_9a15BoardGames = read('package.json').includes('phase17_9a15:check') && fs.existsSync(path.join(root, 'src/games/shared/boardGameFramework.ts'));
const phase17_9a17 = read('package.json').includes('phase17_9a17:check');
const moments = read('src/app/(tabs)/moments.tsx');
const planner = read('src/app/(tabs)/planner.tsx');
const family = read('src/app/(tabs)/family.tsx');
const play = read('src/app/(tabs)/play.tsx');
const events = read('src/hooks/family/useFamilyEvents.ts');
const pending = read('src/hooks/family/usePendingFamilyReviews.ts');
const pkg = read('package.json');
const clean = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

ok('Tab bar imports useEffect used by the sliding indicator', /import React, \{[^}]*useEffect[^}]*\} from [\"']react[\"'];/.test(tabs));
ok('Navigator returns to warm eager tab surfaces', tabs.includes('lazy: false'));
ok('freezeOnBlur regression removed', !tabs.includes('freezeOnBlur: true'));
ok('detachInactiveScreens keeps native tab surfaces persistent', phase17_9a17 ? tabs.includes('detachInactiveScreens={false}') : !tabs.includes('detachInactiveScreens={true}'));
ok('Tab visual transition remains animation:none', tabs.includes('animation: BLOOM_MOTION.tabs.animation'));
ok('Runtime provider remains installed once', (tabs.match(/<TabRuntimeProvider>/g)||[]).length === 1);
ok('Eager startup gate waits for all five warm tab shells', read('src/context/TabStartupContext.tsx').includes('REQUIRED.every((task) => tasks[task])'));
ok('Lazy startup shortcut is absent', !read('src/context/TabStartupContext.tsx').includes('mountedTabReady'));
ok('Runtime still has ACTIVE/WARM/SUSPENDED/RESTORING states', ['"active"','"warm"','"suspended"','"restoring"'].every(v=>runtime.includes(v)));
ok('Warm grace remains bounded', runtime.includes('TAB_WARM_GRACE_MS = 420'));
ok('Live resource restart moves after tab visual settle', runtime.includes('TAB_RESTORE_DELAY_MS = 210'));

const regStart = runtime.indexOf('export function useTabRuntime(tabId: MainTabId)');
const regEnd = runtime.indexOf('/** Reactive runtime state', regStart);
const registration = runtime.slice(regStart, regEnd);
ok('Main tab registration no longer uses useSyncExternalStore', regStart >= 0 && !registration.includes('useSyncExternalStore'));
ok('Main tab registration only owns focus/blur', registration.includes('useFocusEffect') && registration.includes('store.focus(tabId)') && registration.includes('store.blur(tabId)'));
ok('Reactive snapshot hook remains opt-in', runtime.includes('export function useTabRuntimeSnapshot(tabId: MainTabId)') && runtime.includes('return useSyncExternalStore'));
ok('Live effects still stop from store notifications', runtime.includes('store.subscribe(tabId, sync)') && runtime.includes('stopCurrent()'));
ok('Stale async epochs remain guarded', runtime.includes('current.live && current.epoch === epoch'));
ok('Background still suspends all five tabs', runtime.includes('MAIN_TAB_IDS.forEach((tabId) =>') && runtime.includes('this.transition(tabId, "suspended"'));

for (const [name, src, id] of [['Home',home,'home'],['Moments',moments,'moments'],['Planner',planner,'planner'],['Family',family,'family'],['Play',play,'play']]) {
  ok(`${name} still registers lifecycle focus`, src.includes(`useTabRuntime("${id}")`));
}
ok('Home live badge work remains focus-scoped', home.includes('useTabLiveEffect("home"'));
ok('Moments moderation remains focus-scoped', moments.includes('useTabLiveEffect("moments"'));
ok('Planner moderation remains focus-scoped', planner.includes('useTabLiveEffect("planner"'));
ok('Planner month/list/past listeners remain runtime-scoped', (events.match(/useTabLiveEffect\(runtimeTabId/g)||[]).length === 3);
ok('Family pending-review listeners remain focus-scoped', pending.includes('useTabLiveEffect("family"'));
ok('Nhà Mình capsule listener/timer remain focus-scoped', (play.match(/useTabLiveEffect\("play"/g)||[]).length >= 2);

const frozen = {
  'src/components/chess/ChessBoard.tsx':'e8314cceb1ef310380598655c8381a0cc08a58a45a6a75112c19eac036ad5f59',
  'src/components/chess/v2/ChessPiece.tsx':'7c21b248c6eb86ced1b6fd95e83b9db53831c47c0620e75f25a62a9f372dd40e',
  'src/components/xiangqi/XiangqiGameBoard.tsx':'a7182cc98c97b299d6a40ea83765230b163f0cc6c921f8792d618967f9e61f93',
  'src/app/(chess)/chess-game/[gameId].tsx':'ece20f30f945dc69fb2b818a2b15163e8b98ed3a8b515dacb44807d3e5bde1bd',
  'src/app/(xiangqi)/xiangqi-preview.tsx':'cc1a43c20ef21e3e434f9c9c0c306b08ea09f62bf897f010ee30a413c096c71d',
  'server/src/socket/socketServer.ts':'dd60cbc1345d5e3f577b32f1265646ae51f24c3d6ba12ac6a4935da38a1efd07',
  'firestore.rules':'a872b09e20259f22e04e8564d3f0c0722a895235bac2da71bf663c6c8b81222a',
  'firestore.indexes.json':'b88b9fab1c5db94017e0d1744abf0d1ca98979ef86bdefa2e6831fc0e49d429f',
};
for (const [file, expected] of Object.entries(frozen)) ok(`16B.18 safety hash unchanged: ${file}`, (phase17_9aChess && ['src/components/chess/ChessBoard.tsx','src/components/chess/v2/ChessPiece.tsx','src/app/(chess)/chess-game/[gameId].tsx'].includes(file)) || (phase17_9a9Server && file === 'server/src/socket/socketServer.ts') || (phase17_9a15BoardGames && ['src/components/xiangqi/XiangqiGameBoard.tsx','src/app/(xiangqi)/xiangqi-preview.tsx'].includes(file)) || sha(file)===expected, phase17_9a15BoardGames ? '17.9A15 shared board-game runtime supersedes historical game hash' : phase17_9aChess ? '17.9A Chess architecture supersedes historical hash' : sha(file));

ok('Package exposes phase17.1 gate', /"phase17_1:check"\s*:\s*"node \.\/scripts\/test-phase17_1-tab-switch-hotfix\.js"/.test(pkg));
ok('Post-copy updater runs phase17.1 gate', /run phase17_1:check/.test(clean) || /test-phase17_1-tab-switch-hotfix\.js/.test(clean));
ok('Debug build runs phase17.1 gate', /npm run phase17_1:check/.test(debugBat));
ok('Release build runs phase17.1 gate', /npm run phase17_1:check/.test(releaseBat));

const syntaxFiles = ['src/context/TabRuntimeContext.tsx','src/app/(tabs)/_layout.tsx'];
let errors=[];
for (const file of syntaxFiles) {
 const out=ts.transpileModule(read(file),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true,fileName:file});
 for (const d of out.diagnostics||[]) if (d.category===ts.DiagnosticCategory.Error) errors.push(`${file}: ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`);
}
ok('17.1 changed TS/TSX transpiles cleanly', errors.length===0, errors.join(' | '));

console.log(`\nPhase 17.1 Tab-Switch Hotfix: ${pass}/${pass+fail} PASS`);
process.exit(fail?1:0);
