import { collection, doc, getDoc, getDocs, getFirestore, writeBatch, setDoc } from "@react-native-firebase/firestore";
import { FIRESTORE_PATHS } from "../firebase/firestorePaths";
import { CreateProfileInput, MediaFile, UserProfile } from "../../types";
import { AppError } from "../../types/errors";
import { removeUndefinedDeep } from "../../utils/firestore";
import { normalizeUserProfile } from "../../utils/profile";
import { mediaService } from "../media/mediaService";

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
  avatarUrl: input.avatarUrl, avatarPublicId: input.avatarPublicId, gender: input.gender ?? "other",
  currentLocation: input.currentLocation, bio: input.bio, bloodType: input.bloodType,
  interests: input.interests ?? input.hobbies ?? [], fcmTokens: input.fcmTokens ?? [],
  createdAt: now, updatedAt: now,
}) as Record<string, unknown>, uid);

const getProfile = async (uid: string): Promise<UserProfile | null> => {
  const snapshot = await getDoc(doc(getFirestore(), FIRESTORE_PATHS.user(uid)));
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

  create: createProfile,

  /** Create profile + avatar with a compensating cleanup strategy. */
  async createWithAvatar(uid: string, input: CreateProfileInput, avatarFile?: MediaFile): Promise<UserProfile> {
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
      });
      assetId = managed.asset.id;
      providerUploaded = true;
      const result = managed.result;
      const finalProfile = normalizeUserProfile(
        safe({ ...profile, avatarUrl: result.secureUrl, avatarPublicId: result.publicId }) as Record<string, unknown>,
        uid,
      );
      await mediaService.attachToDocument(
        assetId,
        FIRESTORE_PATHS.user(uid),
        finalProfile as unknown as Record<string, unknown>,
      );
      return finalProfile;
    } catch (error) {
      if (assetId) {
        try {
          if (providerUploaded) await mediaService.markCleanupPending(assetId);
          else await mediaService.markFailed(assetId);
        } catch { /* preserve original error */ }
      }
      if (error instanceof AppError) throw error;
      throw new AppError("MEDIA_ATTACH_FAILED", "MEDIA", undefined, { cause: error });
    }
  },

  async update(uid: string, data: Partial<UserProfile>): Promise<void> {
    const db = getFirestore();
    const existing = await getProfile(uid);
    if (!existing) throw new AppError("PROFILE_NOT_FOUND", "PROFILE");
    const safeData = safe({ ...data });
    delete safeData.uid; delete safeData.activeFamilyId; delete safeData.createdAt;
    const updated = normalizeUserProfile(safe({ ...existing, ...safeData, updatedAt: nowIso() }) as Record<string, unknown>, uid);
    const batch = writeBatch(db);
    batch.set(doc(db, FIRESTORE_PATHS.user(uid)), safe(updated as unknown as Record<string, unknown>), { merge: true });
    const memberships = await getDocs(collection(db, `users/${uid}/memberships`));
    memberships.docs.forEach((m) => {
      const membership = m.data() as { role?: string; joinedAt?: string };
      batch.set(doc(db, FIRESTORE_PATHS.familyMember(m.id, uid)), safe({ ...familyVisible(updated), role: membership.role ?? "member", joinedAt: membership.joinedAt ?? nowIso() }), { merge: true });
    });
    try { await batch.commit(); } catch (error) { throw new AppError("PROFILE_SAVE_FAILED", "PROFILE", undefined, { cause: error }); }
  },
};
