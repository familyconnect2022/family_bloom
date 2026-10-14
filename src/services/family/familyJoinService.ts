import {
  collection, doc, getDoc, getDocs, getFirestore, onSnapshot, limit, query, runTransaction, where,
} from "@react-native-firebase/firestore";
import { FIRESTORE_PATHS } from "../firebase/firestorePaths";
import { FamilyJoinRequest, UserFamilyMembership, UserProfile, FamilyMember } from "../../types";
import { removeUndefinedDeep } from "../../utils/firestore";
import { AppError } from "../../types/errors";

const nowIso = () => new Date().toISOString();

/**
 * Service quản lý yêu cầu gia nhập gia đình.
 * Điểm quan trọng: user chưa được duyệt KHÔNG được tạo member/membership.
 */
export const familyJoinService = {
  watchHasPending(familyId: string, onChange: (pending: boolean) => void, onError: (error: unknown) => void) {
    return onSnapshot(query(collection(getFirestore(), FIRESTORE_PATHS.familyJoinRequests(familyId)), where("status", "==", "pending"), limit(1)), snapshot => onChange(!snapshot.empty), onError);
  },
  /**
   * Gửi yêu cầu vào một gia đình. Người dùng có thể nhập familyCode dễ nhớ hoặc
   * familyId cũ; service luôn quy đổi về familyId thật trước khi ghi request.
   */
  async requestToJoin(uid: string, familyKeyInput: string, profile: UserProfile, message?: string): Promise<FamilyJoinRequest> {
    const familyKey = familyKeyInput.trim();
    if (!familyKey || familyKey.includes("/") || familyKey.length > 200) throw new AppError("FAMILY_ID_REQUIRED", "FAMILY");
    const db = getFirestore();
    // Resolve only the public alias; an applicant cannot read the private family
    // or members collection. Preserve case for Firestore document IDs.
    const code = await getDoc(doc(db, FIRESTORE_PATHS.familyCode(familyKey.toLowerCase())));
    const aliases = code.exists() ? null : await getDocs(query(
      collection(db, FIRESTORE_PATHS.familyCodes()), where("familyId", "==", familyKey), limit(1),
    ));
    const alias = code.exists() ? code.data() : aliases?.docs[0]?.data();
    const familyId = String(alias?.familyId || familyKey);
    const requestRef = doc(db, FIRESTORE_PATHS.familyJoinRequest(familyId, uid));
    const membershipRef = doc(db, FIRESTORE_PATHS.userMembership(uid, familyId));
    const request = removeUndefinedDeep({
      uid, familyId, familyName: String(alias?.familyName || "Gia đình"), status: "pending",
      applicant: {
        uid, displayName: profile.displayName, shortName: profile.shortName ?? undefined,
        avatarUrl: profile.avatarUrl, phoneNumber: profile.phoneNumber,
        birthDate: profile.birthDate, bio: profile.bio, interests: profile.interests ?? [],
      },
      message: message?.trim() || undefined, requestedAt: nowIso(),
    }) as FamilyJoinRequest;
    try {
      await runTransaction(db, async tx => {
      const [membership, previous] = await Promise.all([tx.get(membershipRef), tx.get(requestRef)]);
      if (membership.exists()) throw new AppError("ALREADY_FAMILY_MEMBER", "FAMILY");
      if (previous.exists() && previous.data()?.status === "pending") throw new AppError("JOIN_REQUEST_PENDING", "FAMILY");
      // Rules check family existence and prevent overwriting an approved request.
      tx.set(requestRef, request);
    });
    } catch (error) {
      if (!alias && String((error as {code?: string})?.code || "").includes("permission-denied")) throw new AppError("FAMILY_NOT_FOUND", "FAMILY");
      throw error;
    }
    return request;
  },

  /** Lấy yêu cầu hiện tại của user trong một gia đình. */
  async getMyRequest(uid: string, familyId: string): Promise<FamilyJoinRequest | null> {
    const snap = await getDoc(doc(getFirestore(), FIRESTORE_PATHS.familyJoinRequest(familyId, uid)));
    return snap.exists() ? snap.data() as FamilyJoinRequest : null;
  },


  /** Lắng nghe realtime request của chính user để gateway tự phản hồi khi admin duyệt/từ chối. */
  watchMyRequest(
    uid: string,
    familyId: string,
    onChange: (request: FamilyJoinRequest | null) => void,
    onError?: (error: unknown) => void,
  ) {
    return onSnapshot(
      doc(getFirestore(), FIRESTORE_PATHS.familyJoinRequest(familyId, uid)),
      snap => onChange(snap.exists() ? snap.data() as FamilyJoinRequest : null),
      onError,
    );
  },

  /** Lắng nghe các yêu cầu pending; chỉ màn hình admin mới gọi hàm này. */
  watchPending(familyId: string, onChange: (items: FamilyJoinRequest[]) => void, onError?: (error: unknown) => void) {
    const q = query(
      collection(getFirestore(), FIRESTORE_PATHS.familyJoinRequests(familyId)),
      where("status", "==", "pending"),
    );
    return onSnapshot(q, snap => onChange(snap.docs.map(d => d.data() as FamilyJoinRequest)), onError);
  },

  /**
   * Admin duyệt user: trong một transaction tạo member + membership,
   * đánh dấu request approved. User tự kích hoạt family bằng quyền của mình.
   */
  async approve(familyId: string, request: FamilyJoinRequest, adminUid: string): Promise<void> {
    const db = getFirestore();
    const requestRef = doc(db, FIRESTORE_PATHS.familyJoinRequest(familyId, request.uid));
    const memberRef = doc(db, FIRESTORE_PATHS.familyMember(familyId, request.uid));
    const membershipRef = doc(db, FIRESTORE_PATHS.userMembership(request.uid, familyId));
    const familyRef = doc(db, FIRESTORE_PATHS.family(familyId));
    const reviewedAt = nowIso();
    await runTransaction(db, async tx => {
      const [reqSnap, familySnap, existingMember] = await Promise.all([
        tx.get(requestRef), tx.get(familyRef), tx.get(memberRef),
      ]);
      if (!reqSnap.exists() || (reqSnap.data() as FamilyJoinRequest).status !== "pending") throw new Error("JOIN_REQUEST_NOT_PENDING");
      if (!familySnap.exists()) throw new AppError("FAMILY_NOT_FOUND", "FAMILY");
      if (existingMember.exists()) throw new AppError("ALREADY_FAMILY_MEMBER", "FAMILY");
      // Review the applicant projection they submitted; admins cannot read or
      // mutate another user's private profile. The applicant activates their family.
      const user = (reqSnap.data() as FamilyJoinRequest).applicant;
      const member = removeUndefinedDeep({
        uid: request.uid, displayName: user.displayName, shortName: user.shortName,
        phoneNumber: user.phoneNumber, birthDate: user.birthDate, avatarUrl: user.avatarUrl,
        bio: user.bio, interests: user.interests ?? [],
        role: "member", joinedAt: reviewedAt, updatedAt: reviewedAt,
      }) as FamilyMember;
      const membership: UserFamilyMembership = { familyId, familyName: (familySnap.data() as { name: string }).name, role: "member", joinedAt: reviewedAt };
      tx.set(memberRef, member);
      tx.set(membershipRef, membership);
      tx.update(requestRef, { status: "approved", reviewedAt, reviewedByUid: adminUid });
    });
  },

  /** Từ chối request nhưng vẫn giữ record để audit và hiển thị trạng thái. */
  async reject(familyId: string, request: FamilyJoinRequest, adminUid: string, reason?: string): Promise<void> {
    const db = getFirestore();
    const ref = doc(db, FIRESTORE_PATHS.familyJoinRequest(familyId, request.uid));
    await runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists() || snap.data()?.status !== "pending") throw new Error("JOIN_REQUEST_NOT_PENDING");
      tx.update(ref, removeUndefinedDeep({ status: "rejected", reviewedAt: nowIso(), reviewedByUid: adminUid, rejectionReason: reason?.trim() }));
    });
  },
};
