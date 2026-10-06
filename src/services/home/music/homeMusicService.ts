import {
  collection,
  deleteDoc,
  doc,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "@react-native-firebase/firestore";
import type { HomeMusicCycle, HomeMusicFamilySong, HomeMusicFavorite, HomeMusicTrack } from "@/types/homeLiving";
import { audiusMusicProvider } from "./audiusMusicProvider";
import {
  VIETNAMESE_MUSIC_CATALOG_VERSION,
  VIETNAMESE_MUSIC_VERIFIED_COUNT,
  VIETNAMESE_MUSIC_REVIEW_COUNT,
  VIETNAMESE_MUSIC_SEEDS_V2,
  vietnameseSeedsForBucket,
  type VietnameseMusicBucket,
  type VietnameseMusicSeed,
} from "@/data/music/vietnameseMusicCatalogV2";
import { resolveVietnameseSeed } from "./vietnameseMusicMatcher";
import type { MusicProvider } from "./musicProvider";

const CYCLE_DAYS = 3;
const TRACK_COUNT = 20;
// Phase 14K CYCLE_VARIANT = "vi1"; Phase 14L bumps the cycle to vi2 after catalog/audit semantics changed.
const CYCLE_VARIANT = "vi3-catalog-first";
const DAY_MS = 86_400_000;
const CYCLE_MS = CYCLE_DAYS * DAY_MS;
const EPOCH = Date.UTC(2026, 0, 1);
const MIX = { calm: 5, happy: 4, chill: 3, trending: 4, recent: 4 } as const;
const SEARCH_CACHE_TTL = 10 * 60 * 1000;
const searchCache = new Map<string, { at: number; tracks: HomeMusicTrack[] }>();

const provider: MusicProvider = audiusMusicProvider;
const nowIso = () => new Date().toISOString();
const cycleCollection = (familyId: string) => `families/${familyId}/homeMusicCycles`;
const familySongsCollection = (familyId: string) => `families/${familyId}/homeMusicSongs`;
const favoriteCollection = (uid: string) => `users/${uid}/homeMusicFavorites`;

const hash = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};

const cycleWindow = (date = new Date()) => {
  const bucket = Math.max(0, Math.floor((date.getTime() - EPOCH) / CYCLE_MS));
  const startMs = EPOCH + bucket * CYCLE_MS;
  const endMs = startMs + CYCLE_MS - 1;
  const start = new Date(startMs);
  const id = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}-${String(start.getUTCDate()).padStart(2, "0")}_${CYCLE_DAYS}d_${CYCLE_VARIANT}`;
  return { id, startsAt: new Date(startMs).toISOString(), endsAt: new Date(endMs).toISOString() };
};

const seededShuffle = <T,>(items: T[], seedText: string): T[] => {
  const next = [...items];
  let seed = hash(seedText) || 1;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0xffffffff; };
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const uniqueTracks = (tracks: HomeMusicTrack[]) => {
  const seen = new Set<string>();
  return tracks.filter(track => !seen.has(track.id) && !!seen.add(track.id));
};

const selectFromPool = (
  pool: HomeMusicTrack[],
  count: number,
  blocked: Set<string>,
  artistCounts: Map<string, number>,
  seed: string,
) => {
  const shuffled = seededShuffle(uniqueTracks(pool), seed);
  const chosen: HomeMusicTrack[] = [];
  for (const track of shuffled) {
    const artistKey = track.artist.trim().toLocaleLowerCase();
    if (blocked.has(track.id) || (artistCounts.get(artistKey) ?? 0) >= 2) continue;
    chosen.push(track);
    blocked.add(track.id);
    artistCounts.set(artistKey, (artistCounts.get(artistKey) ?? 0) + 1);
    if (chosen.length >= count) break;
  }
  return chosen;
};

const catalogTrackFromSeed = (seed: VietnameseMusicSeed): HomeMusicTrack => ({
  id: `catalog:${seed.id}`,
  provider: "audius",
  providerTrackId: "",
  title: seed.title,
  artist: seed.artists.join(", "),
  artworkUrl: null,
  durationSec: 0,
  genre: null,
  mood: null,
  releaseDate: null,
  language: "vi",
  curation: {
    catalogVersion: VIETNAMESE_MUSIC_CATALOG_VERSION,
    seedId: seed.id,
    sourceKinds: Array.from(new Set(seed.signals.map(signal => signal.kind))),
  },
});

const catalogPool = (bucket: VietnameseMusicBucket) => vietnameseSeedsForBucket(bucket).map(catalogTrackFromSeed);

const buildCatalogTracks = (familyId: string, cycleId: string, recentIds: Set<string>) => {
  const blocked = new Set(recentIds);
  const artistCounts = new Map<string, number>();
  const groups = [
    selectFromPool(catalogPool("calm"), MIX.calm, blocked, artistCounts, `${familyId}|${cycleId}|calm-pick`),
    selectFromPool(catalogPool("happy"), MIX.happy, blocked, artistCounts, `${familyId}|${cycleId}|happy-pick`),
    selectFromPool(catalogPool("chill"), MIX.chill, blocked, artistCounts, `${familyId}|${cycleId}|chill-pick`),
    selectFromPool(catalogPool("trending"), MIX.trending, blocked, artistCounts, `${familyId}|${cycleId}|trending-pick`),
    selectFromPool(catalogPool("recent"), MIX.recent, blocked, artistCounts, `${familyId}|${cycleId}|recent-pick`),
  ];
  const tracks = seededShuffle(uniqueTracks(groups.flat()), `${familyId}|${cycleId}|final`);

  if (tracks.length < TRACK_COUNT) {
    const fallback = seededShuffle(VIETNAMESE_MUSIC_SEEDS_V2.map(catalogTrackFromSeed), `${familyId}|${cycleId}|fallback`);
    for (const candidate of fallback) {
      if (tracks.some(track => track.id === candidate.id)) continue;
      const artistKey = candidate.artist.trim().toLocaleLowerCase();
      if ((artistCounts.get(artistKey) ?? 0) >= 2) continue;
      if (recentIds.has(candidate.id) && tracks.length < TRACK_COUNT - 2) continue;
      tracks.push(candidate);
      artistCounts.set(artistKey, (artistCounts.get(artistKey) ?? 0) + 1);
      if (tracks.length >= TRACK_COUNT) break;
    }
  }

  // The catalog contains verified Vietnamese-language metadata. Playback-provider
  // matching is deliberately NOT part of playlist construction anymore.
  return tracks.slice(0, TRACK_COUNT);
};

const generateCycle = (familyId: string, window: ReturnType<typeof cycleWindow>): HomeMusicCycle => {
  // Anti-repeat is deterministic and local: derive the previous three cycle
  // selections from the same catalog, so opening the screen never waits on
  // Firestore history or a playback provider.
  const recentIds = new Set<string>();
  const startMs = new Date(window.startsAt).getTime();
  for (let offset = 1; offset <= 3; offset += 1) {
    const previous = cycleWindow(new Date(startMs - CYCLE_MS * offset));
    for (const track of buildCatalogTracks(familyId, previous.id, new Set())) recentIds.add(track.id);
  }

  let tracks = buildCatalogTracks(familyId, window.id, recentIds);
  if (tracks.length < TRACK_COUNT) {
    // Safety fallback: keep the list complete even when anti-repeat is unusually
    // restrictive. It still draws only from Bloom's verified Vietnamese catalog.
    tracks = buildCatalogTracks(familyId, `${window.id}|relaxed`, new Set());
  }

  return {
    id: window.id,
    familyId,
    provider: provider.id,
    startsAt: window.startsAt,
    endsAt: window.endsAt,
    createdAt: nowIso(),
    tracks: tracks.slice(0, TRACK_COUNT),
    mix: MIX,
  };
};

const seedById = new Map(VIETNAMESE_MUSIC_SEEDS_V2.map(seed => [seed.id, seed] as const));
const trackStorageId = (track: HomeMusicTrack) => track.providerTrackId || track.curation?.seedId || track.id.replace(/[^a-zA-Z0-9_-]/g, "_");
const PLAYBACK_RESOLVE_TIMEOUT_MS = 7_000;

export const homeMusicService = {
  cycleDays: CYCLE_DAYS,
  trackCount: TRACK_COUNT,
  mix: MIX,
  provider,
  catalogVersion: VIETNAMESE_MUSIC_CATALOG_VERSION,
  verifiedCatalogCount: VIETNAMESE_MUSIC_VERIFIED_COUNT,
  reviewQueueCount: VIETNAMESE_MUSIC_REVIEW_COUNT,

  cycleWindow,

  async getOrCreateCurrentCycle(familyId: string): Promise<HomeMusicCycle> {
    const window = cycleWindow();
    const generated = generateCycle(familyId, window);

    // Phase 14N: playlist metadata is local/deterministic and returns immediately.
    // Firestore persistence is best-effort only; it never gates the visible list.
    const ref = doc(getFirestore(), `${cycleCollection(familyId)}/${window.id}`);
    void setDoc(ref, generated).catch(() => {});
    return generated;
  },

  async resolveForPlayback(track: HomeMusicTrack): Promise<HomeMusicTrack> {
    if (track.providerTrackId) return track;
    const seedId = track.curation?.seedId;
    const seed = seedId ? seedById.get(seedId) : null;
    if (!seed) throw new Error("TRACK_NOT_AVAILABLE");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PLAYBACK_RESOLVE_TIMEOUT_MS);
    try {
      const resolved = await resolveVietnameseSeed(provider, seed, controller.signal);
      if (!resolved) throw new Error("TRACK_NOT_AVAILABLE");
      // Keep the catalog identity/title stable in favorites, queue and active-row UI.
      return {
        ...resolved,
        id: track.id,
        title: track.title,
        artist: track.artist,
        curation: track.curation,
      };
    } catch {
      throw new Error("TRACK_NOT_AVAILABLE");
    } finally {
      clearTimeout(timeout);
    }
  },

  watchFavorites(uid: string, onChange: (items: HomeMusicFavorite[]) => void, onError?: (error: unknown) => void) {
    const q = query(collection(getFirestore(), favoriteCollection(uid)), orderBy("createdAt", "desc"), limit(200));
    return onSnapshot(q, snap => onChange(snap.docs.map(d => d.data() as HomeMusicFavorite)), onError);
  },

  async toggleFavorite(uid: string, track: HomeMusicTrack, shouldFavorite: boolean) {
    const ref = doc(getFirestore(), `${favoriteCollection(uid)}/${trackStorageId(track)}`);
    if (!shouldFavorite) { await deleteDoc(ref); return; }
    const favorite: HomeMusicFavorite = { ...track, uid, createdAt: nowIso() };
    await setDoc(ref, favorite);
  },

  watchFamilySongs(familyId: string, onChange: (items: HomeMusicFamilySong[]) => void, onError?: (error: unknown) => void) {
    const q = query(collection(getFirestore(), familySongsCollection(familyId)), orderBy("sharedAt", "desc"), limit(200));
    return onSnapshot(q, snap => onChange(snap.docs.map(d => d.data() as HomeMusicFamilySong)), onError);
  },

  async addToFamily(familyId: string, uid: string, displayName: string, track: HomeMusicTrack) {
    const item: HomeMusicFamilySong = {
      ...track,
      familyId,
      sharedByUid: uid,
      sharedByName: displayName.trim().slice(0, 80) || "Người thân",
      sharedAt: nowIso(),
    };
    await setDoc(doc(getFirestore(), `${familySongsCollection(familyId)}/${trackStorageId(track)}`), item);
  },

  async removeFromFamily(familyId: string, track: HomeMusicTrack) {
    await deleteDoc(doc(getFirestore(), `${familySongsCollection(familyId)}/${trackStorageId(track)}`));
  },

  async search(text: string, options: { limit?: number; offset?: number; signal?: AbortSignal } = {}) {
    const queryText = text.trim();
    if (!queryText) return [];
    const limitCount = Math.max(1, Math.min(options.limit ?? 20, 40));
    const offset = Math.max(0, options.offset ?? 0);
    const key = `${queryText.toLocaleLowerCase()}|${limitCount}|${offset}`;
    const cached = searchCache.get(key);
    if (cached && Date.now() - cached.at < SEARCH_CACHE_TTL) return cached.tracks;
    const tracks = await provider.search(queryText, { limit: limitCount, offset, signal: options.signal });
    searchCache.set(key, { at: Date.now(), tracks });
    if (searchCache.size > 30) searchCache.delete(searchCache.keys().next().value ?? "");
    return tracks;
  },
};
