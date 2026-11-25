import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getAuth} from '@react-native-firebase/auth';
import {createNativeJournal,type NativePublishRecord} from '../features/learning/familyDocument/nativePublishJournal.cjs';
const nativeRecoveryEnabled=process.env.EXPO_PUBLIC_FAMILY_MOMENT_PUBLISH_RECOVERY_ENABLED==='1';
const nativeJournal=createNativeJournal(AsyncStorage);
import { useBloomTaskToast } from "../hooks/ui/useBloomTaskToast";
import { mediaService } from "../services/media/mediaService";
import { activityService } from "../services/activity/activityService";
import { momentsService } from "../services/moments/momentsService";
import type { MediaFile } from "../types";
import type { MomentMedia, MomentPost } from "../types/moments";
import {matchesPublishedMoment} from '../features/learning/familyDocument/publishManager.cjs';
import { momentResumeProgress, normalizeMomentTargetFamilyIds } from "../utils/momentPublishPolicy";
import { momentMediaApi } from "../services/media/momentMediaApi";
import { momentUploadErrorMessage } from "../services/media/momentUploadError";
import { recordMomentUploadFailure } from "../services/media/momentUploadDiagnostic";
import { momentUploadToastStore } from "../services/moments/momentUploadToastStore";

export type PendingMomentStatus = "queued" | "uploading" | "publishing" | "cancelling" | "published" | "failed";
export type PendingMomentFailureStage = "upload" | "publish";

export interface PendingMomentUploadedFile {
  fileId: string;
  assetId: string;
  media: MomentMedia;
  /** False only when Cloudinary succeeded but media_assets metadata could not sync yet. */
  metadataSynced: boolean;
  /** Ephemeral: delete without privileged backend within 10 minutes. */
  cloudName?: string;
}

export interface PendingMoment {
  localId: string;
  postId: string;
  familyId: string;
  author: { uid: string; displayName: string; avatarUrl?: string };
  caption: string;
  richBody?: string | null;
  personIds: string[];
  timelineAudience: "self" | "family" | "persons";
  notifyFamily: boolean;
  files: MediaFile[];
  /**
   * Successful uploads are kept when another file or the Firestore publish step fails.
   * Retry therefore resumes only the missing work instead of uploading everything again.
   */
  uploadedFiles: PendingMomentUploadedFile[];
  status: PendingMomentStatus;
  progress: number;
  createdAt: string;
  error?: string;
  failureStage?: PendingMomentFailureStage;
  /** Once a commit has been attempted, never treat this task as an abandonable upload. */
  publishAttempted?: boolean;
}

interface PublishMomentInput {
  familyId: string;
  /** Additional houses explicitly selected by the user. Current house is always included. */
  additionalFamilyIds?: string[];
  author: PendingMoment["author"];
  caption: string;
  richBody?: string | null;
  /** Person ids are family-scoped, so these only apply to the current/source family. */
  personIds: string[];
  timelineAudience: "self" | "family" | "persons";
  notifyFamily: boolean;
  files: MediaFile[];
}

interface MomentPublishContextValue {
  /** Only terminal failures are exposed to React consumers. Live upload checkpoints
   * stay provider-local so they cannot invalidate the media-heavy Moments feed. */
  failedPendingMoments: PendingMoment[];
  publishMoment: (input: PublishMomentInput) => string;
  retryMoment: (localId: string) => void;
  removePendingMoment: (localId: string) => void;
  cancelMoment: (localId: string) => void;
  reconcilePublished: (familyId: string, posts: MomentPost[]) => void;
  checkUnconfirmedPublications:(uid:string,familyId:string)=>Promise<{confirmed:number;unresolved:number}>;
}

const MomentPublishContext = createContext<MomentPublishContextValue | null>(null);

export const useMomentPublish = () => {
  const value = useContext(MomentPublishContext);
  if (!value) throw new Error("useMomentPublish phải được bọc trong MomentPublishProvider");
  return value;
};

const makeLocalId = () => `moment-local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

type PendingMomentProgressListener = () => void;
const pendingMomentProgressValues = new Map<string, number>();
const pendingMomentProgressListeners = new Map<string, Set<PendingMomentProgressListener>>();

const clampPendingMomentProgress = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const setPendingMomentProgress = (localId: string, value: number) => {
  const next = clampPendingMomentProgress(value);
  if (pendingMomentProgressValues.get(localId) === next) return;
  pendingMomentProgressValues.set(localId, next);
  pendingMomentProgressListeners.get(localId)?.forEach((listener) => listener());
};

const clearPendingMomentProgress = (localId: string) => {
  pendingMomentProgressValues.delete(localId);
  pendingMomentProgressListeners.delete(localId);
};

export const usePendingMomentProgress = (localId: string, fallback: number) => {
  const subscribe = useCallback((listener: PendingMomentProgressListener) => {
    const bucket = pendingMomentProgressListeners.get(localId) ?? new Set<PendingMomentProgressListener>();
    bucket.add(listener);
    pendingMomentProgressListeners.set(localId, bucket);
    return () => {
      bucket.delete(listener);
      if (!bucket.size) pendingMomentProgressListeners.delete(localId);
    };
  }, [localId]);
  const getSnapshot = useCallback(
    () => pendingMomentProgressValues.get(localId) ?? clampPendingMomentProgress(fallback),
    [fallback, localId],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};

export function MomentPublishProvider({ children }: { children: React.ReactNode }) {
  const [pendingMoments, setPendingMoments] = useState<PendingMoment[]>([]);
  const pendingRef = useRef<PendingMoment[]>([]);
  const runningRef = useRef(new Set<string>());
  const queueRef = useRef<PendingMoment[]>([]);
  const queueDrainingRef = useRef(false);
  const cancelledRef = useRef(new Set<string>());
  const abortRef = useRef(new Map<string, AbortController>());
  const progressRenderRef = useRef(new Map<string, { lastValue: number; lastAt: number }>());
  const { finishTask, failTask } = useBloomTaskToast();

  useEffect(() => { pendingRef.current = pendingMoments; }, [pendingMoments]);

  const patch = useCallback((localId: string, updates: Partial<PendingMoment>) => {
    setPendingMoments((current) => {
      const next = current.map((item) => item.localId === localId ? { ...item, ...updates } : item);
      // Keep imperative retry paths in sync with the exact state committed here instead
      // of waiting one React effect tick. This matters when connectivity returns and
      // the user taps “Thử lại” immediately.
      pendingRef.current = next;
      return next;
    });
  }, []);

  const execute = useCallback(async (task: PendingMoment) => {
    if (runningRef.current.has(task.localId)) return;
    runningRef.current.add(task.localId);
    const controller = new AbortController();
    abortRef.current.set(task.localId, controller);
    const createdAssetIds = new Set<string>();
    let publishAttempted=task.publishAttempted===true;
    let journalRecord:NativePublishRecord|undefined;
    const wasCancelled = () => cancelledRef.current.has(task.localId) || controller.signal.aborted;
    const throwIfCancelled = () => {
      if (wasCancelled()) throw Object.assign(new Error("Moment đã hủy"), { name: "AbortError" });
    };
    const toast = (status: "queued" | "uploading" | "publishing" | "cancelling", progress: number, fileIndex = 0) => {
      const file = task.files[Math.min(fileIndex, Math.max(0, task.files.length - 1))];
      momentUploadToastStore.set({
        localId: task.localId, status, progress, thumbnailUri: file?.uri,
        video: file?.type === "video",
      });
    };
    toast("uploading", momentResumeProgress(task.files.length, task.uploadedFiles.length));
    progressRenderRef.current.set(task.localId, { lastValue: momentResumeProgress(task.files.length, task.uploadedFiles.length), lastAt: 0 });

    const completedByFile = new Map(task.uploadedFiles.map((item) => [item.fileId, item]));
    const initialProgress = momentResumeProgress(task.files.length, completedByFile.size);
    setPendingMomentProgress(task.localId, initialProgress);
    patch(task.localId, {
      status: completedByFile.size < task.files.length ? "uploading" : "publishing",
      progress: initialProgress,
      error: undefined,
      failureStage: undefined,
    });

    try {
      throwIfCancelled();
      if(nativeRecoveryEnabled){if(getAuth().currentUser?.uid!==task.author.uid)throw Error('AUTH_CHANGED');const earlier=await nativeJournal.list(task.author.uid,task.familyId);if(earlier.some(r=>r.postId!==task.postId))throw Error('PUBLISH_PREVIOUS_UNCONFIRMED');}
      const media = new Array<MomentMedia>(task.files.length);
      const progressById = new Map(task.files.map((file) => [file.id, completedByFile.has(file.id) ? 100 : 0]));
      completedByFile.forEach((item) => {
        const index = task.files.findIndex((file) => file.id === item.fileId);
        if (index >= 0) media[index] = item.media;
      });

      let nextIndex = 0;
      const workerCount = task.files.some((file) => file.type === "video") ? Math.min(1, task.files.length) : Math.min(2, task.files.length);

      const updateOverallProgress = () => {
        if (!task.files.length) return;
        const total = Array.from(progressById.values()).reduce((sum, value) => sum + value, 0);
        const nextProgress = Math.max(1, Math.min(99, Math.round(total / task.files.length)));
        const nowMs = Date.now();
        const previous = progressRenderRef.current.get(task.localId) ?? { lastValue: 0, lastAt: 0 };
        const advancedEnough = nextProgress - previous.lastValue >= 6;
        const waitedEnough = nowMs - previous.lastAt >= 220;
        if (nextProgress < 99 && !advancedEnough && !waitedEnough) return;

        progressRenderRef.current.set(task.localId, { lastValue: nextProgress, lastAt: nowMs });
        setPendingMomentProgress(task.localId, nextProgress);
        const currentToast = momentUploadToastStore.getSnapshot();
        if (currentToast?.localId === task.localId && currentToast.status === "uploading")
          toast("uploading", nextProgress, task.files.findIndex((file) => (progressById.get(file.id) ?? 0) < 100));
      };

      const worker = async () => {
        while (true) {
          throwIfCancelled();
          const index = nextIndex++;
          if (index >= task.files.length) return;
          const file = task.files[index];
          toast("uploading", Math.max(1, momentUploadToastStore.getSnapshot()?.progress ?? 0), index);
          const existing = completedByFile.get(file.id);
          if (existing) {
            media[index] = existing.media;
            progressById.set(file.id, 100);
            continue;
          }

          let uploaded;
          try {
            uploaded = await mediaService.uploadManaged(
              file,
              {
                ownerUid: task.author.uid,
                familyId: task.familyId,
                purpose: "moment",
                entityType: "moment",
                entityId: task.postId,
                category: "moments",
              },
              (value) => {
                if (wasCancelled()) return;
                progressById.set(file.id, value);
                updateOverallProgress();
              },
              { signal: controller.signal, onAssetCreated: (asset) => { createdAssetIds.add(asset.id); } },
            );
          } catch (error) {
            const checkpoint = (error as { managedUploadCheckpoint?: { asset: { id: string }; result: { secureUrl: string; publicId: string; thumbnailUrl?: string | null; cloudName?: string } } } | null)?.managedUploadCheckpoint;
            if (checkpoint) {
              const completed: PendingMomentUploadedFile = {
                fileId: file.id,
                assetId: checkpoint.asset.id,
                media: {
                  id: checkpoint.asset.id,
                  type: file.type,
                  secureUrl: checkpoint.result.secureUrl,
                  publicId: checkpoint.result.publicId,
                  thumbnailUrl: checkpoint.result.thumbnailUrl || undefined,
                  width: file.width ?? undefined,
                  height: file.height ?? undefined,
                  duration: file.duration ?? undefined,
                },
                metadataSynced: false,
                cloudName: checkpoint.result.cloudName,
              };
              completedByFile.set(file.id, completed);
              media[index] = completed.media;
              progressById.set(file.id, 100);
              patch(task.localId, { uploadedFiles: [...completedByFile.values()] });
            }
            // Successful sibling/provider uploads stay attached to this pending task so retry can resume.
            throw Object.assign(error instanceof Error ? error : new Error(String(error)), { __momentStage: "upload" as const });
          }

          const completed: PendingMomentUploadedFile = {
            fileId: file.id,
            assetId: uploaded.asset.id,
            media: {
              id: uploaded.asset.id,
              type: file.type,
              secureUrl: uploaded.result.secureUrl,
              publicId: uploaded.result.publicId,
              thumbnailUrl: uploaded.result.thumbnailUrl || undefined,
              width: file.width ?? undefined,
              height: file.height ?? undefined,
              duration: file.duration ?? undefined,
            },
            metadataSynced: true,
            cloudName: uploaded.result.cloudName,
          };
          completedByFile.set(file.id, completed);
          throwIfCancelled();
          media[index] = completed.media;
          progressById.set(file.id, 100);
          patch(task.localId, { uploadedFiles: [...completedByFile.values()] });
          updateOverallProgress();
        }
      };

      if (workerCount > 0) {
        // Wait for every bounded worker to settle before this family task finishes.
        // Otherwise a sibling upload could keep running after the first worker fails
        // while the queue already starts publishing to another family.
        const settled = await Promise.allSettled(Array.from({ length: workerCount }, () => worker()));
        const failed = settled.find((item): item is PromiseRejectedResult => item.status === "rejected");
        if (failed) throw failed.reason;
      }

      throwIfCancelled();
      // If Cloudinary succeeded earlier but the media_assets metadata write failed,
      // repair that small Firestore record first. The binary is not uploaded twice.
      for (const uploadedFile of completedByFile.values()) {
        throwIfCancelled();
        if (uploadedFile.metadataSynced) continue;
        try {
          const verified = await momentMediaApi.confirmUpload(uploadedFile.assetId);
          if (verified.publicId !== uploadedFile.media.publicId ||
              verified.secureUrl !== uploadedFile.media.secureUrl ||
              verified.resourceType !== uploadedFile.media.type) {
            throw new Error("MOMENT_MEDIA_IDENTITY_MISMATCH");
          }
          await mediaService.setUploaded(uploadedFile.assetId, {
            secureUrl: uploadedFile.media.secureUrl,
            publicId: uploadedFile.media.publicId,
            thumbnailUrl: uploadedFile.media.thumbnailUrl ?? "",
            resourceType: uploadedFile.media.type,
          });
          uploadedFile.metadataSynced = true;
          patch(task.localId, { uploadedFiles: [...completedByFile.values()] });
        } catch (error) {
          throw Object.assign(error instanceof Error ? error : new Error(String(error)), { __momentStage: "upload" as const });
        }
      }

      throwIfCancelled();
      setPendingMomentProgress(task.localId, 100);
      toast("publishing", 100);
      const desired={id:task.postId,familyId:task.familyId,authorUid:task.author.uid,caption:task.caption.trim(),richBody:task.richBody??null,media:media.filter(Boolean),mediaAssetIds:media.filter(Boolean).map(m=>m.id),personIds:[...new Set(task.personIds.map(x=>x.trim()).filter(Boolean))].slice(0,24),timelineAudience:task.timelineAudience,notifyFamily:task.timelineAudience==='family'&&task.notifyFamily};
      // Enter the non-cancellable commit phase before awaiting the durable checkpoint.
      publishAttempted=true;
      patch(task.localId, { status: "publishing", publishAttempted:true, progress: 100, uploadedFiles: [...completedByFile.values()] });
      if(nativeRecoveryEnabled){if(getAuth().currentUser?.uid!==task.author.uid)throw Error('AUTH_CHANGED');journalRecord=await nativeJournal.mark(desired);if(getAuth().currentUser?.uid!==task.author.uid)throw Error('AUTH_CHANGED');}
      try {
        const post = await momentsService.publishWithAssets(
          task.familyId,
          task.postId,
          task.author,
          {
            caption: task.caption,
            richBody: task.richBody ?? null,
            media: media.filter(Boolean),
            personIds: task.personIds,
            timelineAudience: task.timelineAudience,
            notifyFamily: task.timelineAudience === "family" && task.notifyFamily,
          },
          desired.mediaAssetIds,
        );
        // Activity is metadata only. A notification failure must never roll back a published family memory.
        // Target Person/account projections can settle a beat after the Moment write on a real device.
        // Retry idempotently with the same deterministic activity id so tagged people do not miss their badge.
        const publishActivity = (attempt = 0) => {
          void activityService.createForMoment(post).catch(() => {
            const retryDelays = [900, 2400];
            const delay = retryDelays[attempt];
            if (delay == null) return;
            setTimeout(() => publishActivity(attempt + 1), delay);
          });
        };
        publishActivity();
        if(journalRecord&&nativeJournal.matches(journalRecord,post))await nativeJournal.clear(journalRecord,true).catch(()=>false);
      } catch (error) {
        throw Object.assign(error instanceof Error ? error : new Error(String(error)), { __momentStage: "publish" as const });
      }

      momentUploadToastStore.clear(task.localId);
      setPendingMomentProgress(task.localId, 100);
      patch(task.localId, { status: "published", progress: 100, failureStage: undefined });
      finishTask({ title: "Khoảnh khắc đã được chia sẻ 🌷", message: "Đã đăng xong vào trang Kỷ niệm." });
    } catch (error) {
      if (wasCancelled()&&!publishAttempted) {
        // Aborted requests may still have arrived at Cloudinary. Queue every
        // created media_assets record for privileged reconciliation first.
        const allIds = [...new Set([
          ...createdAssetIds, ...[...completedByFile.values()].map((entry) => entry.assetId),
        ])];
        patch(task.localId, { status: "cancelling", uploadedFiles: [...completedByFile.values()] });
        toast("cancelling", 0);
        const markPending = Promise.allSettled(allIds.map((id) => mediaService.markCleanupPending(id)));
        // Firestore offline writes can remain unresolved until reconnection.
        // They are queued locally; the HỦY UI must not freeze on network loss.
        await Promise.race([markPending, new Promise<void>((resolve) => setTimeout(resolve, 1800))]);
        // Preserve provider bytes. The server queues a review request, not deletion.
        if (momentMediaApi.configured && allIds.length) {
          void momentMediaApi.requestCleanup(allIds).catch(() => undefined);
        }
        setPendingMoments((current) => {
          const next = current.filter((item) => item.localId !== task.localId);
          pendingRef.current = next;
          return next;
        });
        clearPendingMomentProgress(task.localId);
        momentUploadToastStore.clear(task.localId);
        finishTask({ title: "Đã hủy khoảnh khắc", message: "Bài chưa được đăng. Tệp chưa dùng được giữ để máy chủ kiểm kê." });
      } else {
        momentUploadToastStore.clear(task.localId);
        const stage:PendingMomentFailureStage = publishAttempted?"publish":((error as { __momentStage?: PendingMomentFailureStage } | null)?.__momentStage) ?? "upload";
        // Keep the stage-specific reason visible on the failed card rather than
        // replacing all failures with a generic "network" toast.
        recordMomentUploadFailure(error, stage);
        const safeReason = momentUploadErrorMessage(error, stage);
        patch(task.localId, {
          status: "failed", uploadedFiles: [...completedByFile.values()],
          error: safeReason, failureStage: stage, publishAttempted,
        });
        failTask(error, {
          title: "Khoảnh khắc chưa đăng được",
          message: safeReason,
        });
      }
    } finally {
      abortRef.current.delete(task.localId);
      runningRef.current.delete(task.localId);
      progressRenderRef.current.delete(task.localId);
      cancelledRef.current.delete(task.localId);
    }
  }, [failTask, finishTask, patch]);

  const drainQueue = useCallback(async () => {
    if (queueDrainingRef.current) return;
    queueDrainingRef.current = true;
    try {
      // One Moment task at a time. A task can still use its bounded 1–2 media workers,
      // but sharing to B/C never multiplies that concurrency by the number of houses.
      while (queueRef.current.length) {
        const next = queueRef.current.shift();
        if (!next) continue;
        await execute(next);
      }
    } finally {
      queueDrainingRef.current = false;
    }
  }, [execute]);

  const enqueue = useCallback((task: PendingMoment) => {
    if (runningRef.current.has(task.localId) || queueRef.current.some((item) => item.localId === task.localId)) return;
    queueRef.current.push(task);
    void drainQueue();
  }, [drainQueue]);

  const publishMoment = useCallback((input: PublishMomentInput) => {
    const targetFamilyIds = normalizeMomentTargetFamilyIds(input.familyId, input.additionalFamilyIds);
    const tasks: PendingMoment[] = targetFamilyIds.map((familyId) => ({
      localId: makeLocalId(),
      postId: momentsService.reserveId(familyId),
      familyId,
      author: { ...input.author },
      caption: input.caption,
      richBody: input.richBody ?? null,
      // FamilyPerson ids are not portable across houses. Secondary copies start unlinked.
      personIds: familyId === input.familyId ? [...input.personIds] : [],
      timelineAudience: familyId === input.familyId ? input.timelineAudience : "self",
      notifyFamily: familyId === input.familyId && input.timelineAudience === "family" && input.notifyFamily === true,
      files: input.files.map((file) => ({ ...file })),
      uploadedFiles: [],
      status: "queued",
      progress: 0,
      createdAt: new Date().toISOString(),
    }));

    tasks.forEach((task) => setPendingMomentProgress(task.localId, task.progress));
    pendingRef.current = [...tasks, ...pendingRef.current];
    setPendingMoments((current) => [...tasks, ...current]);
    if (!momentUploadToastStore.getSnapshot() && tasks[0]) {
      momentUploadToastStore.set({ localId: tasks[0].localId, status: "queued", progress: 0,
        thumbnailUri: tasks[0].files[0]?.uri, video: tasks[0].files[0]?.type === "video" });
    }
    tasks.forEach(enqueue);
    return tasks[0]?.localId ?? "";
  }, [enqueue]);

  const cancelMoment = useCallback((localId: string) => {
    const task = pendingRef.current.find((item) => item.localId === localId)
      ?? queueRef.current.find((item) => item.localId === localId);
    if (!task || task.status === "published" || task.status === "publishing" || task.status === "cancelling" || task.publishAttempted || task.failureStage === "publish") return;
    cancelledRef.current.add(localId);
    abortRef.current.get(localId)?.abort();
    queueRef.current = queueRef.current.filter((item) => item.localId !== localId);
    patch(localId, { status: "cancelling" });
    const existingToast = momentUploadToastStore.getSnapshot();
    if (!existingToast || existingToast.localId === localId) {
      momentUploadToastStore.set({ localId, status: "cancelling", progress: 0,
        thumbnailUri: task.files[0]?.uri, video: task.files[0]?.type === "video" });
    }
    if (!runningRef.current.has(localId)) {
      // Nothing was transferred yet; queued cancellation needs no server work.
      setPendingMoments((current) => {
        const next = current.filter((item) => item.localId !== localId);
        pendingRef.current = next;
        return next;
      });
      clearPendingMomentProgress(localId);
      momentUploadToastStore.clear(localId);
      cancelledRef.current.delete(localId);
      finishTask({ title: "Đã hủy khoảnh khắc", message: "Chưa có tệp nào được tải lên." });
    }
  }, [finishTask, patch]);

  const retryMoment = useCallback((localId: string) => {
    const task = pendingRef.current.find((item) => item.localId === localId);
    if (!task || task.status !== "failed") return;
    const progress = momentResumeProgress(task.files.length, task.uploadedFiles.length);
    const resumed = { ...task, status: "queued" as const, progress, error: undefined, failureStage: undefined };
    setPendingMomentProgress(localId, progress);
    setPendingMoments((current) => {
      const next = current.map((item) => item.localId === localId ? resumed : item);
      pendingRef.current = next;
      return next;
    });
    enqueue(resumed);
  }, [enqueue]);

  // If the app was backgrounded while the network was unavailable, retry failed
  // Moment jobs once when the user comes back. Successful upload checkpoints are
  // reused, so this resumes missing work instead of starting from zero.
  useEffect(() => {
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        if (resumeTimer) clearTimeout(resumeTimer);
        resumeTimer = null;
        return;
      }
      // Android can report ACTIVE a beat before Wi-Fi/mobile data is usable again.
      // A short grace period avoids immediately failing the same resumable job while
      // the radio is still reconnecting. Manual “Thử lại” remains immediate.
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        resumeTimer = null;
        const resumedTasks = pendingRef.current
          .filter((item) => item.status === "failed")
          .map((item) => ({
            ...item,
            status: "queued" as const,
            progress: momentResumeProgress(item.files.length, item.uploadedFiles.length),
            error: undefined,
            failureStage: undefined,
          }));
        if (!resumedTasks.length) return;
        resumedTasks.forEach((item) => setPendingMomentProgress(item.localId, item.progress));
        const byId = new Map(resumedTasks.map((item) => [item.localId, item]));
        setPendingMoments((current) => {
          const next = current.map((item) => byId.get(item.localId) ?? item);
          pendingRef.current = next;
          return next;
        });
        resumedTasks.forEach(enqueue);
      }, 900);
    });
    return () => {
      if (resumeTimer) clearTimeout(resumeTimer);
      subscription.remove();
    };
  }, [enqueue]);

  const removePendingMoment = useCallback((localId: string) => {
    if (runningRef.current.has(localId) || pendingRef.current.some(item=>item.localId===localId&&(item.publishAttempted||item.failureStage==='publish'))) return;
    queueRef.current = queueRef.current.filter((item) => item.localId !== localId);
    setPendingMoments((current) => {
      const item = current.find((candidate) => candidate.localId === localId);
      if (item?.uploadedFiles.length) {
        const ids = item.uploadedFiles.map((upload) => upload.assetId);
        void mediaService.markCleanupPendingMany(ids).catch(() => undefined);
        // No direct deletion, even for an explicitly abandoned upload.
        if (momentMediaApi.configured) void momentMediaApi.requestCleanup(ids).catch(() => undefined);
      }
      clearPendingMomentProgress(localId);
      return current.filter((candidate) => candidate.localId !== localId);
    });
  }, []);

  const reconcilePublished = useCallback((familyId: string, posts: MomentPost[]) => {
    if (!familyId || posts.length === 0) return;

    const published = new Map(posts.map(post=>[post.id,post]));
    setPendingMoments((current) => {
      let changed = false;
      const next = current.filter((item) => {
        const live=published.get(item.postId);
        const media=item.files.map(file=>item.uploadedFiles.find(upload=>upload.fileId===file.id)?.media);
        const desired={id:item.postId,familyId:item.familyId,authorUid:item.author.uid,caption:item.caption.trim(),richBody:item.richBody,media,mediaAssetIds:media.map(m=>m?.id),personIds:[...new Set(item.personIds.map(x=>x.trim()).filter(Boolean))].slice(0,24),timelineAudience:item.timelineAudience,notifyFamily:item.timelineAudience==='family'&&item.notifyFamily};
        const shouldRemove = item.familyId === familyId && (item.status==='published'||item.failureStage==='publish') && matchesPublishedMoment(live,desired);
        if (shouldRemove) {
          changed = true;
          clearPendingMomentProgress(item.localId);
        }
        return !shouldRemove;
      });
      if(changed)pendingRef.current=next;
      return changed ? next : current;
    });
  }, []);

  const checkUnconfirmedPublications=useCallback(async(uid:string,familyId:string)=>{
    if(!nativeRecoveryEnabled||getAuth().currentUser?.uid!==uid)return {confirmed:0,unresolved:0};
    const records=await nativeJournal.list(uid,familyId);let confirmed=0;
    for(const record of records){if(getAuth().currentUser?.uid!==uid)throw Error('AUTH_CHANGED');try{const post=await momentsService.getByIdFromServer(familyId,record.postId);if(getAuth().currentUser?.uid!==uid)throw Error('AUTH_CHANGED');if(nativeJournal.matches(record,post)&&await nativeJournal.clear(record,true))confirmed++;}catch{/* Never infer a failed write from an unavailable server. */}}
    return {confirmed,unresolved:records.length-confirmed};
  },[]);
  const failedPendingSignature = useMemo(
    () => pendingMoments
      .filter((item) => item.status === "failed")
      .map((item) => `${item.localId}:${item.familyId}:${item.failureStage ?? ""}:${item.uploadedFiles.length}:${item.error ?? ""}`)
      .join("|"),
    [pendingMoments],
  );
  // Deliberately keyed by the failed-only signature rather than pendingMoments.
  // Internal queued/uploading/publishing checkpoints can re-render this provider,
  // but the Context value remains referentially stable and Moments does not re-render.
  const failedPendingMoments = useMemo(
    () => pendingMoments.filter((item) => item.status === "failed"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [failedPendingSignature],
  );

  const value = useMemo(
    () => ({ failedPendingMoments, publishMoment, retryMoment, removePendingMoment, cancelMoment, reconcilePublished, checkUnconfirmedPublications }),
    [failedPendingMoments, publishMoment, retryMoment, removePendingMoment, cancelMoment, reconcilePublished, checkUnconfirmedPublications],
  );

  return <MomentPublishContext.Provider value={value}>{children}</MomentPublishContext.Provider>;
}
