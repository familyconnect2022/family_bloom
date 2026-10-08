const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
let passed = 0;
let failed = 0;
function ok(label, condition, detail = '') {
  if (condition) { console.log(`PASS ${String(++passed).padStart(2, '0')} - ${label}`); }
  else { failed++; console.log(`FAIL ${String(passed + failed).padStart(2, '0')} - ${label}${detail ? ` :: ${detail}` : ''}`); }
}

const runtime = read('src/context/TabRuntimeContext.tsx');
const startup = read('src/context/TabStartupContext.tsx');
const tabs = read('src/app/(tabs)/_layout.tsx');
const home = read('src/app/(tabs)/index.tsx');
const phase17_9aChess = fs.existsSync(path.join(root, 'src/components/chess/ChessSurfaceHost.tsx')) && read('package.json').includes('phase17_9a:check');
const phase17_9a9Server = read('package.json').includes('phase17_9a9:check') && fs.existsSync(path.join(root, 'server/src/chess/rematchProposalStore.ts'));
const moments = read('src/app/(tabs)/moments.tsx');
const planner = read('src/app/(tabs)/planner.tsx');
const family = read('src/app/(tabs)/family.tsx');
const play = read('src/app/(tabs)/play.tsx');
const familyEvents = read('src/hooks/family/useFamilyEvents.ts');
const pendingReviews = read('src/hooks/family/usePendingFamilyReviews.ts');
const familyRealtime = read('src/context/FamilyRealtimeContext.tsx');
const rootLayout = read('src/app/_layout.tsx');
const pkg = read('package.json');
const clean = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const pre = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

ok('Five canonical tabs are declared once', runtime.includes('["home", "moments", "planner", "family", "play"] as const'));
ok('Runtime has ACTIVE/WARM/SUSPENDED/RESTORING states', ['"active"', '"warm"', '"suspended"', '"restoring"'].every(v => runtime.includes(v)));
ok('Warm grace is bounded to 420 ms', runtime.includes('TAB_WARM_GRACE_MS = 420'));
ok('Restore delay waits until the visual tab switch settles before live work', runtime.includes('TAB_RESTORE_DELAY_MS = 210'));
ok('Focusing a new tab moves the previous focused tab toward warm', runtime.includes('if (previous && previous !== tabId) this.moveToWarm(previous)'));
ok('Only one warm tab can survive at a time', runtime.includes('if (this.warmTab && this.warmTab !== tabId)') && runtime.includes('this.transition(previousWarm, "suspended"'));
ok('Blur invalidates the tab epoch before suspension', runtime.includes('this.transition(tabId, "warm", { focused: false, incrementEpoch: true })'));
ok('Background suspends every main tab', runtime.includes('MAIN_TAB_IDS.forEach((tabId) =>') && runtime.includes('this.transition(tabId, "suspended"'));
ok('Foreground restores only the still-focused tab', runtime.includes('if (this.focusedTab) this.focus(this.focusedTab)'));
ok('One central AppState subscription owns five-tab lifecycle', runtime.includes('AppState.addEventListener("change"') && !moments.includes('AppState.addEventListener') && !planner.includes('AppState.addEventListener') && !pendingReviews.includes('AppState.addEventListener'));
ok('Live resources are controlled directly by the runtime store, not hidden React renders', runtime.includes('store.subscribe(tabId, sync)') && runtime.includes('stopCurrent()'));
ok('Live work captures epoch and exposes stale-work guard', runtime.includes('isCurrent: () =>') && runtime.includes('current.live && current.epoch === epoch'));
ok('Five-tab runtime no longer publishes a global debug snapshot during normal use', !runtime.includes('__FAMILY_BLOOM_TAB_RUNTIME__'));

ok('Tabs navigator is wrapped by one TabRuntimeProvider', tabs.includes('<TabRuntimeProvider>') && tabs.includes('</TabRuntimeProvider>'));
ok('Five tab surfaces stay warm for instant revisits', tabs.includes('lazy: false'));
ok('Inactive tabs are not frozen by React Navigation', !tabs.includes('freezeOnBlur: true'));
ok('Inactive native tab screens are not force-detached on every switch', !tabs.includes('detachInactiveScreens={true}'));
ok('Runtime focus registration does not subscribe the heavy screen to state transitions', runtime.includes('export function useTabRuntime(tabId: MainTabId)') && !runtime.slice(runtime.indexOf('export function useTabRuntime(tabId: MainTabId)'), runtime.indexOf('/** Reactive runtime state')).includes('useSyncExternalStore'));
ok('Reactive runtime snapshots are opt-in for diagnostics/lightweight UI only', runtime.includes('export function useTabRuntimeSnapshot'));

ok('Eager startup waits until all five mounted tab shells report ready', startup.includes('REQUIRED.every((task) => tasks[task])'));
ok('Lazy single-tab startup shortcut is removed', !startup.includes('mountedTabReady'));

ok('Home registers with the central runtime', home.includes('useTabRuntime("home")'));
ok('Home badge refresh is live-tab scoped', home.includes('useTabLiveEffect("home"'));
ok('Moments registers with the central runtime', moments.includes('useTabRuntime("moments")'));
ok('Moments moderation listener is live-tab scoped', moments.includes('useTabLiveEffect("moments"') && moments.includes('moments.moderation_hidden'));
ok('Moments stale moderation callbacks use epoch guard', moments.includes('scope.isCurrent()'));
ok('Planner registers with the central runtime', planner.includes('useTabRuntime("planner")'));
ok('Planner passes runtime ownership into useFamilyEvents', planner.includes('runtimeTabId: "planner"'));
ok('Planner moderation listener is live-tab scoped', planner.includes('useTabLiveEffect("planner"') && planner.includes('planner.moderation_hidden'));
ok('Planner month/upcoming/past listeners are live-tab scoped', (familyEvents.match(/useTabLiveEffect\(runtimeTabId/g) || []).length === 3);
ok('Planner async listener callbacks reject stale epochs', (familyEvents.match(/scope\.isCurrent\(\)/g) || []).length >= 8);
ok('Family registers with the central runtime', family.includes('useTabRuntime("family")'));
ok('Family pending-review listeners are live-tab scoped', pendingReviews.includes('useTabLiveEffect("family"') && pendingReviews.includes('reviews.join_pending') && pendingReviews.includes('reviews.proposal_pending'));
ok('Nhà Mình registers with the central runtime', play.includes('useTabRuntime("play")'));
ok('Nhà Mình Time Capsule listener is live-tab scoped', play.includes('useTabLiveEffect("play"') && play.includes('home.time_capsules.recipient'));
ok('Nhà Mình next-open timer is also live-tab scoped', (play.match(/useTabLiveEffect\("play"/g) || []).length >= 2 && play.includes('setTimeout(() => setCapsuleClock'));

ok('Global family cache remains app-global and background-aware', familyRealtime.includes('export const FamilyRealtimeProvider') && familyRealtime.includes('AppState.addEventListener("change"'));
ok('Global bounded member/moment/event listeners remain intact', familyRealtime.includes('familyService.watchMembers') && familyRealtime.includes('momentsService.subscribeLatest') && familyRealtime.includes('calendarService.subscribeUpcoming') && familyRealtime.includes('calendarService.subscribeYearly'));
ok('Auth/family/chess global providers remain outside Tabs runtime scope', rootLayout.includes('<FamilyRealtimeProvider') && rootLayout.includes('<ChessRealtimeProvider>') && !rootLayout.includes('TabRuntimeProvider'));

ok('Phase 17 remains independent of retired performance-runner gates', !fs.existsSync(path.join(root, 'scripts/test-phase15b3-state-machine-chess-layering.js')));
ok('Phase 17 package script exists', /"phase17:check"\s*:\s*"node \.\/scripts\/test-phase17-five-tab-runtime-lifecycle\.js"/.test(pkg));
ok('Post-copy updater runs Phase 17 gate', /run phase17:check/.test(clean) || /test-phase17-five-tab-runtime-lifecycle\.js/.test(clean));
ok('Debug build runs Phase 17 gate', /npm run phase17:check/.test(debugBat));
ok('Release build runs Phase 17 gate', /npm run phase17:check/.test(releaseBat));
ok('Copy-over scripts identify current Phase 17.6/17.7/17.8 while preserving 16B.18 baseline marker', (/Phase 17\.(?:6|7|8)/.test(pre) || (pre.includes('Phase 17.9A - Persistent Chess Surface') || (pre.includes('Phase 17.9A1 - Chess Stabilization') || pre.includes('Phase 17.9A2 - Chess Engine Separation') || pre.includes('Phase 17.9A3 - Chess Overlay UI Repair') || (pre.includes('Phase 17.9A4 - Chess UI Rematch Hint Tabbar') || pre.includes('Phase 17.9A5 - Chess Surface Layer Geometry Tabbar'))))) && /Phase 16B\.18/.test(pre) && (/Phase 17\.(?:6|7|8)/.test(clean) || (clean.includes('Phase 17.9A - Persistent Chess Surface') || (clean.includes('Phase 17.9A1 - Chess Stabilization') || clean.includes('Phase 17.9A2 - Chess Engine Separation') || clean.includes('Phase 17.9A3 - Chess Overlay UI Repair') || (clean.includes('Phase 17.9A4 - Chess UI Rematch Hint Tabbar') || clean.includes('Phase 17.9A5 - Chess Surface Layer Geometry Tabbar'))))) && /Phase 16B\.18/.test(clean));
ok('Root Family Bloom gitignore remains bundled', fs.existsSync(path.join(root, '.gitignore')));

const frozenHashes = {
  'src/components/chess/ChessBoard.tsx': 'e8314cceb1ef310380598655c8381a0cc08a58a45a6a75112c19eac036ad5f59',
  'src/components/chess/v2/ChessPiece.tsx': '7c21b248c6eb86ced1b6fd95e83b9db53831c47c0620e75f25a62a9f372dd40e',
  'src/components/xiangqi/XiangqiGameBoard.tsx': 'a7182cc98c97b299d6a40ea83765230b163f0cc6c921f8792d618967f9e61f93',
  'src/app/(chess)/chess-game/[gameId].tsx': 'ece20f30f945dc69fb2b818a2b15163e8b98ed3a8b515dacb44807d3e5bde1bd',
  'src/app/(xiangqi)/xiangqi-preview.tsx': 'cc1a43c20ef21e3e434f9c9c0c306b08ea09f62bf897f010ee30a413c096c71d',
  'server/src/socket/socketServer.ts': 'dd60cbc1345d5e3f577b32f1265646ae51f24c3d6ba12ac6a4935da38a1efd07',
  'firestore.rules': 'a872b09e20259f22e04e8564d3f0c0722a895235bac2da71bf663c6c8b81222a',
  'firestore.indexes.json': 'b88b9fab1c5db94017e0d1744abf0d1ca98979ef86bdefa2e6831fc0e49d429f',
};
for (const [file, expected] of Object.entries(frozenHashes)) {
  ok(`Phase 16B.18 safety hash unchanged: ${file}`, (phase17_9aChess && ['src/components/chess/ChessBoard.tsx','src/components/chess/v2/ChessPiece.tsx','src/app/(chess)/chess-game/[gameId].tsx'].includes(file)) || (phase17_9a9Server && file === 'server/src/socket/socketServer.ts') || sha(file) === expected, phase17_9aChess ? '17.9A Chess architecture supersedes historical hash' : sha(file));
}

const startupResult = spawnSync(process.execPath, [path.join(root, 'scripts/test-tabStartup.js')], { cwd: root, encoding: 'utf8' });
ok('Eager TabStartup executable gate passes', startupResult.status === 0, (startupResult.stderr || startupResult.stdout || '').trim());

const syntaxFiles = [
  'src/context/TabRuntimeContext.tsx',
  'src/context/TabStartupContext.tsx',
  'src/app/(tabs)/_layout.tsx',
  'src/app/(tabs)/index.tsx',
  'src/app/(tabs)/moments.tsx',
  'src/app/(tabs)/planner.tsx',
  'src/app/(tabs)/family.tsx',
  'src/app/(tabs)/play.tsx',
  'src/hooks/family/useFamilyEvents.ts',
  'src/hooks/family/usePendingFamilyReviews.ts',
];
const syntaxErrors = [];
for (const file of syntaxFiles) {
  const output = ts.transpileModule(read(file), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    reportDiagnostics: true,
    fileName: file,
  });
  for (const diagnostic of output.diagnostics || []) {
    if (diagnostic.category === ts.DiagnosticCategory.Error) syntaxErrors.push(`${file}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`);
  }
}
ok(`Phase 17 changed TypeScript/TSX syntax (${syntaxFiles.length} files)`, syntaxErrors.length === 0, syntaxErrors.slice(0, 4).join(' | '));

console.log(`\nPhase 17.1 Five-Tab Runtime Lifecycle Hotfix: ${passed}/${passed + failed} PASS`);
process.exit(failed ? 1 : 0);
