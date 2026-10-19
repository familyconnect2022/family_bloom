const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(process.argv[2] || process.cwd());
let pass = 0;
let fail = 0;
const lines = [];
const record = (name, ok, detail = '') => {
  (ok ? pass++ : fail++);
  lines.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const hasAll = (text, parts) => parts.every(part => text.includes(part));

const catalog = read('src/data/music/vietnameseMusicCatalogV1.ts');
const matcher = read('src/services/home/music/vietnameseMusicMatcher.ts');
const service = read('src/services/home/music/homeMusicService.ts');
const panel = read('src/features/home/music/HomeMusicPanel.tsx');
const types = read('src/types/homeLiving.ts');
const pkg = JSON.parse(read('package.json'));

const seedCount = (catalog.match(/\{ id: "/g) || []).length;
record('vietnamese-catalog-has-50-plus-seeds', seedCount >= 50, `${seedCount} seeds`);
record('catalog-language-is-explicit-not-inferred', hasAll(catalog, [
  'language: "vi"', 'must never infer language from accents', 'VIETNAMESE_MUSIC_CATALOG_VERSION',
]));
record('nct-primary-signals-present', hasAll(catalog, [
  'nct_top50_vi', 'nct_new_week', 'nct_acoustic_vi', 'nct_happy_vi', 'nct_top100_nhac_tre',
]));
record('zing-is-not-runtime-dependency', hasAll(catalog, [
  'Zing remains a secondary', 'not used as a runtime dependency',
]));
for (const bucket of ['calm', 'happy', 'chill', 'trending', 'recent']) {
  const count = (catalog.match(new RegExp(`\\"${bucket}\\"`, 'g')) || []).length;
  record(`catalog-bucket-${bucket}`, count >= 8, `${count} mentions`);
}
record('strict-provider-title-artist-match', hasAll(matcher, [
  'titleScore(seed, track)', 'artistScore(seed, track)', 't < 0.78 || a < 0.28', 'looksLikeAlternateVersion',
]));
record('alternate-covers-remixes-rejected', hasAll(matcher, [
  '"cover"', '"remix"', '"karaoke"', '"instrumental"', '"sped up"', '"slowed"',
]));
record('provider-concurrency-bounded', hasAll(matcher, [
  'MAX_PROVIDER_CONCURRENCY = 4', 'waitForProviderSlot', 'releaseProviderSlot',
]));
record('positive-negative-match-cache', hasAll(matcher, [
  'POSITIVE_TTL_MS', 'NEGATIVE_TTL_MS', 'matchCache',
]));
record('playlist-cycle-version-forces-vietnamese-regeneration', hasAll(service, [
  'CYCLE_VARIANT = "vi1"', '_${CYCLE_VARIANT}`',
]));
record('playlist-no-longer-uses-generic-relax-happy-search', !service.includes('provider.search("relax"') && !service.includes('provider.search("happy"') && !service.includes('provider.search("acoustic chill"'));
record('playlist-no-longer-uses-provider-global-trending-recent', !service.includes('provider.trending(36)') && !service.includes('provider.recent(36)'));
record('playlist-five-vietnamese-pools', hasAll(service, [
  'resolveVietnamesePool("calm"', 'resolveVietnamesePool("happy"', 'resolveVietnamesePool("chill"',
  'resolveVietnamesePool("trending"', 'resolveVietnamesePool("recent"',
]));
record('playlist-never-fills-with-unverified-provider-tracks', hasAll(service, [
  'Never fill with arbitrary provider results', 'tracks.filter(isCuratedVietnameseTrack)', 'Bloom sẽ không tự chèn nhạc khác ngôn ngữ',
]));
record('mix-preserved-25-20-15-20-20', service.includes('const MIX = { calm: 5, happy: 4, chill: 3, trending: 4, recent: 4 } as const;'));
record('track-type-has-language-and-curation', hasAll(types, ['language?: "vi" | null', 'catalogVersion: string', 'seedId: string', 'sourceKinds: string[]']));
record('ui-declares-vietnamese-auto-playlist', hasAll(panel, [
  '100% tiếng Việt', '20 bài tiếng Việt cho vài ngày tới', 'tất cả đều bằng tiếng Việt',
]));
record('search-remains-user-directed-global', hasAll(service, [
  'async search(text: string', 'provider.search(queryText',
]));
record('phase14k-script-registered', pkg.scripts?.['phase14k:check'] === 'node ./scripts/test-phase14k-vietnamese-music-signal-match.js');

const collect = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return collect(full);
  return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
});
const tsFiles = collect(path.join(root, 'src'));
let syntaxFails = 0;
for (const file of tsFiles) {
  const result = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
    reportDiagnostics: true,
    fileName: file,
  });
  if ((result.diagnostics || []).some(d => d.category === ts.DiagnosticCategory.Error)) syntaxFails++;
}
record('ts-tsx-syntax', syntaxFails === 0, `${tsFiles.length - syntaxFails}/${tsFiles.length}`);

console.log(`Phase14K Vietnamese Music Signal Match: ${pass} PASS / ${fail} FAIL`);
for (const line of lines) console.log(line);
if (fail) process.exit(1);
