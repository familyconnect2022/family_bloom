import {
  Timestamp,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "@react-native-firebase/firestore";
import type {
  HomeTimeCapsule,
  HomeTimeCapsuleAudience,
  HomeTimeCapsuleContent,
  HomeTimeCapsuleOpen,
  HomeTimeCapsulePreviewMode,
  HomeTimeCapsuleRevealTheme,
} from "../../types/homeLiving";
import { FIRESTORE_PATHS } from "../firebase/firestorePaths";

const MAX_CAPSULES_PER_LIST = 100;
const MAX_TITLE = 140;
const MAX_MESSAGE = 4000;
const MAX_RECIPIENTS = 500;
const nowIso = () => new Date().toISOString();

const capsuleCollection = (familyId: string) => FIRESTORE_PATHS.familyHomeTimeCapsules(familyId);
const capsulePath = (familyId: string, capsuleId: string) => FIRESTORE_PATHS.familyHomeTimeCapsule(familyId, capsuleId);
const contentPath = (familyId: string, capsuleId: string) => FIRESTORE_PATHS.familyHomeTimeCapsuleContent(familyId, capsuleId);
const openPath = (familyId: string, capsuleId: string, uid: string) => FIRESTORE_PATHS.familyHomeTimeCapsuleOpen(familyId, capsuleId, uid);

const timestampToMillis = (value: unknown) => {
  const maybe = value as { toMillis?: () => number; toDate?: () => Date } | null;
  if (typeof maybe?.toMillis === "function") return maybe.toMillis();
  if (typeof maybe?.toDate === "function") return maybe.toDate().getTime();
  return 0;
};

const normalizeCapsule = (id: string, raw: Record<string, unknown>): HomeTimeCapsule => ({
  id,
  familyId: typeof raw.familyId === "string" ? raw.familyId : "",
  createdByUid: typeof raw.createdByUid === "string" ? raw.createdByUid : "",
  createdByName: typeof raw.createdByName === "string" ? raw.createdByName : "Người thân",
  audience: raw.audience === "selected" ? "selected" : "family",
  recipientUids: Array.isArray(raw.recipientUids) ? raw.recipientUids.filter((v): v is string => typeof v === "string") : [],
  previewMode: raw.previewMode === "locked" ? "locked" : "hidden",
  revealTheme: raw.revealTheme === "formal" || raw.revealTheme === "festive" ? raw.revealTheme : "warm",
  createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
  updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
  openedByUids: Array.isArray(raw.openedByUids) ? raw.openedByUids.filter((v): v is string => typeof v === "string") : undefined,
  openAt: raw.openAt,
});

const uniqueRecipients = (uids: string[], authorUid: string) =>
  Array.from(new Set(uids.map(uid => uid.trim()).filter(uid => uid && uid !== authorUid))).slice(0, MAX_RECIPIENTS);

const validateContent = (title: string, message: string) => {
  const cleanTitle = title.trim();
  const cleanMessage = message.trim();
  if (!cleanTitle) throw new Error("Hãy viết tiêu đề cho Hộp thời gian.");
  if (!cleanMessage) throw new Error("Hãy viết lời nhắn trước khi gửi Hộp thời gian.");
  if (cleanTitle.length > MAX_TITLE) throw new Error(`Tiêu đề tối đa ${MAX_TITLE} ký tự.`);
  if (cleanMessage.length > MAX_MESSAGE) throw new Error(`Lời nhắn tối đa ${MAX_MESSAGE} ký tự.`);
  return { title: cleanTitle, message: cleanMessage };
};

const validateOpenAt = (openAt: Date) => {
  if (!(openAt instanceof Date) || Number.isNaN(openAt.getTime())) throw new Error("Ngày mở Hộp thời gian chưa hợp lệ.");
  if (openAt.getTime() <= Date.now() + 15_000) throw new Error("Thời gian mở phải ở tương lai.");
};

export const isTimeCapsuleOpen = (capsule: HomeTimeCapsule, now = Date.now()) => timestampToMillis(capsule.openAt) <= now;
export const timeCapsuleOpenMillis = (capsule: HomeTimeCapsule) => timestampToMillis(capsule.openAt);

export const homeTimeCapsuleService = {
  async create(input: {
    familyId: string;
    createdByUid: string;
    createdByName: string;
    audience: HomeTimeCapsuleAudience;
    recipientUids: string[];
    previewMode: HomeTimeCapsulePreviewMode;
    openAt: Date;
    revealTheme: HomeTimeCapsuleRevealTheme;
    title: string;
    message: string;
  }): Promise<string> {
    const db = getFirestore();
    const recipients = uniqueRecipients(input.recipientUids, input.createdByUid);
    if (!recipients.length) throw new Error("Hãy chọn ít nhất một người nhận.");
    validateOpenAt(input.openAt);
    const content = validateContent(input.title, input.message);
    const ref = doc(collection(db, capsuleCollection(input.familyId)));
    const createdAt = nowIso();
    const batch = writeBatch(db);
    batch.set(ref, {
      id: ref.id,
      familyId: input.familyId,
      createdByUid: input.createdByUid,
      createdByName: input.createdByName.trim().slice(0, 80) || "Người thân",
      audience: input.audience,
      recipientUids: recipients,
      previewMode: input.previewMode,
      openAt: Timestamp.fromDate(input.openAt),
      revealTheme: input.revealTheme,
      createdAt,
      updatedAt: createdAt,
    });
    batch.set(doc(db, contentPath(input.familyId, ref.id)), content);
    await batch.commit();
    return ref.id;
  },

  async update(input: {
    familyId: string;
    capsuleId: string;
    actorUid: string;
    createdByName: string;
    audience: HomeTimeCapsuleAudience;
    recipientUids: string[];
    previewMode: HomeTimeCapsulePreviewMode;
    openAt: Date;
    revealTheme: HomeTimeCapsuleRevealTheme;
    title: string;
    message: string;
  }): Promise<void> {
    const db = getFirestore();
    const metadataRef = doc(db, capsulePath(input.familyId, input.capsuleId));
    const existing = await getDoc(metadataRef);
    if (!existing.exists()) throw new Error("Hộp thời gian không còn tồn tại.");
    const current = normalizeCapsule(existing.id, existing.data() as Record<string, unknown>);
    if (current.createdByUid !== input.actorUid) throw new Error("Chỉ người tạo mới được sửa Hộp thời gian này.");
    if (isTimeCapsuleOpen(current)) throw new Error("Hộp đã đến giờ mở nên không thể chỉnh sửa nữa.");
    validateOpenAt(input.openAt);
    const recipients = uniqueRecipients(input.recipientUids, input.actorUid);
    if (!recipients.length) throw new Error("Hãy chọn ít nhất một người nhận.");
    const content = validateContent(input.title, input.message);
    const batch = writeBatch(db);
    batch.update(metadataRef, {
      createdByName: input.createdByName.trim().slice(0, 80) || current.createdByName,
      audience: input.audience,
      recipientUids: recipients,
      previewMode: input.previewMode,
      openAt: Timestamp.fromDate(input.openAt),
      revealTheme: input.revealTheme,
      updatedAt: nowIso(),
    });
    batch.set(doc(db, contentPath(input.familyId, input.capsuleId)), content);
    await batch.commit();
  },

  async remove(familyId: string, capsuleId: string, actorUid: string): Promise<void> {
    const db = getFirestore();
    const metadataRef = doc(db, capsulePath(familyId, capsuleId));
    const existing = await getDoc(metadataRef);
    if (!existing.exists()) return;
    const current = normalizeCapsule(existing.id, existing.data() as Record<string, unknown>);
    if (current.createdByUid !== actorUid) throw new Error("Chỉ người tạo mới được xóa Hộp thời gian này.");
    if (isTimeCapsuleOpen(current)) throw new Error("Hộp đã đến giờ mở nên không thể xóa nữa.");
    const batch = writeBatch(db);
    batch.delete(doc(db, contentPath(familyId, capsuleId)));
    batch.delete(metadataRef);
    await batch.commit();
  },

  async get(familyId: string, capsuleId: string): Promise<HomeTimeCapsule | null> {
    const snap = await getDoc(doc(getFirestore(), capsulePath(familyId, capsuleId)));
    return snap.exists() ? normalizeCapsule(snap.id, snap.data() as Record<string, unknown>) : null;
  },

  async getContent(familyId: string, capsuleId: string): Promise<HomeTimeCapsuleContent | null> {
    const snap = await getDoc(doc(getFirestore(), contentPath(familyId, capsuleId)));
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, unknown>;
    return {
      title: typeof data.title === "string" ? data.title : "",
      message: typeof data.message === "string" ? data.message : "",
    };
  },

  async getOpen(familyId: string, capsuleId: string, uid: string): Promise<HomeTimeCapsuleOpen | null> {
    const snap = await getDoc(doc(getFirestore(), openPath(familyId, capsuleId, uid)));
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, unknown>;
    return { uid: typeof data.uid === "string" ? data.uid : uid, openedAt: data.openedAt };
  },

  async listOpenedByUids(familyId: string, capsuleId: string): Promise<string[]> {
    const snap = await getDocs(collection(getFirestore(), `${capsulePath(familyId, capsuleId)}/opens`));
    return Array.from(new Set(snap.docs
      .map(row => row.data() as Record<string, unknown>)
      .map(data => typeof data.uid === "string" ? data.uid : "")
      .filter(Boolean)));
  },

  async markOpened(familyId: string, capsuleId: string, uid: string): Promise<void> {
    const db = getFirestore();
    const receiptRef = doc(db, openPath(familyId, capsuleId, uid));
    // Preserve the first openedAt timestamp even when the user replays the reveal.
    const existingReceipt = await getDoc(receiptRef).catch(() => null);
    if (!existingReceipt?.exists()) {
      await setDoc(receiptRef, { uid, openedAt: serverTimestamp() });
    }
    // The metadata summary lets both horizontal rails reflect "opened" without
    // adding one realtime listener/query per capsule. Keep this best-effort so
    // an older deployed rule set cannot prevent the canonical receipt write.
    await setDoc(
      doc(db, capsulePath(familyId, capsuleId)),
      { openedByUids: arrayUnion(uid) },
      { merge: true },
    ).catch(() => undefined);
  },

  async syncOpenedSummary(familyId: string, capsuleId: string, uid: string): Promise<void> {
    await setDoc(
      doc(getFirestore(), capsulePath(familyId, capsuleId)),
      { openedByUids: arrayUnion(uid) },
      { merge: true },
    ).catch(() => undefined);
  },

  async listVisible(familyId: string, uid: string): Promise<HomeTimeCapsule[]> {
    const db = getFirestore();
    const base = collection(db, capsuleCollection(familyId));
    const [created, received] = await Promise.all([
      getDocs(query(base, where("createdByUid", "==", uid), limit(MAX_CAPSULES_PER_LIST))),
      getDocs(query(base, where("recipientUids", "array-contains", uid), limit(MAX_CAPSULES_PER_LIST))),
    ]);
    const byId = new Map<string, HomeTimeCapsule>();
    for (const row of [...created.docs, ...received.docs]) byId.set(row.id, normalizeCapsule(row.id, row.data() as Record<string, unknown>));
    const now = Date.now();
    const visible = Array.from(byId.values())
      .filter(item => item.createdByUid === uid || item.previewMode === "locked" || isTimeCapsuleOpen(item, now));

    // Compatibility bridge for boxes created before openedByUids existed. Only
    // legacy, already-due boxes pay this extra read cost; all new boxes render
    // their opened state directly from metadata with no N-listener regression.
    const hydrated = await Promise.all(visible.map(async (item) => {
      if (item.openedByUids !== undefined || !isTimeCapsuleOpen(item, now)) return item;
      if (item.createdByUid === uid) {
        const snap = await getDocs(collection(db, `${capsulePath(familyId, item.id)}/opens`)).catch(() => null);
        const openedByUids = snap?.docs
          .map(row => row.data() as Record<string, unknown>)
          .map(data => typeof data.uid === "string" ? data.uid : "")
          .filter(Boolean) ?? [];
        return { ...item, openedByUids };
      }
      if (item.recipientUids.includes(uid)) {
        const receipt = await getDoc(doc(db, openPath(familyId, item.id, uid))).catch(() => null);
        return { ...item, openedByUids: receipt?.exists() ? [uid] : [] };
      }
      return item;
    }));

    return hydrated.sort((a, b) => timeCapsuleOpenMillis(b) - timeCapsuleOpenMillis(a));
  },


  watchRecipientCapsules(
    familyId: string,
    uid: string,
    onChange: (items: HomeTimeCapsule[]) => void,
    onError?: (error: unknown) => void,
  ): () => void {
    if (!familyId || !uid) return () => {};
    const q = query(
      collection(getFirestore(), capsuleCollection(familyId)),
      where("recipientUids", "array-contains", uid),
      limit(MAX_CAPSULES_PER_LIST),
    );
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .map(row => normalizeCapsule(row.id, row.data() as Record<string, unknown>))
          .sort((a, b) => timeCapsuleOpenMillis(a) - timeCapsuleOpenMillis(b));
        onChange(items);
      },
      (error) => onError?.(error),
    );
  },

  watchCreatedCapsules(
    familyId: string,
    uid: string,
    onChange: (items: HomeTimeCapsule[]) => void,
    onError?: (error: unknown) => void,
  ): () => void {
    if (!familyId || !uid) return () => {};
    const q = query(
      collection(getFirestore(), capsuleCollection(familyId)),
      where("createdByUid", "==", uid),
      limit(MAX_CAPSULES_PER_LIST),
    );
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .map(row => normalizeCapsule(row.id, row.data() as Record<string, unknown>))
          .sort((a, b) => timeCapsuleOpenMillis(a) - timeCapsuleOpenMillis(b));
        onChange(items);
      },
      (error) => onError?.(error),
    );
  },

  watchUpcomingForRecipient(
    familyId: string,
    uid: string,
    onChange: (items: HomeTimeCapsule[]) => void,
    onError?: (error: unknown) => void,
  ): () => void {
    return homeTimeCapsuleService.watchRecipientCapsules(
      familyId,
      uid,
      (items) => {
        const now = Date.now();
        onChange(items.filter(item => timeCapsuleOpenMillis(item) > now));
      },
      onError,
    );
  },
  async listUpcomingForRecipient(familyId: string, uid: string): Promise<HomeTimeCapsule[]> {
    const db = getFirestore();
    const snap = await getDocs(query(
      collection(db, capsuleCollection(familyId)),
      where("recipientUids", "array-contains", uid),
      limit(MAX_CAPSULES_PER_LIST),
    ));
    const now = Date.now();
    return snap.docs
      .map(row => normalizeCapsule(row.id, row.data() as Record<string, unknown>))
      .filter(item => timeCapsuleOpenMillis(item) > now)
      .sort((a, b) => timeCapsuleOpenMillis(a) - timeCapsuleOpenMillis(b));
  },
};

export const HOME_TIME_CAPSULE_LIMITS = {
  title: MAX_TITLE,
  message: MAX_MESSAGE,
  recipients: MAX_RECIPIENTS,
} as const;
