import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FamilyGraphSnapshot } from "../../types/familyGraph";
import { fingerprintFamilyGraphLayout, fingerprintFamilyGraphSnapshot } from "./familyGraphRevision";
export { fingerprintFamilyGraphLayout, fingerprintFamilyGraphSnapshot } from "./familyGraphRevision";
import type { FamilyGraphCameraSnapshot } from "./familyGraphViewport";
import { clearFamilyGraphBshCaches } from "./familyGraphBshCache";
import { adaptFamilyGraphSnapshot, refreshFamilyGraphVisualProfiles, type FamilyGraphVisualData } from "./familyGraphLiveAdapter";
import type { FamilyGraphViewMode } from "./FamilyGraphPrototype";

const CACHE_PREFIX = "family-bloom:graph-warm:v1";
const memory = new Map<string, GraphWarmRecord>();
const MAX_FAMILY_WARM_RECORDS = 3;
const visualMemory = new Map<string, FamilyGraphVisualData>();
const layoutMemory = new Map<string, FamilyGraphVisualData>();
const MAX_VISUAL_CACHE_ENTRIES = 12;
const MAX_LAYOUT_CACHE_ENTRIES = 8;
const persistTimers = new Map<string, ReturnType<typeof setTimeout>>();

type GraphViewState = {
  viewMode: FamilyGraphViewMode;
  viewAnchorPersonId: string | null;
  camera: FamilyGraphCameraSnapshot | null;
};

type GraphWarmRecord = {
  version: 1;
  familyId: string;
  fingerprint: string;
  snapshot: FamilyGraphSnapshot;
  defaultFocusId: string | null;
  visual: FamilyGraphVisualData;
  viewState: GraphViewState;
  savedAt: number;
};

const keyFor = (familyId: string) => `${CACHE_PREFIX}:${familyId}`;

const setBoundedWarmRecord = (familyId: string, record: GraphWarmRecord) => {
  memory.delete(familyId);
  memory.set(familyId, record);
  while (memory.size > MAX_FAMILY_WARM_RECORDS) {
    const oldest = memory.keys().next();
    if (oldest.done) break;
    memory.delete(oldest.value);
  }
};

const touchWarmRecord = (familyId: string) => {
  const record = memory.get(familyId);
  if (!record) return null;
  memory.delete(familyId);
  memory.set(familyId, record);
  return record;
};

const setBoundedVisualCache = (
  cache: Map<string, FamilyGraphVisualData>,
  key: string,
  value: FamilyGraphVisualData,
  limit: number,
) => {
  cache.delete(key);
  cache.set(key, value);
  while (cache.size > limit) {
    const oldest = cache.keys().next();
    if (oldest.done) break;
    cache.delete(oldest.value);
  }
};

const schedulePersist = (record: GraphWarmRecord) => {
  const current = persistTimers.get(record.familyId);
  if (current) clearTimeout(current);
  persistTimers.set(record.familyId, setTimeout(() => {
    persistTimers.delete(record.familyId);
    void AsyncStorage.setItem(keyFor(record.familyId), JSON.stringify(record)).catch(() => undefined);
  }, 450));
};

export const hydrateFamilyGraphWarmCache = async (familyId: string): Promise<GraphWarmRecord | null> => {
  if (!familyId) return null;
  const existing = touchWarmRecord(familyId);
  if (existing) return existing;
  try {
    const raw = await AsyncStorage.getItem(keyFor(familyId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GraphWarmRecord;
    if (parsed.version !== 1 || parsed.familyId !== familyId || parsed.snapshot?.familyId !== familyId) return null;
    setBoundedWarmRecord(familyId, parsed);
    setBoundedVisualCache(visualMemory, `${familyId}:${parsed.fingerprint}:${parsed.defaultFocusId ?? "none"}:base`, parsed.visual, MAX_VISUAL_CACHE_ENTRIES);
    const layoutFingerprint = fingerprintFamilyGraphLayout(parsed.snapshot);
    setBoundedVisualCache(layoutMemory, `${familyId}:${layoutFingerprint}:${parsed.defaultFocusId ?? "none"}:base`, parsed.visual, MAX_LAYOUT_CACHE_ENTRIES);
    return parsed;
  } catch {
    return null;
  }
};

export const primeFamilyGraphWarmCache = (
  snapshot: FamilyGraphSnapshot,
  currentUid?: string | null,
): GraphWarmRecord => {
  const fingerprint = fingerprintFamilyGraphSnapshot(snapshot);
  const previous = touchWarmRecord(snapshot.familyId);
  const defaultFocusId = snapshot.persons.find((person) => person.linkedUid === currentUid)?.id ?? null;
  const visualKey = `${snapshot.familyId}:${fingerprint}:${defaultFocusId ?? "none"}:base`;
  const layoutFingerprint = fingerprintFamilyGraphLayout(snapshot);
  const layoutKey = `${snapshot.familyId}:${layoutFingerprint}:${defaultFocusId ?? "none"}:base`;
  let visual = visualMemory.get(visualKey);
  if (!visual) {
    const layoutCached = layoutMemory.get(layoutKey);
    visual = (layoutCached && refreshFamilyGraphVisualProfiles(layoutCached, snapshot))
      || adaptFamilyGraphSnapshot(snapshot, defaultFocusId);
    setBoundedVisualCache(visualMemory, visualKey, visual, MAX_VISUAL_CACHE_ENTRIES);
    setBoundedVisualCache(layoutMemory, layoutKey, visual, MAX_LAYOUT_CACHE_ENTRIES);
  }
  const record: GraphWarmRecord = {
    version: 1,
    familyId: snapshot.familyId,
    fingerprint,
    snapshot,
    defaultFocusId,
    visual,
    viewState: previous?.viewState ?? {
      viewMode: "3",
      viewAnchorPersonId: defaultFocusId,
      camera: null,
    },
    savedAt: Date.now(),
  };
  setBoundedWarmRecord(snapshot.familyId, record);
  schedulePersist(record);
  return record;
};

export const getFamilyGraphWarmRecord = (familyId: string | null | undefined) =>
  familyId ? touchWarmRecord(familyId) : null;

export const getOrBuildFamilyGraphVisual = (
  snapshot: FamilyGraphSnapshot,
  focusPersonId?: string | null,
  preserveGenerationHierarchy = false,
): FamilyGraphVisualData => {
  const fingerprint = fingerprintFamilyGraphSnapshot(snapshot);
  const mode = preserveGenerationHierarchy ? "branch" : "base";
  const key = `${snapshot.familyId}:${fingerprint}:${focusPersonId ?? "none"}:${mode}`;
  const cached = visualMemory.get(key);
  if (cached) return cached;
  const layoutFingerprint = fingerprintFamilyGraphLayout(snapshot);
  const layoutKey = `${snapshot.familyId}:${layoutFingerprint}:${focusPersonId ?? "none"}:${mode}`;
  const layoutCached = layoutMemory.get(layoutKey);
  const visual = (layoutCached && refreshFamilyGraphVisualProfiles(layoutCached, snapshot))
    || adaptFamilyGraphSnapshot(
      snapshot,
      focusPersonId,
      preserveGenerationHierarchy ? { preserveGenerationHierarchy: true } : undefined,
    );
  setBoundedVisualCache(visualMemory, key, visual, MAX_VISUAL_CACHE_ENTRIES);
  setBoundedVisualCache(layoutMemory, layoutKey, visual, MAX_LAYOUT_CACHE_ENTRIES);
  return visual;
};

export const updateFamilyGraphViewState = (familyId: string, viewState: GraphViewState) => {
  const current = touchWarmRecord(familyId);
  if (!current) return;
  const next = { ...current, viewState, savedAt: Date.now() };
  setBoundedWarmRecord(familyId, next);
  schedulePersist(next);
};

export const clearFamilyGraphWarmCache = async () => {
  persistTimers.forEach((timer) => clearTimeout(timer));
  persistTimers.clear();
  memory.clear();
  visualMemory.clear();
  layoutMemory.clear();
  clearFamilyGraphBshCaches();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const graphKeys = keys.filter((key) => key.startsWith(`${CACHE_PREFIX}:`));
    if (graphKeys.length) await AsyncStorage.multiRemove(graphKeys);
  } catch {
    // Best-effort privacy cleanup; Firestore/Auth still enforce access.
  }
};
