const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const pkg = JSON.parse(read('package.json'));
assert(pkg.dependencies['@react-native-async-storage/async-storage'] === '2.2.0', 'A14 AsyncStorage dependency missing');

const rootLayout = read('src/app/_layout.tsx');
assert(rootLayout.includes('SplashScreen.preventAutoHideAsync()'), 'Native splash is not held for auth restore');
assert(rootLayout.includes('SplashScreen.hideAsync()'), 'Native splash is not released after navigation is ready');
assert(rootLayout.includes('nativeBootReady'), 'Native boot decision gate missing');
assert(rootLayout.includes('runtimeReady ? <BloomPushBridge /> : null'), 'PushBridge still starts before first Home paint');
assert(rootLayout.includes('backgroundWarmReady ? <ChessSurfaceHost /> : null'), 'Persistent Chess surface still starts on critical Home boot');
assert(rootLayout.includes('bootReady={backgroundWarmReady}'), 'Chess socket provider is not deferred');
assert(rootLayout.includes('liveReady={backgroundWarmReady}'), 'Family Firestore feeds are not deferred');
assert(rootLayout.includes('<DeferredFamilyPrewarm ready={backgroundWarmReady} />'), 'Graph idle prewarm missing');
assert(!rootLayout.includes('setTimeout(() => setSplash'), 'Fixed custom splash timer detected');

const auth = read('src/context/AuthContext.tsx');
assert(auth.includes('bootSessionCache.read(currentUser.uid)'), 'uid-scoped instant boot cache is not hydrated');
assert(auth.includes('familyService.watchForUser('), 'single membership realtime source missing');
assert(!auth.includes('familyService.listForUser('), 'Auth still fetches memberships before listening');
assert(auth.includes('resetSharedRealtimeRegistry()'), 'family/account realtime boundary reset missing');
assert(auth.includes('familyHomeWarmCache.clearUser(signingOutUid)'), 'logout does not clear uid-scoped Home warm cache');
assert(auth.includes('homeTimeCapsuleService.clearRealtimeCache()'), 'Time Capsule source cache not cleared at boundaries');

const bootCache = read('src/services/bootstrap/bootSessionCache.ts');
assert(bootCache.includes('family-bloom:boot-session:v1') && bootCache.includes('`${CACHE_PREFIX}:${uid}`'), 'boot cache key is not uid-scoped');
assert(bootCache.includes('AsyncStorage'), 'boot cache is not persisted locally');
const homeWarm = read('src/services/bootstrap/familyHomeWarmCache.ts');
assert(homeWarm.includes('family-bloom:home-warm:v1'), 'Home cache missing');
assert(homeWarm.includes('${PREFIX}:${uid}:${familyId}'), 'Home cache is not uid + family scoped');
assert(homeWarm.includes('Firestorm') === false, 'Unexpected typo marker');

const registry = read('src/services/realtime/sharedRealtimeRegistry.ts');
for (const symbol of ['subscribeSharedRealtime', 'getSharedRealtimeRegistrySnapshot', 'resetSharedRealtimeRegistry', 'physicalStarts']) {
  assert(registry.includes(symbol), `Shared realtime registry missing ${symbol}`);
}
assert(registry.includes('subscribers.size'), 'Shared realtime registry does not ref-count logical consumers');

const familyRealtime = read('src/context/FamilyRealtimeContext.tsx');
assert(familyRealtime.includes('liveReady = true'), 'FamilyRealtime boot gate missing');
for (const key of ['family.members:', 'family.moments.latest:', 'family.events.upcoming:', 'family.events.yearly:']) {
  assert(familyRealtime.includes(key), `Root shared query key missing: ${key}`);
}
assert(familyRealtime.includes('familyHomeWarmCache.read'), 'Root family feeds do not hydrate cache-first');
assert(familyRealtime.includes('familyHomeWarmCache.update'), 'Root family feeds do not refresh warm cache');

const graphHook = read('src/hooks/family/useFamilyGraph.ts');
assert(!graphHook.includes('getDefaultFocusPerson('), 'Graph still performs personLinks -> person read on normal entry');
assert(graphHook.includes('person.linkedUid === currentUid'), 'Graph does not derive current person from loaded persons');
assert(graphHook.includes('getFamilyGraphWarmRecord'), 'Graph warm snapshot is not consumed');
const graphService = read('src/services/familyGraph/familyGraphService.ts');
assert(graphService.includes('family.graph.snapshot:${familyId}'), 'Graph persons/relationships are not owned by one shared key');
assert(graphService.includes('latestPersons === null || latestRelationships === null'), 'Graph shared snapshot can emit incomplete pair');
const prewarm = read('src/components/system/DeferredFamilyPrewarm.tsx');
assert(prewarm.includes('30_000'), 'Graph handoff warm window missing');
assert(!prewarm.includes('FamilyGraphPrototype'), 'Graph prewarm mounts visual UI');
const graphCache = read('src/components/familyGraph/familyGraphWarmCache.ts');
for (const token of ['fingerprint', 'visual', 'viewMode', 'viewAnchorPersonId', 'camera']) assert(graphCache.includes(token), `Graph warm cache missing ${token}`);

const capsule = read('src/services/home/homeTimeCapsuleService.ts');
assert(capsule.includes('recipientRealtimeCache'), 'Time Capsule recipient source cache missing');
assert(capsule.includes('createdRealtimeCache'), 'Time Capsule created source cache missing');
assert(capsule.includes('if (cachedCreated && cachedReceived)'), 'Time Capsule visible list does not reuse live source cache');
assert(capsule.includes('if (cached)'), 'Time Capsule reminder list does not reuse recipient cache');

assert(!exists('src/services/homeHub/homeHubService.ts'), 'Legacy homeHubService still exists');
const serviceIndex = read('src/services/index.ts');
assert(!serviceIndex.includes('homeHub/homeHubService'), 'Legacy homeHubService is still exported');

const paths = read('src/services/firebase/firestorePaths.ts');
for (const helper of [
  'userMemberships', 'userHomeInbox', 'familyHomeKitchenPreferences', 'familyHomeGameSessions',
  'familyHomeMusicCycles', 'familyHomeMusicSongs', 'userHomeMusicFavorites', 'familyChessGames',
  'familyGraphProposals', 'familyGraphProposalState'
]) assert(paths.includes(`${helper}:`), `Central Firestore path missing ${helper}`);

const rawPathScanFiles = [
  'src/services/home/homeGameService.ts',
  'src/services/home/homeKitchenService.ts',
  'src/services/home/homeWhisperService.ts',
  'src/services/home/homePollService.ts',
  'src/services/home/music/homeMusicService.ts',
  'src/services/chess/chessHistoryService.ts',
  'src/services/familyGraph/graphProposalService.ts',
];
for (const file of rawPathScanFiles) {
  const text = read(file);
  assert(!/`(?:users|families)\/\$\{/.test(text), `Raw Firestore path still owned by ${file}`);
}

const dashboard = read('src/hooks/family/useFamilyDashboard.ts');
for (const loader of ['membersLoading', 'eventsLoading', 'momentsLoading']) assert(dashboard.includes(loader), `Home local loader missing ${loader}`);
const home = read('src/app/(tabs)/index.tsx');
assert(home.includes('HomeSectionSkeleton'), 'Home local skeleton missing');
assert(home.includes('eventsLoading ?'), 'Event section does not use local skeleton');
assert(home.includes('momentsLoading ?'), 'Moment section does not use local skeleton');
assert(home.includes('membersLoading ?'), 'Member section does not use local skeleton');

const devTools = read('src/app/(internal)/developer-tools.tsx');
assert(devTools.includes('getSharedRealtimeRegistrySnapshot'), 'Developer Tools cannot inspect Firebase listener registry');
assert(devTools.includes('Firebase listeners'), 'Firebase listener diagnostics section missing');

assert(exists('document/firebase/FIREBASE_DATA_SOURCE_CONTRACT_A14.md'), 'Firebase ownership contract document missing');
const contract = read('document/firebase/FIREBASE_DATA_SOURCE_CONTRACT_A14.md');
assert(contract.includes('Authoritative membership'), 'Firebase contract does not identify membership authority');
assert(contract.includes('one runtime query owner'), 'Firebase contract does not define duplicate-listener rule');

const cleanup = read('scripts/setup/cleanup-overlay-routes.js');
assert(cleanup.includes('src/services/homeHub/homeHubService.ts'), 'Copy-over cleanup does not delete legacy homeHubService from old projects');
const bat = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
assert(bat.includes('test-phase17_9a14-instant-home-firebase-cleanup.js'), 'A14 updater does not run A14 gate');
assert(bat.includes('@react-native-async-storage'), 'A14 updater does not bootstrap AsyncStorage');

console.log('PASS phase17_9a14 Instant Home + Firebase data source cleanup gates');
