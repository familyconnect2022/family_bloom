import { ENV } from "../config/env";
import type { MediaEntityType, MediaPurpose } from "../types/media";

export const APP_CONFIG = {
  CLOUDINARY: ENV.cloudinary,
  BASE_FOLDER: "family_bloom",
} as const;

export const APP_CATEGORIES = {
  USERS: "users",
  MEMBERS: "members",
  PERSONS: "persons",
  ALBUMS: "albums",
  MOMENTS: "moments",
  EVENTS: "events",
  DOCUMENTS: "documents",
} as const;

export type AppCategory = (typeof APP_CATEGORIES)[keyof typeof APP_CATEGORIES];

export interface MediaFolderContext {
  ownerUid: string;
  familyId: string | null;
  purpose: MediaPurpose;
  entityType: MediaEntityType;
  entityId: string;
  category: AppCategory;
}

/**
 * Cloudinary namespace convention used by all Family Bloom media.
 *
 * User-owned avatar is not family-scoped because one user can belong to many
 * families. Family-owned media is always grouped under the familyId.
 */
export const getCloudinaryFolder = ({
  ownerUid,
  familyId,
  purpose,
  entityType,
  entityId,
  category,
}: MediaFolderContext): string => {
  if (entityType === "user" || category === APP_CATEGORIES.USERS) {
    return `${APP_CONFIG.BASE_FOLDER}/users/${ownerUid}/avatar`;
  }

  if (!familyId) {
    throw new Error("FAMILY_CONTEXT_REQUIRED");
  }

  if (entityType === "person" || category === APP_CATEGORIES.PERSONS) {
    return `${APP_CONFIG.BASE_FOLDER}/families/${familyId}/persons/${entityId}/${purpose}`;
  }

  return `${APP_CONFIG.BASE_FOLDER}/families/${familyId}/${category}`;
};
