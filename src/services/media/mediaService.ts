import {
  doc,
  getFirestore,
  setDoc,
  updateDoc,
  writeBatch,
} from "@react-native-firebase/firestore";
import { AppCategory } from "../../constants/appPaths";
import { FIRESTORE_PATHS } from "../firebase/firestorePaths";
import {
  MediaAsset,
  MediaFile,
  MediaPurpose,
  MediaUploadContext,
  UploadResult,
} from "../../types";
import { AppError } from "../../types/errors";
import { removeUndefinedDeep } from "../../utils/firestore";
import { cloudinaryService } from "./cloudinaryService";

const now = () => new Date().toISOString();
const makeId = (ownerUid: string) =>
  `${ownerUid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const toContext = (
  file: MediaFile,
  category: AppCategory,
  familyId: string | null,
): MediaUploadContext => ({
  ownerUid: "",
  familyId,
  purpose:
    file.purpose ??
    (category === "events"
      ? "event"
      : category === "moments"
        ? "moment"
        : category === "albums"
          ? "album"
          : category === "documents"
            ? "document"
            : "avatar"),
  entityType: category === "events"
    ? "event"
    : category === "moments"
      ? "moment"
      : category === "albums"
        ? "album"
        : category === "documents"
          ? "document"
          : category === "persons"
            ? "person"
            : "user",
  entityId: file.id,
  category,
});

export const mediaService = {
  /**
   * Compatibility upload used by list-based media flows.
   * New durable flows should call uploadManaged() with a complete context.
   */
  upload(
    file: MediaFile,
    category: AppCategory,
    familyId: string,
    onProgress?: (value: number) => void,
  ): Promise<UploadResult> {
    const context = toContext(file, category, familyId);
    return cloudinaryService.upload(file, context, onProgress);
  },

  uploadImage(
    file: Omit<MediaFile, "type">,
    category: AppCategory,
    familyId: string | null,
    onProgress?: (value: number) => void,
    contextOverrides?: Partial<Omit<MediaUploadContext, "category">>,
  ): Promise<UploadResult> {
    const context = {
      ...toContext({ ...file, type: "image" }, category, familyId),
      ...contextOverrides,
      ownerUid: contextOverrides?.ownerUid ?? "",
      category,
    } as MediaUploadContext;
    return cloudinaryService.upload({ ...file, type: "image" }, context, onProgress);
  },

  uploadVideo(
    file: Omit<MediaFile, "type">,
    category: AppCategory,
    familyId: string | null,
    onProgress?: (value: number) => void,
    contextOverrides?: Partial<Omit<MediaUploadContext, "category">>,
  ): Promise<UploadResult> {
    const context = {
      ...toContext({ ...file, type: "video" }, category, familyId),
      ...contextOverrides,
      ownerUid: contextOverrides?.ownerUid ?? "",
      category,
    } as MediaUploadContext;
    return cloudinaryService.upload({ ...file, type: "video" }, context, onProgress);
  },

  async createUploadingAsset(
    ownerUid: string,
    familyId: string | null,
    purpose: MediaPurpose,
    entityType: MediaAsset["entityType"],
    entityId: string,
    file: MediaFile,
  ): Promise<MediaAsset> {
    const createdAt = now();
    const asset: MediaAsset = {
      id: makeId(ownerUid),
      ownerUid,
      familyId,
      purpose,
      entityType,
      entityId,
      provider: "cloudinary",
      type: file.type,
      secureUrl: null,
      publicId: null,
      thumbnailUrl: null,
      mimeType: file.mimeType,
      fileName: file.fileName,
      status: "uploading",
      createdAt,
      updatedAt: createdAt,
    };

    await setDoc(
      doc(getFirestore(), FIRESTORE_PATHS.mediaAsset(asset.id)),
      removeUndefinedDeep(asset),
    );
    return asset;
  },

  async setUploaded(assetId: string, result: UploadResult): Promise<void> {
    await updateDoc(
      doc(getFirestore(), FIRESTORE_PATHS.mediaAsset(assetId)),
      removeUndefinedDeep({
        secureUrl: result.secureUrl,
        publicId: result.publicId,
        thumbnailUrl: result.thumbnailUrl || null,
        status: "uploaded",
        updatedAt: now(),
      }),
    );
  },

  async markFailed(assetId: string): Promise<void> {
    await updateDoc(doc(getFirestore(), FIRESTORE_PATHS.mediaAsset(assetId)), {
      status: "failed",
      updatedAt: now(),
    });
  },

  async markCleanupPending(assetId: string): Promise<void> {
    await updateDoc(doc(getFirestore(), FIRESTORE_PATHS.mediaAsset(assetId)), {
      status: "cleanup_pending",
      updatedAt: now(),
    });
  },

  /**
   * Durable upload flow. It records the lifecycle in media_assets and converts
   * a provider failure into a cleanup/failed state instead of losing context.
   */
  async uploadManaged(
    file: MediaFile,
    context: MediaUploadContext,
    onProgress?: (value: number) => void,
  ): Promise<{ asset: MediaAsset; result: UploadResult }> {
    if (!context.ownerUid) {
      throw new AppError("PROFILE_NOT_FOUND", "PROFILE");
    }

    const asset = await this.createUploadingAsset(
      context.ownerUid,
      context.familyId,
      context.purpose,
      context.entityType,
      context.entityId,
      file,
    );

    let providerUploaded = false;
    try {
      const result = await cloudinaryService.upload(file, context, onProgress);
      providerUploaded = true;
      await this.setUploaded(asset.id, result);
      return { asset, result };
    } catch (error) {
      try {
        if (providerUploaded) await this.markCleanupPending(asset.id);
        else await this.markFailed(asset.id);
      } catch {
        // Preserve the original error; lifecycle record can be inspected later.
      }
      throw error;
    }
  },

  /**
   * Atomically publishes one document and attaches every durable media asset to it.
   * Kept generic so Moments / Events / Albums can share the exact same lifecycle.
   */
  async attachAssetsToDocument(
    assetIds: string[],
    documentPath: string,
    documentData: Record<string, unknown>,
  ): Promise<void> {
    const db = getFirestore();
    const batch = writeBatch(db);
    batch.set(doc(db, documentPath), removeUndefinedDeep(documentData), { merge: true });
    assetIds.forEach((assetId) => {
      batch.update(doc(db, FIRESTORE_PATHS.mediaAsset(assetId)), {
        status: "attached",
        updatedAt: now(),
      });
    });
    await batch.commit();
  },

  /** Marks already-uploaded assets for later cleanup when a multi-file publish cannot finish. */
  async markCleanupPendingMany(assetIds: string[]): Promise<void> {
    if (!assetIds.length) return;
    const db = getFirestore();
    const batch = writeBatch(db);
    assetIds.forEach((assetId) => {
      batch.update(doc(db, FIRESTORE_PATHS.mediaAsset(assetId)), {
        status: "cleanup_pending",
        updatedAt: now(),
      });
    });
    await batch.commit();
  },

  /** Atomically attaches a durable asset to a document and marks it attached. */
  async attachToDocument(
    assetId: string,
    documentPath: string,
    documentData: Record<string, unknown>,
  ): Promise<void> {
    const db = getFirestore();
    const batch = writeBatch(db);
    batch.set(doc(db, documentPath), removeUndefinedDeep(documentData), { merge: true });
    batch.update(doc(db, FIRESTORE_PATHS.mediaAsset(assetId)), {
      status: "attached",
      updatedAt: now(),
    });
    await batch.commit();
  },
};
