import { collection, doc, getDoc, getDocs, getFirestore, onSnapshot, runTransaction, updateDoc } from "@react-native-firebase/firestore";
import { FIRESTORE_PATHS } from "../firebase/firestorePaths";
import { CreateProfileInput, Family, FamilyMember, UserFamilyMembership, UserProfile } from "../../types";
import { normalizeUserProfile } from "../../utils/profile";
import { removeUndefinedDeep } from "../../utils/firestore";
import { createFamilyCodeCandidate } from "../../utils/family";
import { familyIntroDocId, validateFamilyIntroName } from "../../utils/familyIntroduction";
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
    const introName = `Nhà-${familyRef.id.slice(0,10)}`;
    const introNameKey = familyIntroDocId(introName);
    const introNameRef = doc(db, FIRESTORE_PATHS.familyIntroName(introNameKey));
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

        const [codeSnap, introSnap] = await Promise.all([tx.get(familyCodeRef), tx.get(introNameRef)]);
        if (codeSnap.exists() || introSnap.exists()) return null;

        const family: Family = {
          id: familyRef.id,
          name,
          familyCode,
          introName,
          introNameKey,
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
        tx.set(introNameRef, { id: introNameKey, name: introName, familyId: familyRef.id, familyName: name, ownerId: uid, createdAt: now });
        tx.set(memberRef, removeUndefinedDeep(member));
        tx.set(membershipRef, membership);
        if (existingProfile) {
          tx.set(userRef, removeUndefinedDeep({ ...profile, activeFamilyId: activateAfterCreate ? familyRef.id : profile.activeFamilyId ?? null, updatedAt: now }), { merge: true });
        } else {
          tx.set(userRef, removeUndefinedDeep({ activeFamilyId: activateAfterCreate ? familyRef.id : profile.activeFamilyId ?? null, updatedAt: now }), { merge: true });
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
  async getFamily(familyId: string): Promise<Family | null> {
    const snap = await getDoc(doc(getFirestore(), FIRESTORE_PATHS.family(familyId)));
    return snap.exists() ? snap.data() as Family : null;
  },

  /** Explicit owner action for legacy families without an alias; never rotates a code. */
  async ensureFamilyCode(familyId: string): Promise<string> {
    const db = getFirestore();
    const familyRef = doc(db, FIRESTORE_PATHS.family(familyId));
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = createFamilyCodeCandidate("nha");
      const codeRef = doc(db, FIRESTORE_PATHS.familyCode(code));
      const result = await runTransaction(db, async tx => {
        const [familySnap, codeSnap] = await Promise.all([tx.get(familyRef), tx.get(codeRef)]);
        if (!familySnap.exists()) throw new AppError("FAMILY_NOT_FOUND", "FAMILY");
        const family = familySnap.data() as Family;
        if (family.familyCode) return family.familyCode;
        if (codeSnap.exists()) return null;
        tx.set(codeRef, { id: code, familyCode: code, familyId, familyName: family.name, ownerId: family.ownerId, createdAt: nowIso() });
        tx.update(familyRef, { familyCode: code, updatedAt: nowIso() });
        return code;
      });
      if (result) return result;
    }
    throw new AppError("FAMILY_CODE_GENERATION_FAILED", "FAMILY");
  },

  /** Only a verified family admin may reserve a new introduction name.
   * The registry uses an atomic Firestore transaction and case-sensitive document ID.
   * Legacy familyCode remains usable after rename; pending join requests remain untouched.
   */
  async updateFamilyIntroName(familyId: string, uid: string, input: string): Promise<string> {
    const name = validateFamilyIntroName(input);
    const db = getFirestore();
    const key = familyIntroDocId(name);
    const familyRef = doc(db, FIRESTORE_PATHS.family(familyId));
    const memberRef = doc(db, FIRESTORE_PATHS.familyMember(familyId, uid));
    const newRef = doc(db, FIRESTORE_PATHS.familyIntroName(key));
    const legacyCodeRef = name.includes('/') ? null : doc(db, FIRESTORE_PATHS.familyCode(name));
    try {
      return await runTransaction(db, async tx => {
        const [familySnap, memberSnap, newSnap, legacySnap] = await Promise.all([
          tx.get(familyRef), tx.get(memberRef), tx.get(newRef), legacyCodeRef ? tx.get(legacyCodeRef) : Promise.resolve(null),
        ]);
        if (!familySnap.exists()) throw new AppError('FAMILY_NOT_FOUND', 'FAMILY');
        const family = familySnap.data() as Family;
        const role = memberSnap.exists() ? (memberSnap.data() as FamilyMember).role : null;
        if (family.ownerId !== uid && role !== 'owner' && role !== 'admin') throw new Error('Chỉ quản trị viên của nhà mới được đổi tên giới thiệu.');
        if (family.introName === name) return name;
        if (newSnap.exists() && newSnap.data()?.familyId !== familyId) throw new Error('Tên giới thiệu này đã được nhà khác sử dụng.');
        if (legacySnap?.exists() && legacySnap.data()?.familyId !== familyId) throw new Error('Tên giới thiệu này đã được nhà khác sử dụng.');
        const oldKey = family.introNameKey;
        const oldRef = oldKey && oldKey !== key ? doc(db, FIRESTORE_PATHS.familyIntroName(oldKey)) : null;
        const oldSnap = oldRef ? await tx.get(oldRef) : null;
        const now = nowIso();
        if (!newSnap.exists()) tx.set(newRef, { id: key, name, familyId, familyName: family.name, ownerId: family.ownerId, createdAt: now });
        tx.update(familyRef, { introName: name, introNameKey: key, updatedAt: now });
        if (oldRef && oldSnap?.exists() && oldSnap.data()?.familyId === familyId) tx.delete(oldRef);
        return name;
      });
    } catch (error) {
      const code = String((error as { code?: string })?.code || '').toLowerCase();
      if (code.includes('permission-denied')) throw new Error('Không thể đổi tên. Hãy kiểm tra quyền admin và triển khai Firestore Rules mới.');
      throw error;
    }
  },

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
  async createFamilyForUser(
    uid: string,
    familyName: string,
    options: { activateAfterCreate?: boolean } = {},
  ): Promise<{ familyId: string; familyName: string; familyCode: string }> {
    return createFamilyTransaction(uid, familyName, undefined, options.activateAfterCreate ?? true);
  },

  async listForUser(uid: string): Promise<UserFamilyMembership[]> {
    const s = await getDocs(collection(getFirestore(), FIRESTORE_PATHS.userMemberships(uid)));
    return s.docs.map(d => d.data() as UserFamilyMembership);
  },

  /**
   * Lightweight realtime reverse-index for the signed-in user's own memberships.
   * This is the ONLY multi-family listener kept alive; inactive family data is never subscribed.
   */
  watchForUser(uid: string, onChange: (items: UserFamilyMembership[]) => void, onError?: (error: unknown) => void) {
    return onSnapshot(
      collection(getFirestore(), FIRESTORE_PATHS.userMemberships(uid)),
      snap => onChange(snap.docs.map(d => d.data() as UserFamilyMembership)),
      onError,
    );
  },

  async getMember(familyId: string, uid: string): Promise<FamilyMember | null> {
    const s = await getDoc(doc(getFirestore(), FIRESTORE_PATHS.familyMember(familyId, uid)));
    return s.exists() ? s.data() as FamilyMember : null;
  },

  async listMembers(familyId: string): Promise<FamilyMember[]> {
    const s = await getDocs(collection(getFirestore(), FIRESTORE_PATHS.familyMembers(familyId)));
    return s.docs.map(d => d.data() as FamilyMember);
  },


  /** Realtime member list for the active family UI. */
  watchMembers(familyId: string, onChange: (members: FamilyMember[]) => void, onError?: (error: unknown) => void) {
    return onSnapshot(
      collection(getFirestore(), FIRESTORE_PATHS.familyMembers(familyId)),
      snap => onChange(snap.docs.map(d => d.data() as FamilyMember)),
      onError,
    );
  },

  async switchActiveFamily(uid: string, familyId: string): Promise<UserFamilyMembership> {
    const db = getFirestore();
    const [reverseIndex, authoritativeMember] = await Promise.all([
      getDoc(doc(db, FIRESTORE_PATHS.userMembership(uid, familyId))),
      getDoc(doc(db, FIRESTORE_PATHS.familyMember(familyId, uid))),
    ]);
    if (!reverseIndex.exists() || !authoritativeMember.exists()) {
      throw new AppError("FAMILY_MEMBERSHIP_REQUIRED", "FAMILY");
    }
    await updateDoc(doc(db, FIRESTORE_PATHS.user(uid)), { activeFamilyId: familyId, updatedAt: nowIso() });
    return reverseIndex.data() as UserFamilyMembership;
  },
};
