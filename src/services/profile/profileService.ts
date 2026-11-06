import { collection, doc, getDoc, getDocFromServer, getDocs, getFirestore, writeBatch, setDoc } from "@react-native-firebase/firestore";
import { FIRESTORE_PATHS } from "../firebase/firestorePaths";
import { CreateProfileInput, MediaFile, UserProfile, type SmartReminderPreferences, type MediaAsset, type UploadResult } from "../../types";
import { AppError } from "../../types/errors";
import { removeUndefinedDeep } from "../../utils/firestore";
import { normalizeUserProfile } from "../../utils/profile";
import { mediaService } from "../media/mediaService";
import { momentMediaApi } from "../media/momentMediaApi";

const nowIso = () => new Date().toISOString();
const safe = <T extends Record<string, unknown>>(input: T) => removeUndefinedDeep(input) as Partial<T>;

const familyVisible = (p: UserProfile) => safe({
  uid: p.uid, displayName: p.displayName, shortName: p.shortName, color: p.color,
  phoneNumber: p.phoneNumber, birthDate: p.birthDate, avatarUrl: p.avatarUrl, gender: p.gender,
  bio: p.bio, bloodType: p.bloodType, interests: p.interests, updatedAt: p.updatedAt,
});

const buildProfile = (uid: string, input: CreateProfileInput, now: string): UserProfile => normalizeUserProfile(safe({
  uid, displayName: input.displayName.trim(), shortName: input.shortName?.trim() || null,
  color: input.color, phoneNumber: input.phoneNumber, birthDate: input.birthDate,
  avatarUrl: input.avatarUrl, avatarPublicId: input.avatarPublicId, avatarAssetId: input.avatarAssetId, gender: input.gender ?? "other",
  currentLocation: input.currentLocation, hometown: input.hometown, occupation: input.occupation, bio: input.bio, bloodType: input.bloodType,
  interests: input.interests ?? input.hobbies ?? [], fcmTokens: input.fcmTokens ?? [],
  pushNotificationsEnabled: true,
  createdAt: now, updatedAt: now,
}) as Record<string, unknown>, uid);

const getProfile = async (uid: string): Promise<UserProfile | null> => {
  const snapshot = await getDoc(doc(getFirestore(), FIRESTORE_PATHS.user(uid)));
  return snapshot.exists() ? normalizeUserProfile(snapshot.data() as Record<string, unknown>, uid) : null;
};

/** A missing Profile unlocks Create Profile only when Firestore SERVER
 * confirms non-existence. The default getDoc() may fall back to stale/offline
 * cache and must not be used for first-login authorization decisions. */
const getAuthoritativeProfile = async (uid: string): Promise<UserProfile | null> => {
  const snapshot = await getDocFromServer(doc(getFirestore(), FIRESTORE_PATHS.user(uid)));
  return snapshot.exists() ? normalizeUserProfile(snapshot.data() as Record<string, unknown>, uid) : null;
};

const createProfile = async (uid: string, input: CreateProfileInput): Promise<UserProfile> => {
  const profile = buildProfile(uid, input, nowIso());
  try {
    await setDoc(doc(getFirestore(), FIRESTORE_PATHS.user(uid)), safe(profile as unknown as Record<string, unknown>));
    return profile;
  } catch (error) {
    throw new AppError("PROFILE_SAVE_FAILED", "PROFILE", undefined, { cause: error });
  }
};

export const profileService = {
  get: getProfile,
  getAuthoritative: getAuthoritativeProfile,

  create: createProfile,

  /** Create profile + avatar with a compensating cleanup strategy. */
  async createWithAvatar(uid: string, input: CreateProfileInput, avatarFile?: MediaFile, onAvatarStage?: (stage: "preparing" | "uploading" | "confirming" | "saving") => void): Promise<UserProfile> {
    const profile = buildProfile(uid, input, nowIso());
    if (!avatarFile) return createProfile(uid, input);

    let assetId: string | null = null;
    let providerUploaded = false;
    try {
      // Asset record exists before provider upload so every attempt has a durable lifecycle record.
      const managed = await mediaService.uploadManaged(avatarFile, {
        ownerUid: uid,
        familyId: null,
        purpose: "avatar",
        entityType: "user",
        entityId: uid,
        category: "users",
      }, undefined, { onStage: onAvatarStage });
      assetId = managed.asset.id;
      providerUploaded = true;
      const result = managed.result;
      const finalProfile = normalizeUserProfile(
        safe({ ...profile, avatarUrl: result.secureUrl, avatarPublicId: result.publicId, avatarAssetId: assetId }) as Record<string, unknown>,
        uid,
      );
      onAvatarStage?.("saving");
      await mediaService.attachToDocument(
        assetId,
        FIRESTORE_PATHS.user(uid),
        finalProfile as unknown as Record<string, unknown>,
      );
      return finalProfile;
    } catch (error) {
      const checkpoint = (error as { managedUploadCheckpoint?: { asset?: MediaAsset } } | null)?.managedUploadCheckpoint;
      const orphanAssetId = assetId || checkpoint?.asset?.id || null;
      if (orphanAssetId) {
        try {
          if (providerUploaded || checkpoint) await mediaService.markCleanupPending(orphanAssetId);
          else await mediaService.markFailed(orphanAssetId);
        } catch { /* preserve original error */ }
        if (providerUploaded || checkpoint) void momentMediaApi.requestCleanup([orphanAssetId]).catch(() => {});
      }
      if (error instanceof AppError) throw error;
      throw new AppError("MEDIA_ATTACH_FAILED", "MEDIA", undefined, { cause: error });
    }
  },

  async updateWithAvatar(uid: string, data: Partial<UserProfile>, avatarFile?: MediaFile, onAvatarStage?: (stage: "preparing" | "uploading" | "confirming" | "saving") => void, options?: { canCommit?: () => Promise<boolean>; onProgress?: (percent: number) => void }): Promise<void> {
    if (!avatarFile) return this.update(uid, data);
    const current = await getProfile(uid);
    if (!current) throw new AppError("PROFILE_NOT_FOUND", "PROFILE");
    let uploaded: { asset: MediaAsset; result: UploadResult } | null = null;
    try {
      uploaded = await mediaService.uploadManaged(avatarFile, {
        ownerUid: uid, familyId: null, purpose: "avatar", entityType: "user", entityId: uid, category: "users",
      }, options?.onProgress, { onStage: onAvatarStage });
      // An obsolete background selection must never replace the latest avatar.
      if (options?.canCommit && !(await options.canCommit())) {
        try { await mediaService.markCleanupPending(uploaded.asset.id); } catch { /* cleanup API remains authoritative */ }
        void momentMediaApi.requestCleanup([uploaded.asset.id]).catch(() => {});
        return;
      }
      onAvatarStage?.("saving");
      await this.update(uid, {
        ...data, avatarUrl: uploaded.result.secureUrl, avatarPublicId: uploaded.result.publicId,
        avatarAssetId: uploaded.asset.id,
      }, uploaded.asset.id, options?.canCommit);
      if (current.avatarAssetId && current.avatarAssetId !== uploaded.asset.id) {
        // Best effort: server refuses deleting the active profile photo.
        void momentMediaApi.requestCleanup([current.avatarAssetId]).catch(() => {});
      }
    } catch (error) {
      const checkpoint = (error as { managedUploadCheckpoint?: { asset?: MediaAsset } } | null)?.managedUploadCheckpoint;
      const orphanAssetId = uploaded?.asset.id || checkpoint?.asset?.id;
      if (orphanAssetId) {
        try { await mediaService.markCleanupPending(orphanAssetId); } catch {}
        void momentMediaApi.requestCleanup([orphanAssetId]).catch(() => {});
      }
      throw error;
    }
  },

  async updatePushNotificationsEnabled(uid: string, enabled: boolean): Promise<void> {
    const db = getFirestore();
    const existing = await getProfile(uid);
    if (!existing) throw new AppError("PROFILE_NOT_FOUND", "PROFILE");
    await setDoc(doc(db, FIRESTORE_PATHS.user(uid)), safe({
      pushNotificationsEnabled: enabled,
      updatedAt: nowIso(),
    }), { merge: true });
  },


  async updateSmartReminderPreferences(uid: string, preferences: SmartReminderPreferences): Promise<void> {
    const db = getFirestore();
    const existing = await getProfile(uid);
    if (!existing) throw new AppError("PROFILE_NOT_FOUND", "PROFILE");
    await setDoc(doc(db, FIRESTORE_PATHS.user(uid)), safe({
      smartReminderPreferences: preferences,
      updatedAt: nowIso(),
    }), { merge: true });
  },

  async update(uid: string, data: Partial<UserProfile>, newAvatarAssetId?: string, canCommit?: () => Promise<boolean>): Promise<void> {
    const db = getFirestore();
    const existing = await getProfile(uid);
    if (!existing) throw new AppError("PROFILE_NOT_FOUND", "PROFILE");
    const safeData = safe({ ...data });
    delete safeData.uid; delete safeData.activeFamilyId; delete safeData.createdAt;
    const updated = normalizeUserProfile(safe({ ...existing, ...safeData, updatedAt: nowIso() }) as Record<string, unknown>, uid);
    const batch = writeBatch(db);
    batch.set(doc(db, FIRESTORE_PATHS.user(uid)), safe(updated as unknown as Record<string, unknown>), { merge: true });
    const memberships = await getDocs(collection(db, FIRESTORE_PATHS.userMemberships(uid)));
    memberships.docs.forEach((m) => {
      const membership = m.data() as { role?: string; joinedAt?: string };
      batch.set(doc(db, FIRESTORE_PATHS.familyMember(m.id, uid)), safe({ ...familyVisible(updated), role: membership.role ?? "member", joinedAt: membership.joinedAt ?? nowIso() }), { merge: true });
    });
    if (newAvatarAssetId) {
      if (updated.avatarAssetId !== newAvatarAssetId) throw new AppError("MEDIA_ATTACH_FAILED", "MEDIA");
      batch.update(doc(db, FIRESTORE_PATHS.mediaAsset(newAvatarAssetId)), {status: "attached", updatedAt: nowIso()});
    }
    // Re-check immediately before commit: the user may have picked/removed
    // another image while Firestore membership documents were being fetched.
    if (canCommit && !(await canCommit())) throw new AppError("AVATAR_SELECTION_SUPERSEDED", "MEDIA");
    try { await batch.commit(); } catch (error) { throw new AppError("PROFILE_SAVE_FAILED", "PROFILE", undefined, { cause: error }); }
  },
};
