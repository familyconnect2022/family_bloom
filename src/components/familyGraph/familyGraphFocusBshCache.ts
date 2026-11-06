/**
 * Focus-only BSH compute caches.
 *
 * These Maps are deliberately separate from familyGraphBshCache. Focus may use
 * the same pure model/layout algorithms as the main tree, but it never reuses
 * the main tree's model/layout/scene cache entries.
 */
const MODEL_CACHE_LIMIT = 20;
const LAYOUT_CACHE_LIMIT = 20;
const SCENE_CACHE_LIMIT = 24;

const modelCache = new Map<string, unknown>();
const layoutCache = new Map<string, unknown>();
const sceneCache = new Map<string, unknown>();

const touch = <T>(cache: Map<string, T>, key: string): T | null => {
  const value = cache.get(key);
  if (value === undefined) return null;
  cache.delete(key);
  cache.set(key, value);
  return value;
};

const setBounded = <T>(cache: Map<string, T>, key: string, value: T, limit: number) => {
  cache.delete(key);
  cache.set(key, value);
  while (cache.size > limit) {
    const oldest = cache.keys().next();
    if (oldest.done) break;
    cache.delete(oldest.value);
  }
};

export const getFamilyGraphFocusBshModel = <T>(key: string): T | null => touch(modelCache, key) as T | null;
export const putFamilyGraphFocusBshModel = <T>(key: string, value: T) => setBounded(modelCache, key, value, MODEL_CACHE_LIMIT);

export const getFamilyGraphFocusBshLayout = <T>(key: string): T | null => touch(layoutCache, key) as T | null;
export const putFamilyGraphFocusBshLayout = <T>(key: string, value: T) => setBounded(layoutCache, key, value, LAYOUT_CACHE_LIMIT);

export const getFamilyGraphFocusBshScene = <T>(key: string): T | null => touch(sceneCache, key) as T | null;
export const putFamilyGraphFocusBshScene = <T>(key: string, value: T) => setBounded(sceneCache, key, value, SCENE_CACHE_LIMIT);

export const clearFamilyGraphFocusBshCaches = () => {
  modelCache.clear();
  layoutCache.clear();
  sceneCache.clear();
};
