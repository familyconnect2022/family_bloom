/** Appearance is local-first. Render and navigation NEVER write Firestore.
 * A private per-UID cache wins on all subsequent launches. A single server
 * read is allowed only when that UID has no valid local preference. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDocFromServer, getFirestore, setDoc } from '@react-native-firebase/firestore';
import { FIRESTORE_PATHS } from '../services/firebase/firestorePaths';
import { getBloomSelection, applyBloomSelection } from './runtime';
import { DEFAULT_BLOOM_SELECTION, isBloomSelection } from './palette';
import { DEFAULT_LIVING_APPEARANCE, getLivingAppearance, applyLivingAppearance, isLivingAppearance } from './livingAppearance';

/** Read-only diagnostic for the Dev Appearance Lab. Never logs, performs IO,
 * or creates subscriptions unless the Dev Lab explicitly opens. */
export type AppearanceHydrationStatus = Readonly<{
  phase: 'unbound'|'reading-local'|'reading-cloud'|'ready-local'|'ready-cloud'|'ready-default'|'offline-default';
  serial: number; bound: boolean; source: 'none'|'cache'|'cloud'|'default'; elapsedMs: number;
}>;
let hydrationStatus: AppearanceHydrationStatus = {phase:'unbound',serial:0,bound:false,source:'none',elapsedMs:0};
const hydrationListeners = new Set<() => void>();
export const getAppearanceHydrationStatus = () => hydrationStatus;
/** The protected Android UI must not mount with another UID's appearance, nor
 * with Rose before the current UID's local cache has been checked. This API
 * deliberately never returns or exposes the UID to diagnostic reports. */
export function isAppearanceReadyForUid(uid: string | null | undefined): boolean {
  return !!uid && activeUid === uid && (
    hydrationStatus.phase === 'ready-local' || hydrationStatus.phase === 'ready-cloud' ||
    hydrationStatus.phase === 'ready-default' || hydrationStatus.phase === 'offline-default'
  );
}

export const subscribeAppearanceHydration = (listener: () => void) => {
  hydrationListeners.add(listener); return () => {hydrationListeners.delete(listener);};
};
function setHydrationStatus(phase: AppearanceHydrationStatus['phase'], bound: boolean,
  source: AppearanceHydrationStatus['source'], startedAt: number) {
  hydrationStatus = {phase, serial:hydrationStatus.serial+1, bound, source,
    elapsedMs:Math.max(0, Date.now()-startedAt)};
  hydrationListeners.forEach(listener=>listener());
}
export const APPEARANCE_USER_STORAGE = '@family-bloom/android/appearance/uid/v2/';
export type AppearanceData = ReturnType<typeof currentPreferences> & {updatedAt: string; schemaVersion: 2};
type Cache = AppearanceData & {pendingSync?: boolean};
let activeUid: string | null = null;
let bindGeneration = 0;
let editGeneration = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let writeInFlight = false;
const metrics = {cloudReads:0, cloudWrites:0, cacheHits:0, cacheMisses:0, userEdits:0, coalescedEdits:0, skippedWrites:0};
export function getAppearanceSyncMetrics() { return {...metrics, uidBound:!!activeUid, hasPending:!!pending?.pendingSync, writeInFlight}; }

let pending: Cache | null = null;
let persistTail: Promise<unknown> = Promise.resolve();
const DEBOUNCE_MS = 850;
const isUid = (v: string | null): v is string => typeof v === 'string' && v.length > 0 && v.length < 160 && !v.includes('/');
const usable = (v: unknown): v is Cache => isBloomSelection(v) && isLivingAppearance(v);
function currentPreferences() { return {...getBloomSelection(), ...getLivingAppearance()}; }
function makeSnapshot(): AppearanceData { return {...currentPreferences(), updatedAt: new Date().toISOString(), schemaVersion: 2}; }
function samePreferences(a: unknown, b: unknown) {
  if (!usable(a) || !usable(b)) return false;
  return a.palette === b.palette && a.mode === b.mode && a.font === b.font && a.fontScale === b.fontScale && a.motion === b.motion;
}
function applyCache(value: Cache) {
  applyBloomSelection(value); applyLivingAppearance(value);
}
/** Lab-only read barrier: ensure the user's most recent local edit is durable
 * before taking a cold-start baseline. This NEVER sends a Firebase request. */
export async function waitForAppearanceLocalWrites(): Promise<void> {
  await persistTail;
}
function storeCache(target: string, value: Cache) {
  const raw = JSON.stringify(value);
  // Serialize local writes so a delayed disk write cannot replace a newer edit.
  persistTail = persistTail.catch(() => undefined).then(() => AsyncStorage.setItem(APPEARANCE_USER_STORAGE + target, raw));
  return persistTail;
}
function stopTimer() { if (timer) { clearTimeout(timer); timer = null; } }
function scheduleFlush(target: string, generation: number) {
  stopTimer();
  timer = setTimeout(() => { timer = null; void flush(target, generation); }, DEBOUNCE_MS);
}
async function flush(target: string, generation: number) {
  if (activeUid !== target || bindGeneration !== generation || !pending?.pendingSync) return;
  // A previous UID's request can still be in flight. Never discard the new
  // UID's scheduled retry: it must survive account switches and slow network.
  if (writeInFlight) { scheduleFlush(target, generation); return; }
  writeInFlight = true;
  const payload = pending;
  const editAtStart = editGeneration;
  try {
    await persistTail.catch(() => undefined);
    if (activeUid !== target || bindGeneration !== generation) return;
    const {pendingSync: _omitted, ...remotePayload} = payload;
    metrics.cloudWrites++;
    await setDoc(doc(getFirestore(), FIRESTORE_PATHS.userAppearance(target)), remotePayload);
    if (activeUid !== target || bindGeneration !== generation) return;
    if (editGeneration === editAtStart && pending === payload) {
      pending = null;
      await storeCache(target, remotePayload);
    }
  } catch { /* Preserve pending cache and retry only when user edits again or account is reopened. */ }
  finally {
    writeInFlight = false;
    if (activeUid === target && bindGeneration === generation && pending && editGeneration !== editAtStart)
      scheduleFlush(target, generation);
  }
}
/** Called by the existing Auth bridge, never from render. No listener on a cached UID. */
export async function bindAppearanceToUid(nextUid: string | null, localReady: Promise<unknown>) {
  const next = isUid(nextUid) ? nextUid : null;
  if (activeUid === next) return;
  stopTimer();
  activeUid = next;
  pending = null;
  const generation = ++bindGeneration;
  const editAtStart = editGeneration;
  const bindStartedAt = Date.now();
  setHydrationStatus(next ? 'reading-local' : 'unbound', !!next, 'none', bindStartedAt);
  // Do NOT publish Rose while binding a signed-in UID. The account bridge
  // holds authenticated UI behind a neutral surface until this UID is ready.
  // Publishing defaults here would let legacy cached styles capture Rose.
  // Login has no UID and must never inherit the previous account's theme.
  if (!next) {
    applyBloomSelection(DEFAULT_BLOOM_SELECTION, 'signed-out');
    applyLivingAppearance(DEFAULT_LIVING_APPEARANCE);
    return;
  }
  await localReady.catch(() => undefined);
  if (activeUid !== next || bindGeneration !== generation) return;
  if (editGeneration !== editAtStart) {
    setHydrationStatus('ready-local', true, 'cache', bindStartedAt);
    return; // A newer user edit wins; never replay an older cache.
  }
  try {
    await persistTail.catch(() => undefined);
    const raw = await AsyncStorage.getItem(APPEARANCE_USER_STORAGE + next);
    if (activeUid !== next || bindGeneration !== generation || editGeneration !== editAtStart) return;
    if (raw) {
      const cached: unknown = JSON.parse(raw);
      if (usable(cached)) {
        metrics.cacheHits++;
        applyCache(cached);
        setHydrationStatus('ready-local', true, 'cache', bindStartedAt);
        if (cached.pendingSync) {
          pending = cached;
          scheduleFlush(next, generation); // Retry existing offline edit without cloud read.
        }
        return; // Cache hit: ZERO Firebase appearance reads/writes on startup.
      }
    }
  } catch { /* Bad cache is never treated as authentication. */ }
  metrics.cacheMisses++;
  setHydrationStatus('reading-cloud', true, 'none', bindStartedAt);
  try {
    // First use of this UID only. Missing document never causes an auto-write.
    metrics.cloudReads++;
    const remote = await Promise.race([
      getDocFromServer(doc(getFirestore(), FIRESTORE_PATHS.userAppearance(next))),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('appearance read timeout')), 7000)),
    ]);
    if (activeUid !== next || bindGeneration !== generation || editGeneration !== editAtStart) return;
    const data: unknown = remote.exists() ? remote.data() : null;
    if (usable(data)) applyCache(data);
    else {
      applyBloomSelection(DEFAULT_BLOOM_SELECTION, 'first-use-default');
      applyLivingAppearance(DEFAULT_LIVING_APPEARANCE);
    }
    setHydrationStatus(usable(data) ? 'ready-cloud' : 'ready-default', true, usable(data) ? 'cloud' : 'default', bindStartedAt);
    // Cache both server data and default for an existing UID. A failed first
    // read is NOT cached: it may be retried on another launch.
    await storeCache(next, usable(data) ? {...data, schemaVersion: 2, updatedAt: data.updatedAt || new Date(0).toISOString()} : makeSnapshot());
  } catch { /* Do not cache failed first reads: next launch may retry cloud. */
    if (activeUid === next && bindGeneration === generation && editGeneration === editAtStart) {
      applyBloomSelection(DEFAULT_BLOOM_SELECTION, 'offline-first-use-default');
      applyLivingAppearance(DEFAULT_LIVING_APPEARANCE);
      setHydrationStatus('offline-default', true, 'default', bindStartedAt);
    }
  }
}
/** Only direct user actions call this. Save pending locally immediately,
 * coalesce rapid edits, and never subscribe to changes from the server. */
export function appearanceUserEdited() {
  const target = activeUid;
  if (!target) return;
  editGeneration++;
  metrics.userEdits++;
  const next = makeSnapshot();
  if (pending && samePreferences(pending, next)) { metrics.skippedWrites++; return; }
  if (pending) metrics.coalescedEdits++;
  pending = {...next, pendingSync: true};
  void storeCache(target, pending).catch(() => undefined);
  scheduleFlush(target, bindGeneration);
}
/** Explicit opt-in fetch for multi-device settings sync, never auto-run. */
export async function refreshAppearanceFromCloud(): Promise<'updated'|'unchanged'|'pending'|'unavailable'> {
  const target = activeUid, generation = bindGeneration, editAtStart = editGeneration;
  if (!target) return 'unavailable';
  await persistTail.catch(() => undefined);
  if (pending?.pendingSync) return 'pending';
  try {
    metrics.cloudReads++;
    const response = await getDocFromServer(doc(getFirestore(), FIRESTORE_PATHS.userAppearance(target)));
    if (activeUid !== target || bindGeneration !== generation || editGeneration !== editAtStart || pending) return 'pending';
    const value: unknown = response.exists() ? response.data() : null;
    if (!usable(value)) return 'unavailable';
    if (samePreferences(value, currentPreferences())) return 'unchanged';
    applyCache(value);
    await storeCache(target, {...value, schemaVersion: 2, updatedAt: value.updatedAt || new Date(0).toISOString()});
    return 'updated';
  } catch { return 'unavailable'; }
}
