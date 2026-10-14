import type { FamilyGraphCameraSnapshot } from "./familyGraphViewport";

/**
 * Bloom Scene Hydration (BSH)
 *
 * Each stage owns a bounded in-memory cache. A cache entry is only an
 * acceleration: callers always include explicit revision/version data in the
 * key, so stale entries can never change graph correctness.
 */
const MODEL_CACHE_LIMIT = 20;
const LAYOUT_CACHE_LIMIT = 20;
const GEOMETRY_CACHE_LIMIT = 20;
const SCENE_CACHE_LIMIT = 24;
const RUNTIME_CACHE_LIMIT = 24;

export type FamilyGraphRuntimeState = {
  /** Camera is restorable only when it came from explicit user interaction. */
  camera: FamilyGraphCameraSnapshot | null;
  userCameraValid: boolean;
  retainedPersonIds: Set<string>;
};

const modelCache = new Map<string, unknown>();
const layoutCache = new Map<string, unknown>();
const geometryCache = new Map<string, unknown>();
const sceneCache = new Map<string, unknown>();
const runtimeCache = new Map<string, FamilyGraphRuntimeState>();

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

export const getFamilyGraphBshModel = <T>(key: string): T | null => touch(modelCache, key) as T | null;
export const putFamilyGraphBshModel = <T>(key: string, value: T) => setBounded(modelCache, key, value, MODEL_CACHE_LIMIT);

export const getFamilyGraphBshLayout = <T>(key: string): T | null => touch(layoutCache, key) as T | null;
export const putFamilyGraphBshLayout = <T>(key: string, value: T) => setBounded(layoutCache, key, value, LAYOUT_CACHE_LIMIT);

export const getFamilyGraphBshGeometry = <T>(key: string): T | null => touch(geometryCache, key) as T | null;
export const putFamilyGraphBshGeometry = <T>(key: string, value: T) => setBounded(geometryCache, key, value, GEOMETRY_CACHE_LIMIT);

export const getFamilyGraphBshScene = <T>(key: string): T | null => touch(sceneCache, key) as T | null;
export const putFamilyGraphBshScene = <T>(key: string, value: T) => setBounded(sceneCache, key, value, SCENE_CACHE_LIMIT);

export const hydrateFamilyGraphRuntimeState = (
  sceneKey: string,
  bootstrapPersonIds: Iterable<string> = [],
): FamilyGraphRuntimeState => {
  const cached = touch(runtimeCache, sceneKey);
  if (cached) {
    const retainedPersonIds = new Set(cached.retainedPersonIds);
    for (const personId of bootstrapPersonIds) retainedPersonIds.add(personId);
    return { camera: cached.userCameraValid ? cached.camera : null, userCameraValid: cached.userCameraValid, retainedPersonIds };
  }
  return {
    camera: null,
    userCameraValid: false,
    retainedPersonIds: new Set(bootstrapPersonIds),
  };
};

export const retainFamilyGraphRuntimePersonIds = (
  sceneKey: string,
  personIds: Iterable<string>,
) => {
  const current = touch(runtimeCache, sceneKey) ?? { camera: null, userCameraValid: false, retainedPersonIds: new Set<string>() };
  const retainedPersonIds = new Set(current.retainedPersonIds);
  for (const personId of personIds) retainedPersonIds.add(personId);
  setBounded(runtimeCache, sceneKey, {
    camera: current.camera,
    userCameraValid: current.userCameraValid,
    retainedPersonIds,
  }, RUNTIME_CACHE_LIMIT);
};

export const updateFamilyGraphRuntimeCamera = (
  sceneKey: string,
  camera: FamilyGraphCameraSnapshot,
) => {
  const current = touch(runtimeCache, sceneKey) ?? { camera: null, userCameraValid: false, retainedPersonIds: new Set<string>() };
  setBounded(runtimeCache, sceneKey, {
    camera,
    userCameraValid: true,
    retainedPersonIds: new Set(current.retainedPersonIds),
  }, RUNTIME_CACHE_LIMIT);
};

export const clearFamilyGraphBshCaches = () => {
  modelCache.clear();
  layoutCache.clear();
  geometryCache.clear();
  sceneCache.clear();
  runtimeCache.clear();
};

export const getFamilyGraphBshCacheStats = () => ({
  models: modelCache.size,
  layouts: layoutCache.size,
  geometries: geometryCache.size,
  scenes: sceneCache.size,
  runtimes: runtimeCache.size,
});
