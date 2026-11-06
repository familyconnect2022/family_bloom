import type { FamilyGraphCameraSnapshot } from "./familyGraphViewport";

/**
 * Focus View runtime is intentionally isolated from the main Family Graph.
 *
 * The Focus camera and retained-node set must never read/write
 * familyGraphBshCache runtime state.  This cache only belongs to Focus View and
 * survives hide/reopen of a prepared Focus branch so already discovered nodes
 * stay mounted while revisiting explored areas.
 */
export type FamilyGraphFocusRuntimeState = {
  camera: FamilyGraphCameraSnapshot | null;
  userCameraValid: boolean;
  retainedPersonIds: Set<string>;
};

const FOCUS_RUNTIME_CACHE_LIMIT = 24;
const focusRuntimeCache = new Map<string, FamilyGraphFocusRuntimeState>();

const touch = (sceneKey: string): FamilyGraphFocusRuntimeState | null => {
  const value = focusRuntimeCache.get(sceneKey) ?? null;
  if (!value) return null;
  focusRuntimeCache.delete(sceneKey);
  focusRuntimeCache.set(sceneKey, value);
  return value;
};

const setBounded = (sceneKey: string, value: FamilyGraphFocusRuntimeState) => {
  focusRuntimeCache.delete(sceneKey);
  focusRuntimeCache.set(sceneKey, value);
  while (focusRuntimeCache.size > FOCUS_RUNTIME_CACHE_LIMIT) {
    const oldest = focusRuntimeCache.keys().next();
    if (oldest.done) break;
    focusRuntimeCache.delete(oldest.value);
  }
};

export const hydrateFamilyGraphFocusRuntimeState = (
  sceneKey: string,
  bootstrapPersonIds: Iterable<string> = [],
): FamilyGraphFocusRuntimeState => {
  const cached = touch(sceneKey);
  const retainedPersonIds = new Set(cached?.retainedPersonIds ?? []);
  for (const personId of bootstrapPersonIds) retainedPersonIds.add(personId);
  return {
    camera: cached?.userCameraValid ? cached.camera : null,
    userCameraValid: cached?.userCameraValid ?? false,
    retainedPersonIds,
  };
};

export const retainFamilyGraphFocusPersonIds = (
  sceneKey: string,
  personIds: Iterable<string>,
) => {
  const current = touch(sceneKey) ?? {
    camera: null,
    userCameraValid: false,
    retainedPersonIds: new Set<string>(),
  };
  const retainedPersonIds = new Set(current.retainedPersonIds);
  for (const personId of personIds) retainedPersonIds.add(personId);
  setBounded(sceneKey, {
    camera: current.camera,
    userCameraValid: current.userCameraValid,
    retainedPersonIds,
  });
};

export const updateFamilyGraphFocusCamera = (
  sceneKey: string,
  camera: FamilyGraphCameraSnapshot,
) => {
  const current = touch(sceneKey) ?? {
    camera: null,
    userCameraValid: false,
    retainedPersonIds: new Set<string>(),
  };
  setBounded(sceneKey, {
    camera,
    userCameraValid: true,
    retainedPersonIds: new Set(current.retainedPersonIds),
  });
};

export const clearFamilyGraphFocusRuntime = (sceneKey?: string) => {
  if (sceneKey) {
    focusRuntimeCache.delete(sceneKey);
    return;
  }
  focusRuntimeCache.clear();
};
