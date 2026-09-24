import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useBloomTaskToast } from "../hooks/useBloomTaskToast";
import { mediaService } from "../services/media/mediaService";
import { momentsService } from "../services/moments/momentsService";
import type { MediaFile } from "../types";
import type { MomentMedia } from "../types/moments";

export type PendingMomentStatus = "queued" | "uploading" | "publishing" | "published" | "failed";

export interface PendingMoment {
  localId: string;
  postId: string;
  familyId: string;
  author: { uid: string; displayName: string; avatarUrl?: string };
  caption: string;
  personIds: string[];
  files: MediaFile[];
  status: PendingMomentStatus;
  progress: number;
  createdAt: string;
  error?: string;
}

interface PublishMomentInput {
  familyId: string;
  author: PendingMoment["author"];
  caption: string;
  personIds: string[];
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
  const runningRef = useRef(new Set<string>());
  const progressRenderRef = useRef(new Map<string, { lastValue: number; lastAt: number }>());
  const { startTask, finishTask, failTask } = useBloomTaskToast();

  const patch = useCallback((localId: string, updates: Partial<PendingMoment>) => {
    setPendingMoments((current) => current.map((item) => item.localId === localId ? { ...item, ...updates } : item));
  }, []);

  const execute = useCallback(async (task: PendingMoment) => {
    if (runningRef.current.has(task.localId)) return;
    runningRef.current.add(task.localId);
    progressRenderRef.current.set(task.localId, { lastValue: 0, lastAt: 0 });
    patch(task.localId, { status: task.files.length ? "uploading" : "publishing", progress: task.files.length ? 0 : 100, error: undefined });
    startTask({ title: "Bloom đang giữ lại khoảnh khắc…", message: task.caption.trim() || `${task.files.length} ảnh / video` });

    const uploadedAssetIds: string[] = [];
    try {
      const media = new Array<MomentMedia>(task.files.length);
      const progressById = new Map(task.files.map((file) => [file.id, 0]));
      let nextIndex = 0;
      const workerCount = task.files.some((file) => file.type === "video") ? Math.min(1, task.files.length) : Math.min(2, task.files.length);

      const updateOverallProgress = () => {
        if (!task.files.length) return;
        const total = Array.from(progressById.values()).reduce((sum, value) => sum + value, 0);
        const nextProgress = Math.max(1, Math.min(99, Math.round(total / task.files.length)));
        const nowMs = Date.now();
        const previous = progressRenderRef.current.get(task.localId) ?? { lastValue: 0, lastAt: 0 };

        // Upload callbacks can arrive dozens of times each second. The provider sits
        // above the Moments screen, so every state patch can otherwise make FlatList
        // reconcile while the user is scrolling. Cap visual progress updates to a
        // coarse 4% / ~140ms cadence. Upload itself remains full-speed and untouched.
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
          const { asset, result } = await mediaService.uploadManaged(
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
          uploadedAssetIds.push(asset.id);
          progressById.set(file.id, 100);
          updateOverallProgress();
          media[index] = {
            id: asset.id,
            type: file.type,
            secureUrl: result.secureUrl,
            publicId: result.publicId,
            thumbnailUrl: result.thumbnailUrl || undefined,
            width: file.width ?? undefined,
            height: file.height ?? undefined,
            duration: file.duration ?? undefined,
          };
        }
      };

      if (workerCount > 0) await Promise.all(Array.from({ length: workerCount }, () => worker()));

      patch(task.localId, { status: "publishing", progress: 100 });
      await momentsService.publishWithAssets(
        task.familyId,
        task.postId,
        task.author,
        { caption: task.caption, media: media.filter(Boolean), personIds: task.personIds },
        uploadedAssetIds,
      );

      patch(task.localId, { status: "published", progress: 100 });
      finishTask({ title: "Khoảnh khắc đã được chia sẻ 🌸", message: task.caption.trim() || "Cả nhà có thêm một điều để nhớ." });
    } catch (error) {
      try {
        await mediaService.markCleanupPendingMany(uploadedAssetIds);
      } catch {
        // Keep the original publish error. cleanup_pending is best-effort here.
      }
      patch(task.localId, {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
      failTask(error, { title: "Khoảnh khắc chưa đăng được", message: "Bạn có thể thử lại ngay trên bài đang chờ." });
    } finally {
      runningRef.current.delete(task.localId);
      progressRenderRef.current.delete(task.localId);
    }
  }, [failTask, finishTask, patch, startTask]);

  const publishMoment = useCallback((input: PublishMomentInput) => {
    const localId = makeLocalId();
    const postId = momentsService.reserveId(input.familyId);
    const task: PendingMoment = {
      localId,
      postId,
      familyId: input.familyId,
      author: { ...input.author },
      caption: input.caption,
      personIds: [...input.personIds],
      files: input.files.map((file) => ({ ...file })),
      status: "queued",
      progress: 0,
      createdAt: new Date().toISOString(),
    };
    setPendingMoments((current) => [task, ...current]);
    void execute(task);
    return localId;
  }, [execute]);

  const retryMoment = useCallback((localId: string) => {
    const task = pendingMoments.find((item) => item.localId === localId);
    if (!task || task.status !== "failed") return;
    void execute({ ...task, status: "queued", progress: 0, error: undefined });
  }, [execute, pendingMoments]);

  const removePendingMoment = useCallback((localId: string) => {
    if (runningRef.current.has(localId)) return;
    setPendingMoments((current) => current.filter((item) => item.localId !== localId));
  }, []);

  const reconcilePublished = useCallback((familyId: string, postIds: string[]) => {
    if (!familyId || postIds.length === 0) return;

    const published = new Set(postIds);
    // Realtime can deliver the real post before execute() flips the local task
    // to `published`. Reconcile by reserved postId, but preserve the SAME state
    // reference when nothing matched. Returning a fresh array on every effect
    // pass would trigger another render and can create an update-depth loop.
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
