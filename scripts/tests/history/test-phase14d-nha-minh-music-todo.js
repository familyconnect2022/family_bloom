const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(process.argv[2] || process.cwd());
let pass = 0;
let fail = 0;
const results = [];
const record = (name, ok, detail = '') => {
  (ok ? pass++ : fail++);
  results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const hasAll = (text, parts) => parts.every(p => text.includes(p));

const required = [
  'src/components/ui/BloomNoteCallout.tsx',
  'src/context/HomeMusicPlayerContext.tsx',
  'src/features/home/music/HomeMusicPanel.tsx',
  'src/services/home/music/musicProvider.ts',
  'src/services/home/music/audiusMusicProvider.ts',
  'src/services/home/music/homeMusicService.ts',
];
for (const rel of required) record(`required:${rel}`, exists(rel));

const musicPanel = read('src/features/home/music/HomeMusicPanel.tsx');
record('music-bloom-supper-hero', hasAll(musicPanel, ['NHẠC NHÀ MÌNH · BLOOM SUPPER', 'heroTitle', 'searchBox']));
record('music-three-tabs', hasAll(musicPanel, ['label: "Playlist"', 'label: "Yêu thích"', 'label: "Bài hát Nhà Mình"']));
record('music-search-actions', hasAll(musicPanel, ['Tìm tên bài hát hoặc nghệ sĩ', 'Yêu thích', 'Thêm vào Nhà Mình']));
record('music-search-debounce', musicPanel.includes('}, 360)'));
record('music-bounded-render', hasAll(musicPanel, ['const PAGE = 20', 'visibleCount', 'Xem thêm']) || hasAll(musicPanel, ['const PAGE = 20', 'safePage', 'nestedScrollEnabled', 'listShell']));
record('music-lightweight-control-context', hasAll(musicPanel, ['useHomeMusicPlayerControls', 'const { currentTrack, playTrack }']));

const musicService = read('src/services/home/music/homeMusicService.ts');
record('music-cycle-3-days', musicService.includes('const CYCLE_DAYS = 3'));
record('music-20-tracks', musicService.includes('const TRACK_COUNT = 20'));
record('music-mix-approved', musicService.includes('const MIX = { calm: 5, happy: 4, chill: 3, trending: 4, recent: 4 }'));
record('music-anti-repeat', hasAll(musicService, ['recentIds', 'offset <= 3', 'buildCatalogTracks']));
record('music-search-cache', hasAll(musicService, ['SEARCH_CACHE_TTL', 'searchCache', 'AbortSignal']));
record('music-frozen-family-cycle', hasAll(musicService, ['generateCycle(familyId, window)', 'homeMusicCycles', 'setDoc(ref, generated)']));

const audius = read('src/services/home/music/audiusMusicProvider.ts');
record('music-provider-abstraction', read('src/services/home/music/musicProvider.ts').includes('interface MusicProvider'));
record('audius-search-trending-recent-stream', hasAll(audius, ['/tracks/search', '/tracks/trending', 'sort_method: "recent"', '/stream']));
record('audius-skip-gated-tracks', hasAll(audius, ['is_stream_gated?: boolean', 'raw.is_stream_gated']));

const player = read('src/context/HomeMusicPlayerContext.tsx');
record('music-singleton-provider', hasAll(player, ['createVideoPlayer(null)', 'HomeMusicPlayerProvider', 'player.release()']));
record('music-background-playback', hasAll(player, ['staysActiveInBackground = true', 'showNowPlayingNotification = true']));
record('music-family-switch-clears-player', hasAll(player, ['familyRef.current === activeFamilyId', 'replaceAsync(null)']));
record('music-controls-split-from-progress', hasAll(player, ['HomeMusicPlayerControlsContext', 'useHomeMusicPlayerControls']));

const play = read('src/app/(tabs)/play.tsx');
record('music-paused-from-live-hub', !play.includes('<HomeMusicPanel />') && play.includes('Trò chơi Nhà Mình'));
record('music-no-separate-card-link', !play.includes('href="/home-music"'));
record('legacy-music-redirect', read('src/app/(home)/(music)/home-music.tsx').includes('<Redirect href="/(tabs)/play"'));

const kitchen = read('src/services/home/homeKitchenService.ts');
record('kitchen-shared-default-seed', hasAll(kitchen, ['shared-default', 'const userKey = custom ? uid : null']));
record('kitchen-personalize-only-on-filters', hasAll(kitchen, ['hasCustomFilters', 'const effectiveOffsets = custom ? swapOffsets : {}']));
record('kitchen-daily-rotation', hasAll(kitchen, ['localDayOrdinal(date)', 'localDayKey(date)']));
const kitchenPanel = read('src/features/home/kitchen/KitchenFeaturePanel.tsx');
record('kitchen-copy-shared-family', hasAll(kitchenPanel, ['Thực đơn chung của cả nhà', 'Chỉ cá nhân hoá khi bạn chọn']));
record('kitchen-swap-only-personalized', kitchenPanel.includes('onSwap={menu.personalized ?'));

const featureRoutes = {
  'src/features/home/whispers/WhisperFeaturePanel.tsx': 'src/app/(home)/(whispers)/home-whispers.tsx',
  'src/features/home/polls/PollFeaturePanel.tsx': 'src/app/(home)/(polls)/home-polls.tsx',
};
for (const [rel, routeRel] of Object.entries(featureRoutes)) {
  const source = read(rel);
  const route = read(routeRel);
  record(`${path.basename(rel)}-no-native-alert`, !source.includes('Alert.alert') && !/\bAlert\b/.test(source.split('\n').slice(0, 10).join('\n')));
  record(`${path.basename(rel)}-bloom-confirm`, source.includes('BloomConfirmModal'));
  record(`${path.basename(rel)}-keyboard-focus`, route.includes('BloomKeyboardScreen') && source.includes('BloomTextInput'));
  record(`${path.basename(rel)}-bloom-note`, source.includes('BloomNoteCallout'));
}

for (const rel of ['firestore.rules', 'firestore.cloud.rules']) {
  const rules = read(rel);
  record(`${rel}-music-rules`, hasAll(rules, ['match /homeMusicFavorites/{trackId}', 'match /homeMusicCycles/{cycleId}', 'match /homeMusicSongs/{trackId}']));
}

const app = JSON.parse(read('app.json'));
const plugins = app.expo?.plugins || [];
const videoPlugin = plugins.find(p => Array.isArray(p) && p[0] === 'expo-video');
record('app-video-background-plugin', !!videoPlugin && videoPlugin[1]?.supportsBackgroundPlayback === true);
record('android-keyboard-resize', app.expo?.android?.softwareKeyboardLayoutMode === 'resize');
record('ios-bundle-id', app.expo?.ios?.bundleIdentifier === 'com.family.ios');

const collect = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return collect(full);
  return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
});
const tsFiles = collect(path.join(root, 'src'));
let syntaxFails = 0;
for (const file of tsFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      allowJs: false,
    },
    reportDiagnostics: true,
    fileName: file,
  });
  if ((result.diagnostics || []).some(d => d.category === ts.DiagnosticCategory.Error)) syntaxFails++;
}
record('ts-tsx-syntax', syntaxFails === 0, `${tsFiles.length - syntaxFails}/${tsFiles.length}`);

console.log(`Phase14D Nhà Mình Music+TODO: ${pass} PASS / ${fail} FAIL`);
for (const line of results) console.log(line);
if (fail) process.exit(1);
