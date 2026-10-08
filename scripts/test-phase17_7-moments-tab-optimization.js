const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
let pass = 0, fail = 0;
function check(label, ok, detail = '') {
  const index = String(pass + fail + 1).padStart(2, '0');
  if (ok) { pass++; console.log(`PASS ${index} - ${label}`); }
  else { fail++; console.log(`FAIL ${index} - ${label}${detail ? ` :: ${detail}` : ''}`); }
}

const phase17_9aChess = fs.existsSync(path.join(root, 'src/components/chess/ChessSurfaceHost.tsx')) && read('package.json').includes('phase17_9a:check');
const phase17_9a9Server = read('package.json').includes('phase17_9a9:check') && fs.existsSync(path.join(root, 'server/src/chess/rematchProposalStore.ts'));
const moments = read('src/app/(tabs)/moments.tsx');
const card = read('src/components/moments/MomentCard.tsx');
const personHook = read('src/hooks/family/useFamilyPersonsByIds.ts');
const graphService = read('src/services/familyGraph/familyGraphService.ts');
const limits = read('src/constants/dataLimits.ts');
const pkg = JSON.parse(read('package.json'));
const pre = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const post = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const cleanup = read('scripts/setup/cleanup-overlay-routes.js');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
const tabsLayout = read('src/app/(tabs)/_layout.tsx');

check('Moments tab still owns central tab runtime', moments.includes('useTabRuntime("moments")'));
check('Feed keeps bounded FlatList window', moments.includes('initialNumToRender={3}') && moments.includes('maxToRenderPerBatch={3}') && moments.includes('windowSize={5}'));
check('Android clipping remains enabled', moments.includes('removeClippedSubviews={Platform.OS === "android"}'));
check('Viewability uses an external per-card store instead of parent visible-id state', moments.includes('createMomentVisibilityStore') && moments.includes('useSyncExternalStore') && !moments.includes('setVisiblePostIds'));
check('Visible-card realtime remains gated by tab focus', moments.includes('realtimeEnabled={screenFocused && visible}'));
check('Continuous JS onScroll tracking removed from Moments feed', !moments.includes('scrollEventThrottle=') && !/\sonScroll=\{/.test(moments));
check('Offset tracking only runs when drag/momentum settles', moments.includes('onScrollEndDrag=') && moments.includes('onMomentumScrollEnd='));

check('Feed Person labels use bounded ID lookup hook', moments.includes('useFamilyPersonsByIds(activeFamilyId, linkedPersonIds)'));
check('Full Person directory is limited to compose/edit/deep-link work', /personDirectoryEnabled\s*=\s*!!activeFamilyId\s*&&\s*\(!!requestedPersonId\s*\|\|\s*modal\s*\|\|\s*!!editPost\)/.test(moments));
check('Moments focus no longer starts a full Person directory task', !moments.includes('InteractionManager.runAfterInteractions') && !moments.includes('personDirectoryFamilyId'));
check('Targeted Person hook is present', exists('src/hooks/family/useFamilyPersonsByIds.ts') && personHook.includes('getPersonsByIds'));
check('Targeted Person hook dedupes requested ids', personHook.includes('new Set(ids.map'));
check('Graph service dedupes concurrent single-Person reads', graphService.includes('personLookupInflight') && graphService.includes('getPersonDeduped'));
check('Large Person target sets fall back to one directory read', graphService.includes('uniqueIds.length > 80') && graphService.includes('listPersonsDeduped(familyId)'));

check('Comment bodies start collapsed even when a post has comments', card.includes('const [showComments, setShowComments] = useState(false)'));
check('No comment-count effect auto-expands cards', !/post\.commentCount[^\n]*setShowComments\(true\)/.test(card));
check('Comment realtime requires both explicit expansion and visible card', card.includes('if (!showComments || !realtimeEnabled) return;'));
check('Personal reaction hydration is deferred off the scroll hot path', card.includes('const hydrateTimer = setTimeout') && card.includes('}, 180);'));
check('Transient cards cancel deferred reaction hydration', card.includes('clearTimeout(hydrateTimer)'));
check('Closed post menu content is not retained', card.includes('{postMenuVisible && <Pressable'));
check('Closed reaction picker content is not retained', card.includes('{showReactionPicker && <Pressable'));
check('Closed reaction detail content is not retained', card.includes('{reactionDetailVisible && <Pressable'));
check('Closed inline edit body is not retained', card.includes('{editVisible && <BloomKeyboardScreen'));
check('Screen-level edit/moderation/composer flows unmount when closed', moments.includes('{editPost && <BloomFullScreenFlow') && moments.includes('{moderationVisible && <BloomFullScreenFlow') && moments.includes('{modal && <BloomFullScreenFlow'));

check('Moment feed remains bounded at 18 + 18 pages', /initialFeed:\s*18/.test(limits) && /pageSize:\s*18/.test(limits));
check('Comment and reaction pages remain bounded', /commentsPage:\s*12/.test(limits) && /reactionsPage:\s*30/.test(limits));
check('Phase 17.7 package gate is registered', pkg.scripts?.['phase17_7:check'] === 'node ./scripts/test-phase17_7-moments-tab-optimization.js');
check('Post-copy updater runs Phase 17.7 gate', post.includes('run phase17_7:check') || post.includes('test-phase17_7-moments-tab-optimization.js'));
check('Debug build runs Phase 17.7 gate', debugBat.includes('npm run phase17_7:check'));
check('Release build runs Phase 17.7 gate', releaseBat.includes('npm run phase17_7:check'));
check('Copy-over cleanup removes stale Phase 17.6 report', pre.includes('PHASE_17_6_BUILD_REPORT.md') && cleanup.includes('PHASE_17_6_BUILD_REPORT.md'));
check('Tab bar imports useEffect used by sliding indicator', /import React, \{[^}]*useEffect[^}]*\} from [\"']react[\"'];/.test(tabsLayout));
check('Tab bar still animates only the lightweight indicator', (tabsLayout.includes('indicatorX.value = withTiming') || tabsLayout.includes('indicatorIndex.value = withTiming')) && tabsLayout.includes('lazy: false'));

const changedTs = [
  'src/app/(tabs)/moments.tsx',
  'src/components/moments/MomentCard.tsx',
  'src/hooks/family/useFamilyPersonsByIds.ts',
  'src/services/familyGraph/familyGraphService.ts',
  'src/app/(tabs)/_layout.tsx',
];
let syntaxOk = true;
for (const file of changedTs) {
  const out = ts.transpileModule(read(file), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    reportDiagnostics: true,
    fileName: file,
  });
  if ((out.diagnostics || []).some((d) => d.category === ts.DiagnosticCategory.Error)) syntaxOk = false;
}
check('Phase 17.7 changed TypeScript/TSX transpiles cleanly', syntaxOk);

const protectedHashes = {
  'src/components/chess/ChessBoard.tsx': 'e8314cceb1ef310380598655c8381a0cc08a58a45a6a75112c19eac036ad5f59',
  'src/components/chess/v2/ChessPiece.tsx': '7c21b248c6eb86ced1b6fd95e83b9db53831c47c0620e75f25a62a9f372dd40e',
  'src/app/(chess)/chess-game/[gameId].tsx': 'ece20f30f945dc69fb2b818a2b15163e8b98ed3a8b515dacb44807d3e5bde1bd',
  'src/components/xiangqi/XiangqiGameBoard.tsx': 'a7182cc98c97b299d6a40ea83765230b163f0cc6c921f8792d618967f9e61f93',
  'src/app/(xiangqi)/xiangqi-preview.tsx': 'cc1a43c20ef21e3e434f9c9c0c306b08ea09f62bf897f010ee30a413c096c71d',
  'server/src/socket/socketServer.ts': 'dd60cbc1345d5e3f577b32f1265646ae51f24c3d6ba12ac6a4935da38a1efd07',
  'firestore.rules': 'a872b09e20259f22e04e8564d3f0c0722a895235bac2da71bf663c6c8b81222a',
  'firestore.indexes.json': 'b88b9fab1c5db94017e0d1744abf0d1ca98979ef86bdefa2e6831fc0e49d429f',
};
for (const [file, expected] of Object.entries(protectedHashes)) {
  check(`Protected game/backend baseline unchanged: ${file}`, (phase17_9aChess && ['src/components/chess/ChessBoard.tsx','src/components/chess/v2/ChessPiece.tsx','src/app/(chess)/chess-game/[gameId].tsx'].includes(file)) || (phase17_9a9Server && file === 'server/src/socket/socketServer.ts') || sha(file) === expected, phase17_9aChess ? '17.9A Chess architecture supersedes historical hash' : sha(file));
}

console.log(`\nPhase 17.7 Moments Tab Optimization gate: ${pass}/${pass + fail} PASS`);
if (fail) process.exit(1);
