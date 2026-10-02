import { VIETNAMESE_MUSIC_CATALOG_VERSION, type VietnameseMusicSeed } from "@/data/vietnameseMusicCatalogV2";
import {
  AUDIUS_AMBIGUOUS_SEED_IDS,
  AUDIUS_UNMATCHED_SEED_IDS,
  PREAUDITED_VIETNAMESE_TRACKS,
  VIETNAMESE_MUSIC_PROVIDER_AUDIT_VERSION,
} from "@/data/vietnameseMusicPlayableV2.generated";
import type { HomeMusicTrack } from "@/types/homeLiving";
import type { MusicProvider } from "./musicProvider";

const POSITIVE_TTL_MS = 24 * 60 * 60 * 1000;
const NEGATIVE_TTL_MS = 20 * 60 * 1000;
const MAX_PROVIDER_CONCURRENCY = 4;

type MatchCacheItem = { at: number; track: HomeMusicTrack | null };
const matchCache = new Map<string, MatchCacheItem>();
let activeProviderRequests = 0;
const providerWaiters: Array<() => void> = [];
const preAuditedBySeedId = new Map(
  PREAUDITED_VIETNAMESE_TRACKS
    .filter(track => track.curation?.seedId)
    .map(track => [track.curation!.seedId, track] as const),
);
const trustedAudit = VIETNAMESE_MUSIC_PROVIDER_AUDIT_VERSION === VIETNAMESE_MUSIC_CATALOG_VERSION;
const auditedUnavailable = new Set(trustedAudit ? AUDIUS_UNMATCHED_SEED_IDS : []);
const auditedAmbiguous = new Set(trustedAudit ? AUDIUS_AMBIGUOUS_SEED_IDS : []);


const waitForProviderSlot = async () => {
  if (activeProviderRequests < MAX_PROVIDER_CONCURRENCY) {
    activeProviderRequests += 1;
    return;
  }
  await new Promise<void>(resolve => providerWaiters.push(resolve));
  activeProviderRequests += 1;
};

const releaseProviderSlot = () => {
  activeProviderRequests = Math.max(0, activeProviderRequests - 1);
  providerWaiters.shift()?.();
};

const withProviderSlot = async <T,>(fn: () => Promise<T>): Promise<T> => {
  await waitForProviderSlot();
  try { return await fn(); }
  finally { releaseProviderSlot(); }
};

const stripMarks = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const normalize = (text: string) => stripMarks(text)
  .toLocaleLowerCase("vi-VN")
  .replace(/đ/g, "d")
  .replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, " ")
  .trim()
  .replace(/\s+/g, " ");

const NOISE_WORDS = new Set([
  "feat", "ft", "version", "ver", "official", "audio", "lyrics", "lyric", "mv", "music",
  "acoustic", "cover", "remix", "remastered", "karaoke", "instrumental", "intro", "ost",
]);

const tokenSet = (text: string) => new Set(normalize(text).split(" ").filter(token => token.length > 1 && !NOISE_WORDS.has(token)));
const overlap = (a: Set<string>, b: Set<string>) => {
  if (!a.size || !b.size) return 0;
  let hits = 0;
  for (const token of a) if (b.has(token)) hits += 1;
  return hits / Math.max(a.size, b.size);
};

const canonicalTitle = (text: string) => normalize(text)
  .replace(/\b(feat|ft|acoustic|cover|remix|version|ver|official|lyrics|lyric|mv|intro|ost)\b.*$/g, "")
  .trim();

const titleScore = (seed: VietnameseMusicSeed, track: HomeMusicTrack) => {
  const candidates = [seed.title, ...(seed.aliases ?? [])];
  const trackTitle = canonicalTitle(track.title);
  let best = 0;
  for (const title of candidates) {
    const wanted = canonicalTitle(title);
    if (!wanted || !trackTitle) continue;
    if (wanted === trackTitle) return 1;
    if (trackTitle.includes(wanted) || wanted.includes(trackTitle)) best = Math.max(best, 0.9);
    best = Math.max(best, overlap(tokenSet(wanted), tokenSet(trackTitle)));
  }
  return best;
};

const artistScore = (seed: VietnameseMusicSeed, track: HomeMusicTrack) => {
  const actual = tokenSet(track.artist);
  let best = 0;
  for (const artist of seed.artists) {
    const wanted = tokenSet(artist);
    best = Math.max(best, overlap(wanted, actual));
    const a = normalize(artist);
    const b = normalize(track.artist);
    if (a && b && (a === b || a.includes(b) || b.includes(a))) best = Math.max(best, 0.92);
  }
  return best;
};

const looksLikeAlternateVersion = (seed: VietnameseMusicSeed, track: HomeMusicTrack) => {
  const seedText = normalize([seed.title, ...(seed.aliases ?? [])].join(" "));
  const actual = normalize(track.title);
  const alternates = ["cover", "remix", "karaoke", "instrumental", "sped up", "slowed", "nightcore"];
  return alternates.some(word => actual.includes(word) && !seedText.includes(word));
};

const attachCuration = (seed: VietnameseMusicSeed, track: HomeMusicTrack): HomeMusicTrack => ({
  ...track,
  language: "vi",
  curation: {
    catalogVersion: VIETNAMESE_MUSIC_CATALOG_VERSION,
    seedId: seed.id,
    sourceKinds: Array.from(new Set(seed.signals.map(signal => signal.kind))),
  },
});

const pickBest = (seed: VietnameseMusicSeed, tracks: HomeMusicTrack[]) => {
  let best: { track: HomeMusicTrack; score: number } | null = null;
  for (const track of tracks) {
    if (looksLikeAlternateVersion(seed, track)) continue;
    const t = titleScore(seed, track);
    const a = artistScore(seed, track);
    // The language is guaranteed by the curated seed, never inferred from provider metadata.
    // Require a strong title match plus at least some artist evidence to avoid unrelated covers.
    if (t < 0.78 || a < 0.28) continue;
    const score = t * 0.72 + a * 0.28;
    if (!best || score > best.score) best = { track, score };
  }
  return best?.track ?? null;
};

const cacheKey = (provider: MusicProvider, seed: VietnameseMusicSeed) => `${provider.id}|${VIETNAMESE_MUSIC_CATALOG_VERSION}|${seed.id}`;

export const resolveVietnameseSeed = async (provider: MusicProvider, seed: VietnameseMusicSeed, signal?: AbortSignal): Promise<HomeMusicTrack | null> => {
  const preAudited = preAuditedBySeedId.get(seed.id);
  if (preAudited && preAudited.provider === provider.id) return preAudited;
  if (provider.id === "audius" && (auditedUnavailable.has(seed.id) || auditedAmbiguous.has(seed.id))) return null;

  const key = cacheKey(provider, seed);
  const cached = matchCache.get(key);
  if (cached) {
    const ttl = cached.track ? POSITIVE_TTL_MS : NEGATIVE_TTL_MS;
    if (Date.now() - cached.at < ttl) return cached.track;
  }

  const artistHint = seed.artists.slice(0, 2).join(" ");
  const queries = [`${seed.title} ${artistHint}`.trim(), seed.title, ...(seed.aliases ?? []).slice(0, 1)];
  let matched: HomeMusicTrack | null = null;
  for (const queryText of queries) {
    if (signal?.aborted) throw new Error("PLAYLIST_BUILD_TIMEOUT");
    const results = await withProviderSlot(() => provider.search(queryText, { limit: 8, sort: "relevant", signal }));
    matched = pickBest(seed, results);
    if (matched) break;
  }

  const curated = matched ? attachCuration(seed, matched) : null;
  matchCache.set(key, { at: Date.now(), track: curated });
  if (matchCache.size > 240) matchCache.delete(matchCache.keys().next().value ?? "");
  return curated;
};

export const isCuratedVietnameseTrack = (track: HomeMusicTrack) =>
  track.language === "vi" && track.curation?.catalogVersion === VIETNAMESE_MUSIC_CATALOG_VERSION;

export const clearVietnameseMatchCache = () => matchCache.clear();
