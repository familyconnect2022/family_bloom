import type { MomentPost } from "../../types/moments";

type CachedMoment = {
  post?: MomentPost;
  promise?: Promise<MomentPost | null>;
  expiresAt: number;
};

const cache = new Map<string, CachedMoment>();
const TTL_MS = 60_000;
const keyFor = (familyId: string, momentId: string) => `${familyId}:${momentId}`;

const readValid = (familyId: string, momentId: string) => {
  const key = keyFor(familyId, momentId);
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry;
};

export const momentDeepLinkCache = {
  put(familyId: string, post: MomentPost) {
    cache.set(keyFor(familyId, post.id), { post, expiresAt: Date.now() + TTL_MS });
  },

  get(familyId: string, momentId: string): MomentPost | null {
    return readValid(familyId, momentId)?.post ?? null;
  },

  getPending(familyId: string, momentId: string): Promise<MomentPost | null> | null {
    return readValid(familyId, momentId)?.promise ?? null;
  },

  prefetch(
    familyId: string,
    momentId: string,
    loader: () => Promise<MomentPost | null>,
  ): Promise<MomentPost | null> {
    const existing = readValid(familyId, momentId);
    if (existing?.post) return Promise.resolve(existing.post);
    if (existing?.promise) return existing.promise;

    const key = keyFor(familyId, momentId);
    const promise = loader()
      .then((post) => {
        if (post) {
          cache.set(key, { post, expiresAt: Date.now() + TTL_MS });
        } else {
          cache.delete(key);
        }
        return post;
      })
      .catch((error) => {
        cache.delete(key);
        throw error;
      });

    cache.set(key, { promise, expiresAt: Date.now() + TTL_MS });
    return promise;
  },

  clear(familyId: string, momentId: string) {
    cache.delete(keyFor(familyId, momentId));
  },
};
