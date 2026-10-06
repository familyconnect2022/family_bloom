import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { useBloomTaskToast } from "../hooks/ui/useBloomTaskToast";
import { mediaService } from "../services/media/mediaService";
import { activityService } from "../services/activity/activityService";
import { momentsService } from "../services/moments/momentsService";
import type { MediaFile } from "../types";
import type { MomentMedia } from "../types/moments";
import { momentResumeProgress, normalizeMomentTargetFamilyIds } from "../utils/momentPublishPolicy";

export type PendingMomentStatus = "queued" | "uploading" | "publishing" | "published" | "failed";
export type PendingMomentFailureStage = "upload" | "publish";

export interface PendingMomentUploadedFile {
  fileId: string;
  assetId: string;
  media: MomentMedia;
  /** False only when Cloudinary succeeded but media_assets metadata could not sync yet. */
  metadataSynced: boolean;
}

export interface PendingMoment {
  localId: string;
  postId: string;
  familyId: string;
  author: { uid: string; displayName: string; avatarUrl?: string };
  caption: string;
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
}

interface PublishMomentInput {
  familyId: string;
  /** Additional houses explicitly selected by the user. Current house is always included. */
  additionalFamilyIds?: string[];
  author: PendingMoment["author"];
  caption: string;
  /** Person ids are family-scoped, so these only apply to the current/source family. */
  personIds: string[];
  timelineAudience: "self" | "family" | "persons";
  notifyFamily: boolean;
  files: MediaFile[];
}

interface MomentPublishContextValue {
  pendingMoments: PendingMoment[];
  publishMoment: (input: PublishMomentInput) => string;
  retryMoment: (localId: string) => void;
  removePendingMoment: (localId: string) => void;
  reconcilePublished: (familyId: string, postIds: string[]) => void;
}

const MomentPublishContext = createContext<MomentPublishContextValue | null>(null);

export const useMomentPublish = () => {
  const value = useContext(MomentPublishContext);
  if (!value) throw new Error("useMomentPublish phải được bọc trong MomentPublishProvider");
  return value;
};

const makeLocalId = () => `moment-local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function MomentPublishProvider({ children }: { children: React.ReactNode }) {
  const [pendingMoments, setPendingMoments] = useState<PendingMoment[]>([]);
  const pendingRef = useRef<PendingMoment[]>([]);
  const runningRef = useRef(new Set<string>());
  const queueRef = useRef<PendingMoment[]>([]);
  const queueDrainingRef = useRef(false);
  const progressRenderRef = useRef(new Map<string, { lastValue: number; lastAt: number }>());
  const { startTask, finishTask, failTask } = useBloomTaskToast();

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
    progressRenderRef.current.set(task.localId, { lastValue: momentResumeProgress(task.files.length, task.uploadedFiles.length), lastAt: 0 });

    const completedByFile = new Map(task.uploadedFiles.map((item) => [item.fileId, item]));
    const initialProgress = momentResumeProgress(task.files.length, completedByFile.size);
    patch(task.localId, {
      status: completedByFile.size < task.files.length ? "uploading" : "publishing",
      progress: initialProgress,
      error: undefined,
      failureStage: undefined,
    });
    startTask({ title: "Đang đăng kỷ niệm…", message: task.caption.trim() || (task.files.length ? "Ảnh và video đang được chuẩn bị." : "Bloom đang lưu câu chuyện của bạn.") });

    try {
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
        const advancedEnough = nextProgress - previous.lastValue >= 4;
        const waitedEnough = nowMs - previous.lastAt >= 140;
        if (nextProgress < 99 && !advancedEnough && !waitedEnough) return;

        progressRenderRef.current.set(task.localId, { lastValue: nextProgress, lastAt: nowMs });
        patch(task.localId, { progress: nextProgress });
      };

      const worker = async () => {
        while (true) {
          const index = nextIndex++;
          if (index >= task.files.length) return;
          const file = task.files[index];
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
                progressById.set(file.id, value);
                updateOverallProgress();
              },
            );
          } catch (error) {
            const checkpoint = (error as { managedUploadCheckpoint?: { asset: { id: string }; result: { secureUrl: string; publicId: string; thumbnailUrl?: string | null } } } | null)?.managedUploadCheckpoint;
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
          };
          completedByFile.set(file.id, completed);
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

      // If Cloudinary succeeded earlier but the media_assets metadata write failed,
      // repair that small Firestore record first. The binary is not uploaded twice.
      for (const uploadedFile of completedByFile.values()) {
        if (uploadedFile.metadataSynced) continue;
        try {
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

      patch(task.localId, { status: "publishing", progress: 100, uploadedFiles: [...completedByFile.values()] });
      try {
        const post = await momentsService.publishWithAssets(
          task.familyId,
          task.postId,
          task.author,
          {
            caption: task.caption,
            media: media.filter(Boolean),
            personIds: task.personIds,
            timelineAudience: task.timelineAudience,
            notifyFamily: task.timelineAudience === "family" && task.notifyFamily,
          },
          [...completedByFile.values()].map((item) => item.assetId),
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
      } catch (error) {
        throw Object.assign(error instanceof Error ? error : new Error(String(error)), { __momentStage: "publish" as const });
      }

      patch(task.localId, { status: "published", progress: 100, failureStage: undefined });
      finishTask({ title: "Khoảnh khắc đã được chia sẻ 🌸", message: task.caption.trim() || "Cả nhà có thêm một điều để nhớ." });
    } catch (error) {
      const stage = ((error as { __momentStage?: PendingMomentFailureStage } | null)?.__momentStage) ?? "upload";
      // Do NOT mark successful uploads cleanup_pending here. They are the resumable checkpoint.
      // Cleanup only happens if the user explicitly discards the pending Moment.
      patch(task.localId, {
        status: "failed",
        uploadedFiles: [...completedByFile.values()],
        error: error instanceof Error ? error.message : String(error),
        failureStage: stage,
      });
      failTask(error, {
        title: "Khoảnh khắc chưa đăng được",
        message: stage === "publish"
          ? "Ảnh và video đã được giữ lại. Bạn chỉ cần thử đăng lại."
          : "Những phần đã hoàn tất vẫn được giữ lại. Hãy thử lại khi kết nối ổn định.",
      });
    } finally {
      runningRef.current.delete(task.localId);
      progressRenderRef.current.delete(task.localId);
    }
  }, [failTask, finishTask, patch, startTask]);

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

    setPendingMoments((current) => [...tasks, ...current]);
    tasks.forEach(enqueue);
    return tasks[0]?.localId ?? "";
  }, [enqueue]);

  const retryMoment = useCallback((localId: string) => {
    const task = pendingRef.current.find((item) => item.localId === localId);
    if (!task || task.status !== "failed") return;
    const progress = momentResumeProgress(task.files.length, task.uploadedFiles.length);
    const resumed = { ...task, status: "queued" as const, progress, error: undefined, failureStage: undefined };
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
    if (runningRef.current.has(localId)) return;
    queueRef.current = queueRef.current.filter((item) => item.localId !== localId);
    setPendingMoments((current) => {
      const item = current.find((candidate) => candidate.localId === localId);
      if (item?.uploadedFiles.length) {
        void mediaService.markCleanupPendingMany(item.uploadedFiles.map((upload) => upload.assetId)).catch(() => undefined);
      }
      return current.filter((candidate) => candidate.localId !== localId);
    });
  }, []);

  const reconcilePublished = useCallback((familyId: string, postIds: string[]) => {
    if (!familyId || postIds.length === 0) return;

    const published = new Set(postIds);
    setPendingMoments((current) => {
      let changed = false;
      const next = current.filter((item) => {
        const shouldRemove = item.familyId === familyId && published.has(item.postId);
        if (shouldRemove) changed = true;
        return !shouldRemove;
      });
      return changed ? next : current;
    });
  }, []);

  const value = useMemo(() => ({ pendingMoments, publishMoment, retryMoment, removePendingMoment, reconcilePublished }), [pendingMoments, publishMoment, retryMoment, removePendingMoment, reconcilePublished]);

  return <MomentPublishContext.Provider value={value}>{children}</MomentPublishContext.Provider>;
}
