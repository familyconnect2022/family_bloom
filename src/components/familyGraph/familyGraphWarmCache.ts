import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FamilyGraphSnapshot } from "../../types/familyGraph";
import type { FamilyGraphCameraSnapshot } from "./familyGraphViewport";
import { adaptFamilyGraphSnapshot, type FamilyGraphVisualData } from "./familyGraphLiveAdapter";
import type { FamilyGraphViewMode } from "./FamilyGraphPrototype";

const CACHE_PREFIX = "family-bloom:graph-warm:v1";
const memory = new Map<string, GraphWarmRecord>();
const visualMemory = new Map<string, FamilyGraphVisualData>();
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

export const fingerprintFamilyGraphSnapshot = (snapshot: FamilyGraphSnapshot) => {
  const persons = snapshot.persons
    .map((item) => `${item.id}:${item.updatedAt}`)
    .sort()
    .join("|");
  const relationships = snapshot.relationships
    .map((item) => `${item.id}:${item.updatedAt}`)
    .sort()
    .join("|");
  return `${snapshot.familyId}::${persons}::${relationships}`;
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
  const existing = memory.get(familyId);
  if (existing) return existing;
  try {
    const raw = await AsyncStorage.getItem(keyFor(familyId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GraphWarmRecord;
    if (parsed.version !== 1 || parsed.familyId !== familyId || parsed.snapshot?.familyId !== familyId) return null;
    memory.set(familyId, parsed);
    visualMemory.set(`${familyId}:${parsed.fingerprint}:${parsed.defaultFocusId ?? "none"}:base`, parsed.visual);
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
  const previous = memory.get(snapshot.familyId);
  const defaultFocusId = snapshot.persons.find((person) => person.linkedUid === currentUid)?.id ?? null;
  const visualKey = `${snapshot.familyId}:${fingerprint}:${defaultFocusId ?? "none"}:base`;
  let visual = visualMemory.get(visualKey);
  if (!visual) {
    visual = adaptFamilyGraphSnapshot(snapshot, defaultFocusId);
    visualMemory.set(visualKey, visual);
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
  memory.set(snapshot.familyId, record);
  schedulePersist(record);
  return record;
};

export const getFamilyGraphWarmRecord = (familyId: string | null | undefined) =>
  familyId ? memory.get(familyId) ?? null : null;

export const getOrBuildFamilyGraphVisual = (
  snapshot: FamilyGraphSnapshot,
  focusPersonId?: string | null,
  preserveGenerationHierarchy = false,
): FamilyGraphVisualData => {
  const fingerprint = fingerprintFamilyGraphSnapshot(snapshot);
  const key = `${snapshot.familyId}:${fingerprint}:${focusPersonId ?? "none"}:${preserveGenerationHierarchy ? "branch" : "base"}`;
  const cached = visualMemory.get(key);
  if (cached) return cached;
  const visual = adaptFamilyGraphSnapshot(
    snapshot,
    focusPersonId,
    preserveGenerationHierarchy ? { preserveGenerationHierarchy: true } : undefined,
  );
  visualMemory.set(key, visual);
  return visual;
};

export const updateFamilyGraphViewState = (familyId: string, viewState: GraphViewState) => {
  const current = memory.get(familyId);
  if (!current) return;
  const next = { ...current, viewState, savedAt: Date.now() };
  memory.set(familyId, next);
  schedulePersist(next);
};

export const clearFamilyGraphWarmCache = async () => {
  persistTimers.forEach((timer) => clearTimeout(timer));
  persistTimers.clear();
  memory.clear();
  visualMemory.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const graphKeys = keys.filter((key) => key.startsWith(`${CACHE_PREFIX}:`));
    if (graphKeys.length) await AsyncStorage.multiRemove(graphKeys);
  } catch {
    // Best-effort privacy cleanup; Firestore/Auth still enforce access.
  }
};
