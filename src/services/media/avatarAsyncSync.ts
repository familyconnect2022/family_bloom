import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuth } from "@react-native-firebase/auth";
import { Directory, File, Paths } from "expo-file-system";
import { avatarFileFromUri } from "./avatarFile";
import { profileService } from "../profile/profileService";

/** One durable upload intent per authenticated UID. Native image cache files may
 * vanish at any moment: copy the final, user-cropped JPEG to app documents first.
 * Old upload completion is blocked from replacing a newer selection.
 */
export type AvatarSyncState = {
  phase: "idle" | "uploading" | "complete" | "failed";
  progress: number | null;
  uri: string | null;
};
type AvatarJob = { uid: string; uri: string; id: string; createdAt: number };
type AvatarObserver = { complete?: () => void | Promise<void>; failed?: (reason: unknown) => void };
const key = (uid: string) => `family-bloom:avatar-sync:v2:${uid}`;
const MAX_JOB_AGE_MS = 24 * 60 * 60 * 1000;
const running = new Set<string>();
const rerunRequested = new Set<string>();
const failureAt = new Map<string, number>();
const observers = new Map<string, AvatarObserver>();
const selectionGeneration = new Map<string, number>();
const states = new Map<string, AvatarSyncState>();
const listeners = new Map<string, Set<(state: AvatarSyncState) => void>>();
const idle: AvatarSyncState = { phase: "idle", progress: null, uri: null };
const emit = (uid: string, state: AvatarSyncState) => {
  states.set(uid, state);
  listeners.get(uid)?.forEach((listener) => { try { listener(state); } catch {} });
};
const safeId = (uid: string) => uid.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 120);
const files = () => new Directory(Paths.document, "family-bloom-avatar-queue");
async function retainPhoto(uid: string, uri: string, id: string): Promise<string> {
  const folder = files();
  folder.create({ idempotent: true, intermediates: true });
  const target = new File(folder, `${safeId(uid)}-${id}.jpg`);
  await new File(uri).copy(target);
  if (!target.exists) throw new Error("Không thể giữ ảnh trên thiết bị để đồng bộ.");
  return target.uri;
}
const forgetPhoto = (uri: string | undefined) => {
  if (!uri) return;
  try {
    // Never delete a URI outside the private queue folder.
    if (uri.startsWith(files().uri)) {
      const file = new File(uri);
      if (file.exists) file.delete();
    }
  } catch { /* deletion is best-effort, not a profile failure */ }
};
async function pending(uid: string): Promise<AvatarJob | null> {
  const raw = await AsyncStorage.getItem(key(uid));
  if (!raw) return null;
  try {
    const job = JSON.parse(raw) as AvatarJob;
    if (job.uid === uid && typeof job.uri === "string" && job.uri.startsWith(files().uri) &&
        typeof job.id === "string" && Date.now() - job.createdAt < MAX_JOB_AGE_MS && new File(job.uri).exists) return job;
    forgetPhoto(job.uri);
  } catch { /* corrupted job */ }
  await AsyncStorage.removeItem(key(uid));
  return null;
}
async function process(uid: string): Promise<void> {
  if (running.has(uid)) { rerunRequested.add(uid); return; }
  running.add(uid);
  try {
    while (getAuth().currentUser?.uid === uid) {
      const job = await pending(uid);
      if (!job) break;
      emit(uid, { phase: "uploading", progress: null, uri: job.uri });
      try {
        await profileService.updateWithAvatar(uid, {}, avatarFileFromUri(job.uri, `avatar-${uid}-${job.id}`),
          () => undefined, {
            canCommit: async () => {
              const latest = await pending(uid);
              return getAuth().currentUser?.uid === uid && latest?.id === job.id;
            },
            onProgress: (value) => {
              // Progress of superseded uploads must not override the latest picker.
              if (states.get(uid)?.uri === job.uri) emit(uid, { phase: "uploading", progress: Math.max(0, Math.min(100, value)), uri: job.uri });
            },
          });
        const latest = await pending(uid);
        if (latest?.id === job.id) {
          await AsyncStorage.removeItem(key(uid));
          // Keep the local picture visible until the profile snapshot refreshes.
          emit(uid, { phase: "complete", progress: 100, uri: job.uri });
          if (getAuth().currentUser?.uid === uid) {
            try { await observers.get(uid)?.complete?.(); } catch {}
          }
          observers.delete(uid);
          // The observer refreshes the authoritative Firestore profile first.
          emit(uid, { phase: "complete", progress: 100, uri: null });
          forgetPhoto(job.uri);
        } else if (latest?.id !== job.id) forgetPhoto(job.uri);
      } catch (error) {
        if ((await pending(uid))?.id !== job.id) { forgetPhoto(job.uri); continue; }
        failureAt.set(uid, Date.now());
        emit(uid, { phase: "failed", progress: null, uri: job.uri });
        observers.get(uid)?.failed?.(error);
        observers.delete(uid);
        break; // keep job and local photo; explicit retry/foreground resume
      }
    }
  } finally {
    running.delete(uid);
    if (rerunRequested.delete(uid)) void process(uid).catch(() => undefined);
  }
}
export const avatarAsyncSync = {
  getState(uid: string): AvatarSyncState { return states.get(uid) || idle; },
  subscribe(uid: string, listener: (state: AvatarSyncState) => void): () => void {
    const set = listeners.get(uid) || new Set<(state: AvatarSyncState) => void>();
    set.add(listener); listeners.set(uid, set);
    listener(states.get(uid) || idle);
    return () => { set.delete(listener); if (!set.size) listeners.delete(uid); };
  },
  async enqueue(uid: string, uri: string, observer?: AvatarObserver): Promise<void> {
    if (getAuth().currentUser?.uid !== uid) throw new Error("AVATAR_OWNER_CHANGED");
    const generation = (selectionGeneration.get(uid) || 0) + 1;
    selectionGeneration.set(uid, generation);
    const previous = await pending(uid);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const retained = await retainPhoto(uid, uri, id);
    if (getAuth().currentUser?.uid !== uid || selectionGeneration.get(uid) !== generation) {
      forgetPhoto(retained); throw new Error("AVATAR_SELECTION_SUPERSEDED");
    }
    const job: AvatarJob = { uid, uri: retained, id, createdAt: Date.now() };
    await AsyncStorage.setItem(key(uid), JSON.stringify(job));
    if (previous?.uri !== retained && !running.has(uid)) forgetPhoto(previous?.uri);
    failureAt.delete(uid);
    if (observer) observers.set(uid, observer);
    emit(uid, { phase: "uploading", progress: null, uri: retained });
    void process(uid).catch((error) => observer?.failed?.(error));
  },
  /** Used ONLY by the active save form. A queued image is not proof that it
   * has reached the profile. Wait for the authoritative upload/update result.
   * The timeout keeps a broken network from locking the screen indefinitely.
   */
  async waitForCompletion(uid: string, timeoutMs = 75000): Promise<"complete" | "failed" | "timeout"> {
    if (getAuth().currentUser?.uid !== uid) return "failed";
    return new Promise((resolve) => {
      let finished = false;
      let stop: () => void = () => {};
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = (result: "complete" | "failed" | "timeout") => {
        if (finished) return;
        finished = true;
        stop();
        if (timer) clearTimeout(timer);
        resolve(result);
      };
      stop = this.subscribe(uid, (state) => {
        if (state.phase === "complete") finish("complete");
        else if (state.phase === "failed") finish("failed");
      });
      if (finished) stop();
      else timer = setTimeout(() => finish("timeout"), timeoutMs);
    });
  },
  async restore(uid: string): Promise<void> {
    if (getAuth().currentUser?.uid !== uid) return;
    const job = await pending(uid);
    if (job) emit(uid, { phase: failureAt.has(uid) ? "failed" : "uploading", progress: null, uri: job.uri });
  },
  resume(uid: string, observer?: AvatarObserver): void {
    if (observer) observers.set(uid, observer);
    void this.restore(uid).then(() => {
      if (Date.now() - (failureAt.get(uid) ?? 0) < 30000) return;
      void process(uid).catch(() => undefined);
    }).catch(() => undefined);
  },
  retry(uid: string, observer?: AvatarObserver): void { failureAt.delete(uid); this.resume(uid, observer); },
  async discard(uid: string): Promise<void> {
    selectionGeneration.set(uid, (selectionGeneration.get(uid) || 0) + 1);
    observers.delete(uid);
    const job = await pending(uid);
    await AsyncStorage.removeItem(key(uid));
    emit(uid, idle);
    if (!running.has(uid)) forgetPhoto(job?.uri);
  },
};
