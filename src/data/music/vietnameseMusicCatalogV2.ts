import {
  VIETNAMESE_MUSIC_SEEDS,
  type VietnameseMusicBucket,
  type VietnameseMusicSeed,
  type VietnameseMusicSignal,
} from "./vietnameseMusicCatalogV1";
import { VERIFIED_VIETNAMESE_MUSIC_ADDITIONS, VIETNAMESE_MUSIC_REVIEW_QUEUE } from "./vietnameseMusicCatalogAdditions.generated";
import { VIETNAMESE_MUSIC_DYNAMIC_SIGNALS } from "./vietnameseMusicSourceSignals.generated";

export type { VietnameseMusicBucket, VietnameseMusicSeed, VietnameseMusicSignal } from "./vietnameseMusicCatalogV1";
export { VIETNAMESE_MUSIC_REVIEW_QUEUE } from "./vietnameseMusicCatalogAdditions.generated";

export const VIETNAMESE_MUSIC_CATALOG_VERSION = "vi2-dynamic-2026-09-30" as const;

const mergeSignals = (base: VietnameseMusicSignal[], dynamic: VietnameseMusicSignal[] = []) => {
  const byKey = new Map<string, VietnameseMusicSignal>();
  for (const signal of [...base, ...dynamic]) {
    const key = `${signal.kind}`;
    const current = byKey.get(key);
    if (!current || (signal.rank ?? Number.MAX_SAFE_INTEGER) < (current.rank ?? Number.MAX_SAFE_INTEGER)) byKey.set(key, signal);
  }
  return [...byKey.values()];
};

const allSeeds = [...VIETNAMESE_MUSIC_SEEDS, ...VERIFIED_VIETNAMESE_MUSIC_ADDITIONS];
const unique = new Map<string, VietnameseMusicSeed>();
for (const seed of allSeeds) {
  const previous = unique.get(seed.id);
  const merged: VietnameseMusicSeed = previous
    ? {
        ...previous,
        ...seed,
        artists: Array.from(new Set([...previous.artists, ...seed.artists])),
        buckets: Array.from(new Set([...previous.buckets, ...seed.buckets])) as VietnameseMusicBucket[],
        aliases: Array.from(new Set([...(previous.aliases ?? []), ...(seed.aliases ?? [])])),
        signals: mergeSignals(previous.signals, seed.signals),
      }
    : { ...seed };
  merged.signals = mergeSignals(merged.signals, VIETNAMESE_MUSIC_DYNAMIC_SIGNALS[seed.id]);
  unique.set(seed.id, merged);
}

export const VIETNAMESE_MUSIC_SEEDS_V2: VietnameseMusicSeed[] = [...unique.values()];
export const VIETNAMESE_MUSIC_VERIFIED_COUNT = VIETNAMESE_MUSIC_SEEDS_V2.length;
export const VIETNAMESE_MUSIC_REVIEW_COUNT = VIETNAMESE_MUSIC_REVIEW_QUEUE.length;

export const vietnameseSeedsForBucket = (bucket: VietnameseMusicBucket) => {
  const seeds = VIETNAMESE_MUSIC_SEEDS_V2.filter(seed => seed.buckets.includes(bucket));
  // Current rank is only a gentle priority signal. Selection still shuffles deterministically per family/cycle.
  return [...seeds].sort((a, b) => {
    const rankA = Math.min(...a.signals.map(signal => signal.rank ?? 9999));
    const rankB = Math.min(...b.signals.map(signal => signal.rank ?? 9999));
    return rankA - rankB;
  });
};
