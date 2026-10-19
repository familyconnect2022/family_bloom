export type MediaType = "image" | "video";
export type MediaPurpose = "avatar" | "event" | "calendar" | "moment" | "album" | "document" | "chat";
export type MediaStatus = "uploading" | "uploaded" | "attached" | "failed" | "cleanup_pending";
export type MediaEntityType = "user" | "person" | "event" | "calendar" | "moment" | "album" | "document" | "chat";
export type MediaProvider = "cloudinary";

export interface MediaFile {
  id: string;
  uri: string;
  type: MediaType;
  mimeType: string;
  fileName: string;
  /** Picker metadata only; never required by upload/storage contracts. */
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  /** Business purpose; Cloudinary preset is still selected by image/video type. */
  purpose?: MediaPurpose;
}

export interface MediaUploadContext {
  ownerUid: string;
  familyId: string | null;
  purpose: MediaPurpose;
  entityType: MediaEntityType;
  entityId: string;
  category: "users" | "members" | "persons" | "albums" | "moments" | "events" | "documents";
}

export interface UploadResult {
  secureUrl: string;
  publicId: string;
  thumbnailUrl: string;
  resourceType: MediaType;
}

/** Durable lifecycle record independent of the Cloudinary provider. */
export interface MediaAsset {
  id: string;
  ownerUid: string;
  familyId: string | null;
  purpose: MediaPurpose;
  entityType: MediaEntityType;
  entityId: string;
  provider: MediaProvider;
  type: MediaType;
  secureUrl: string | null;
  publicId: string | null;
  thumbnailUrl: string | null;
  mimeType: string;
  fileName: string;
  status: MediaStatus;
  createdAt: string;
  updatedAt: string;
}
