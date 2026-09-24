import {
  collection, doc, getDoc, getDocs, getFirestore, onSnapshot, query, runTransaction, where,
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
  /**
   * Gửi yêu cầu vào một gia đình. Người dùng có thể nhập familyCode dễ nhớ hoặc
   * familyId cũ; service luôn quy đổi về familyId thật trước khi ghi request.
   */
  async requestToJoin(uid: string, familyKeyInput: string, profile: UserProfile, message?: string): Promise<FamilyJoinRequest> {
    const familyKey = familyKeyInput.trim();
    if (!familyKey) throw new AppError("FAMILY_ID_REQUIRED", "FAMILY");
    const familyCode = familyKey.toLowerCase();
    const db = getFirestore();

    let familyId = familyKey;
    let familyRef = doc(db, FIRESTORE_PATHS.family(familyId));
    let familySnap = await getDoc(familyRef);

    // Ưu tiên familyId để giữ tương thích dữ liệu Phase 2.1 cũ. Nếu không có,
    // tra alias duy nhất trong family_codes.
    if (!familySnap.exists()) {
      const codeSnap = await getDoc(doc(db, FIRESTORE_PATHS.familyCode(familyCode)));
      if (codeSnap.exists()) {
        familyId = String((codeSnap.data() as { familyId?: string }).familyId ?? "").trim();
        if (!familyId) throw new AppError("FAMILY_NOT_FOUND", "FAMILY");
        familyRef = doc(db, FIRESTORE_PATHS.family(familyId));
        familySnap = await getDoc(familyRef);
      }
    }

    if (!familySnap.exists()) throw new AppError("FAMILY_NOT_FOUND", "FAMILY");

    const memberRef = doc(db, FIRESTORE_PATHS.familyMember(familyId, uid));
    const requestRef = doc(db, FIRESTORE_PATHS.familyJoinRequest(familyId, uid));
    const [memberSnap, oldRequestSnap] = await Promise.all([
      getDoc(memberRef), getDoc(requestRef),
    ]);
    if (memberSnap.exists()) throw new AppError("ALREADY_FAMILY_MEMBER", "FAMILY");
    if (oldRequestSnap.exists() && (oldRequestSnap.data() as FamilyJoinRequest).status === "pending") {
      throw new AppError("JOIN_REQUEST_PENDING", "FAMILY");
    }
    const family = familySnap.data() as { id: string; name: string };
    const request = removeUndefinedDeep({
      uid, familyId, familyName: family.name, status: "pending",
      applicant: {
        uid: profile.uid, displayName: profile.displayName, shortName: profile.shortName ?? undefined,
        avatarUrl: profile.avatarUrl, phoneNumber: profile.phoneNumber,
        birthDate: profile.birthDate, bio: profile.bio, interests: profile.interests ?? [],
      },
      message: message?.trim() || undefined, requestedAt: nowIso(),
    }) as FamilyJoinRequest;
    // setDoc qua transaction để không có hai thao tác duyệt/yêu cầu chạy lệch nhau.
    await runTransaction(db, async tx => {
      tx.set(requestRef, request);
    });
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
   * cập nhật activeFamilyId và đánh dấu request approved.
   */
  async approve(familyId: string, request: FamilyJoinRequest, adminUid: string): Promise<void> {
    const db = getFirestore();
    const requestRef = doc(db, FIRESTORE_PATHS.familyJoinRequest(familyId, request.uid));
    const memberRef = doc(db, FIRESTORE_PATHS.familyMember(familyId, request.uid));
    const membershipRef = doc(db, FIRESTORE_PATHS.userMembership(request.uid, familyId));
    const userRef = doc(db, FIRESTORE_PATHS.user(request.uid));
    const familyRef = doc(db, FIRESTORE_PATHS.family(familyId));
    const reviewedAt = nowIso();
    await runTransaction(db, async tx => {
      const [reqSnap, familySnap, userSnap] = await Promise.all([
        tx.get(requestRef), tx.get(familyRef), tx.get(userRef),
      ]);
      if (!reqSnap.exists() || (reqSnap.data() as FamilyJoinRequest).status !== "pending") throw new Error("JOIN_REQUEST_NOT_PENDING");
      if (!familySnap.exists()) throw new AppError("FAMILY_NOT_FOUND", "FAMILY");
      if (!userSnap.exists()) throw new Error("USER_PROFILE_NOT_FOUND");
      const user = userSnap.data() as UserProfile;
      const member = removeUndefinedDeep({
        uid: request.uid, displayName: user.displayName, shortName: user.shortName, color: user.color,
        phoneNumber: user.phoneNumber, birthDate: user.birthDate, avatarUrl: user.avatarUrl,
        gender: user.gender, bio: user.bio, bloodType: user.bloodType, interests: user.interests ?? [],
        role: "member", joinedAt: reviewedAt, updatedAt: reviewedAt,
      }) as FamilyMember;
      const membership: UserFamilyMembership = { familyId, familyName: (familySnap.data() as { name: string }).name, role: "member", joinedAt: reviewedAt };
      tx.set(memberRef, member);
      tx.set(membershipRef, membership);
      tx.update(userRef, { activeFamilyId: familyId, updatedAt: reviewedAt });
      tx.update(requestRef, { status: "approved", reviewedAt, reviewedByUid: adminUid });
    });
  },

  /** Từ chối request nhưng vẫn giữ record để audit và hiển thị trạng thái. */
  async reject(familyId: string, request: FamilyJoinRequest, adminUid: string, reason?: string): Promise<void> {
    const db = getFirestore();
    const ref = doc(db, FIRESTORE_PATHS.familyJoinRequest(familyId, request.uid));
    const snap = await getDoc(ref);
    if (!snap.exists() || (snap.data() as FamilyJoinRequest).status !== "pending") throw new Error("JOIN_REQUEST_NOT_PENDING");
    const { updateDoc } = await import("@react-native-firebase/firestore");
    await updateDoc(ref, removeUndefinedDeep({ status: "rejected", reviewedAt: nowIso(), reviewedByUid: adminUid, rejectionReason: reason?.trim() }));
  },
};
