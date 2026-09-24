import { collection, doc, getDoc, getDocs, getFirestore, onSnapshot, runTransaction, updateDoc } from "@react-native-firebase/firestore";
import { FIRESTORE_PATHS } from "../firebase/firestorePaths";
import { CreateProfileInput, Family, FamilyMember, UserFamilyMembership, UserProfile } from "../../types";
import { normalizeUserProfile } from "../../utils/profile";
import { removeUndefinedDeep } from "../../utils/firestore";
import { createFamilyCodeCandidate } from "../../utils/family";
import { AppError } from "../../types/errors";

const nowIso = () => new Date().toISOString();

const memberProfile = (p: UserProfile, role: FamilyMember["role"], joinedAt: string): FamilyMember => ({
  uid: p.uid, displayName: p.displayName, shortName: p.shortName, color: p.color,
  phoneNumber: p.phoneNumber, birthDate: p.birthDate, avatarUrl: p.avatarUrl, gender: p.gender,
  bio: p.bio, bloodType: p.bloodType, interests: p.interests, role, joinedAt, updatedAt: p.updatedAt,
});

/**
 * Tạo family + owner + membership trong một transaction.
 * familyCode được reserve ở collection riêng để đảm bảo duy nhất.
 */
const createFamilyTransaction = async (
  uid: string,
  familyName: string,
  existingProfile?: UserProfile,
  activateAfterCreate = false,
): Promise<{ familyId: string; familyName: string; familyCode: string; profile?: UserProfile }> => {
  const db = getFirestore();
  const name = familyName.trim();
  if (!name) throw new AppError("VALIDATION_REQUIRED", "VALIDATION");

  const userRef = doc(db, FIRESTORE_PATHS.user(uid));
  const familyRef = doc(collection(db, "families"));
  const memberRef = doc(db, FIRESTORE_PATHS.familyMember(familyRef.id, uid));
  const membershipRef = doc(db, FIRESTORE_PATHS.userMembership(uid, familyRef.id));

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const familyCode = createFamilyCodeCandidate(name);
    const familyCodeRef = doc(db, FIRESTORE_PATHS.familyCode(familyCode));
    const now = nowIso();

    try {
      const result = await runTransaction(db, async tx => {
        const userSnap = existingProfile ? null : await tx.get(userRef);
        const profile = existingProfile ?? (
          userSnap?.exists()
            ? normalizeUserProfile(userSnap.data() as Record<string, unknown>, uid)
            : null
        );
        if (!profile) throw new AppError("USER_PROFILE_NOT_FOUND", "PROFILE");

        const codeSnap = await tx.get(familyCodeRef);
        if (codeSnap.exists()) return null;

        const family: Family = {
          id: familyRef.id,
          name,
          familyCode,
          ownerId: uid,
          createdAt: now,
          updatedAt: now,
        };
        const member = memberProfile(profile, "admin", now);
        const membership: UserFamilyMembership = {
          familyId: familyRef.id,
          familyName: name,
          role: "admin",
          joinedAt: now,
        };

        tx.set(familyRef, family);
        tx.set(familyCodeRef, {
          id: familyCode,
          familyCode,
          familyId: familyRef.id,
          familyName: name,
          ownerId: uid,
          createdAt: now,
        });
        tx.set(memberRef, removeUndefinedDeep(member));
        tx.set(membershipRef, membership);
        if (existingProfile) {
          tx.set(userRef, removeUndefinedDeep({ ...profile, activeFamilyId: activateAfterCreate ? familyRef.id : profile.activeFamilyId ?? null, updatedAt: now }), { merge: true });
        } else {
          tx.set(userRef, removeUndefinedDeep({ activeFamilyId: activateAfterCreate ? familyRef.id : null, updatedAt: now }), { merge: true });
        }

        return { familyId: familyRef.id, familyName: name, familyCode, profile };
      });

      if (result) return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      // Nếu transaction thất bại do mã vừa bị reserve, thử một candidate khác.
      // Các lỗi Firebase khác được chuyển thành lỗi domain ở ngoài vòng lặp.
      const code = String((error as { code?: unknown } | null)?.code ?? "").toLowerCase();
      if (!code.includes("aborted") && !code.includes("already-exists")) {
        throw new AppError("PROFILE_SAVE_FAILED", "PROFILE", "Không thể tạo gia đình.", { cause: error });
      }
    }
  }

  throw new AppError("FAMILY_CODE_GENERATION_FAILED", "FAMILY");
};

export const familyService = {
  async createFamilyWithOwner(uid: string, input: CreateProfileInput): Promise<UserProfile> {
    const now = nowIso();
    const profile = normalizeUserProfile(removeUndefinedDeep({
      uid, displayName: input.displayName, shortName: input.shortName, color: input.color,
      phoneNumber: input.phoneNumber, birthDate: input.birthDate, avatarUrl: input.avatarUrl,
      avatarPublicId: input.avatarPublicId, gender: input.gender ?? "other", currentLocation: input.currentLocation,
      bio: input.bio, bloodType: input.bloodType, interests: input.interests ?? input.hobbies ?? [],
      fcmTokens: input.fcmTokens ?? [], activeFamilyId: null, createdAt: now, updatedAt: now,
    }) as Record<string, unknown>, uid);
    const result = await createFamilyTransaction(uid, `Gia đình của ${input.shortName || input.displayName}`, profile, true);
    const finalProfile = { ...profile, activeFamilyId: result.familyId };
    return finalProfile;
  },

  /** Tạo gia đình từ profile hiện có; user hiện tại trở thành admin/owner. */
  async createFamilyForUser(uid: string, familyName: string): Promise<{ familyId: string; familyName: string; familyCode: string }> {
    return createFamilyTransaction(uid, familyName, undefined, true);
  },

  async listForUser(uid: string): Promise<UserFamilyMembership[]> {
    const s = await getDocs(collection(getFirestore(), `users/${uid}/memberships`));
    return s.docs.map(d => d.data() as UserFamilyMembership);
  },

  async getMember(familyId: string, uid: string): Promise<FamilyMember | null> {
    const s = await getDoc(doc(getFirestore(), FIRESTORE_PATHS.familyMember(familyId, uid)));
    return s.exists() ? s.data() as FamilyMember : null;
  },

  async listMembers(familyId: string): Promise<FamilyMember[]> {
    const s = await getDocs(collection(getFirestore(), `families/${familyId}/members`));
    return s.docs.map(d => d.data() as FamilyMember);
  },


  /** Realtime member list for the active family UI. */
  watchMembers(familyId: string, onChange: (members: FamilyMember[]) => void, onError?: (error: unknown) => void) {
    return onSnapshot(
      collection(getFirestore(), `families/${familyId}/members`),
      snap => onChange(snap.docs.map(d => d.data() as FamilyMember)),
      onError,
    );
  },

  async switchActiveFamily(uid: string, familyId: string): Promise<void> {
    const db = getFirestore();
    const m = await getDoc(doc(db, FIRESTORE_PATHS.userMembership(uid, familyId)));
    if (!m.exists()) throw new AppError("FAMILY_MEMBERSHIP_REQUIRED", "FAMILY");
    await updateDoc(doc(db, FIRESTORE_PATHS.user(uid)), { activeFamilyId: familyId, updatedAt: nowIso() });
  },
};
