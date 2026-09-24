import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { APP_CATEGORIES, AppCategory } from "../constants/appPaths";
import { mediaService } from "../services/media/mediaService";
import { MediaFile, UploadResult } from "../types";

export type UploadStatus = "queued" | "uploading" | "uploaded" | "failed";
export interface UploadQueueItem extends MediaFile { status: UploadStatus; progress: number; result?: UploadResult; error?: string; }
export interface UploadResultItem extends UploadResult { id: string; success: boolean; error?: string; }

export const useMediaUpload = () => {
  const [queue, setQueue] = useState<Record<string, UploadQueueItem>>({});
  const updateQueueItem = useCallback((id: string, updates: Partial<UploadQueueItem>) => {
    setQueue((prev) => prev[id] ? { ...prev, [id]: { ...prev[id], ...updates } } : prev);
  }, []);

  const handleSelectAvatar = useCallback(async (onChangeAvatar: (selectedUri: string) => void) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Cần cấp quyền 🌸", "Bloom cần quyền truy cập thư viện ảnh để chọn avatar nhé!");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets[0]?.uri) onChangeAvatar(result.assets[0].uri);
  }, []);

  const uploadSingleFile = useCallback(async (file: MediaFile, category: AppCategory, familyId: string): Promise<UploadResult> => {
    updateQueueItem(file.id, { status: "uploading", progress: 0 });
    let lastProgress = -1;
    try {
      const result = await mediaService.upload(file, category, familyId, (progress) => {
        if (progress < 100 && lastProgress >= 0 && progress - lastProgress < 2) return;
        lastProgress = progress;
        updateQueueItem(file.id, { progress });
      });
      updateQueueItem(file.id, { status: "uploaded", progress: 100, result });
      return result;
    } catch (error) {
      updateQueueItem(file.id, { status: "failed", error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }, [updateQueueItem]);

  const uploadMediaList = useCallback(async (files: MediaFile[], category: AppCategory, familyId: string): Promise<UploadResultItem[]> => {
    const initial = Object.fromEntries(files.map((file) => [file.id, { ...file, status: "queued" as const, progress: 0 }]));
    setQueue((prev) => ({ ...prev, ...initial }));

    // Never start every image/video upload at once. Mixed high-resolution images +
    // videos can otherwise create a native memory/network spike and trigger Android ANR.
    const results = new Array<UploadResultItem>(files.length);
    let nextIndex = 0;
    // Video multipart bodies are much heavier than image uploads on Android.
    // Keep mixed/video batches strictly sequential; image-only batches may use 2 workers.
    const workerCount = files.some((file) => file.type === "video")
      ? Math.min(1, files.length)
      : Math.min(2, files.length);

    const worker = async () => {
      while (true) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= files.length) return;

        const file = files[index];
        try {
          const result = await uploadSingleFile(file, category, familyId);
          results[index] = {
            id: file.id,
            success: true,
            ...result,
          };
        } catch (error) {
          results[index] = {
            id: file.id,
            success: false,
            secureUrl: "",
            publicId: "",
            thumbnailUrl: "",
            resourceType: file.type,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    };

    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    return results;
  }, [uploadSingleFile]);

  return {
    queue,
    uploadMediaList,
    uploadSingleFile,
    handleSelectAvatar,
    APP_CATEGORIES,
  };
};
