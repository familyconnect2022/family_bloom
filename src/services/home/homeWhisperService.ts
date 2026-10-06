import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  startAfter,
  where,
  writeBatch,
} from "@react-native-firebase/firestore";
import type {
  HomeWhisper,
  HomeWhisperAudience,
  HomeWhisperEmotion,
  HomeWhisperFeedMode,
  SavedHomeWhisper,
} from "@/types/homeLiving";

const PAGE_SIZE = 20;
const RETENTION_DAYS = 60;
const nowIso = () => new Date().toISOString();
const whisperCollection = (familyId: string) => `families/${familyId}/homeWhispers`;
const whisperPath = (familyId: string, whisperId: string) => `${whisperCollection(familyId)}/${whisperId}`;
const savedCollection = (uid: string) => `users/${uid}/savedHomeWhispers`;
const inboxCollection = (uid: string) => `users/${uid}/homeInbox`;

export type WhisperPageCursor = unknown | null;

export type CreateHomeWhisperInput = {
  familyId: string;
  authorUid: string;
  authorName: string;
  audience: HomeWhisperAudience;
  recipientUid?: string | null;
  recipientName?: string | null;
  familyMemberUids: string[];
  message: string;
  emotion: HomeWhisperEmotion;
};

export type WhisperPage = {
  items: HomeWhisper[];
  cursor: WhisperPageCursor;
  hasMore: boolean;
};

export type HomeWhisperInboxEvent = {
  id: string;
  type: "home_whisper";
  familyId: string;
  sourceId: string;
  senderUid: string;
  senderName: string;
  recipientUid: string;
  title: string;
  body: string;
  createdAt: string;
  deliveredAt: string | null;
  inAppSeenAt: string | null;
  readAt: string | null;
};

const normalizeWhisper = (id: string, raw: Record<string, unknown>): HomeWhisper => ({
  id,
  familyId: String(raw.familyId ?? ""),
  authorUid: String(raw.authorUid ?? ""),
  authorName: String(raw.authorName ?? ""),
  audience: raw.audience === "direct" ? "direct" : "family",
  recipientUid: typeof raw.recipientUid === "string" ? raw.recipientUid : null,
  recipientName: typeof raw.recipientName === "string" ? raw.recipientName : null,
  viewerUids: Array.isArray(raw.viewerUids) ? raw.viewerUids.filter((v): v is string => typeof v === "string") : [],
  message: String(raw.message ?? ""),
  emotion: (raw.emotion ?? "heart") as HomeWhisperEmotion,
  heartUids: Array.isArray(raw.heartUids) ? raw.heartUids.filter((v): v is string => typeof v === "string") : [],
  createdAt: String(raw.createdAt ?? ""),
  updatedAt: String(raw.updatedAt ?? raw.createdAt ?? ""),
  expireAt: raw.expireAt,
});

const normalizeInboxEvent = (id: string, raw: Record<string, unknown>): HomeWhisperInboxEvent | null => {
  if (raw.type !== "home_whisper") return null;
  const recipientUid = typeof raw.recipientUid === "string" ? raw.recipientUid.trim() : "";
  const familyId = typeof raw.familyId === "string" ? raw.familyId.trim() : "";
  const sourceId = typeof raw.sourceId === "string" ? raw.sourceId.trim() : id;
  if (!recipientUid || !familyId || !sourceId) return null;
  return {
    id,
    type: "home_whisper",
    familyId,
    sourceId,
    senderUid: typeof raw.senderUid === "string" ? raw.senderUid : "",
    senderName: typeof raw.senderName === "string" ? raw.senderName : "Người thân",
    recipientUid,
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : "Bạn có một lời thì thầm 💌",
    body: typeof raw.body === "string" && raw.body.trim() ? raw.body.trim() : "Một người thân vừa gửi lời riêng cho bạn.",
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
    deliveredAt: typeof raw.deliveredAt === "string" ? raw.deliveredAt : null,
    inAppSeenAt: typeof raw.inAppSeenAt === "string" ? raw.inAppSeenAt : null,
    readAt: typeof raw.readAt === "string" ? raw.readAt : null,
  };
};

const timestampMillis = (value: unknown): number | null => {
  if (!value || typeof value !== "object") return null;
  const maybe = value as { toMillis?: () => number; toDate?: () => Date };
  if (typeof maybe.toMillis === "function") return maybe.toMillis();
  if (typeof maybe.toDate === "function") return maybe.toDate().getTime();
  return null;
};

const isNotExpired = (item: HomeWhisper) => {
  const ms = timestampMillis(item.expireAt);
  return ms == null || ms > Date.now();
};

const isMissingIndexError = (error: unknown) => {
  const code = String((error as { code?: unknown } | null)?.code ?? "").toLowerCase();
  const message = String((error as { message?: unknown } | null)?.message ?? "").toLowerCase();
  return code.includes("failed-precondition") && (message.includes("index") || message.includes("requires an index"));
};

const isFallbackCursor = (cursor: WhisperPageCursor): cursor is { __homeWhisperFallbackOffset: number } =>
  !!cursor && typeof cursor === "object" && typeof (cursor as { __homeWhisperFallbackOffset?: unknown }).__homeWhisperFallbackOffset === "number";

const matchesFeedMode = (item: HomeWhisper, uid: string, mode: HomeWhisperFeedMode) => {
  if (mode === "toMe") return item.audience === "direct" && item.recipientUid === uid;
  if (mode === "sent") return item.authorUid === uid;
  if (mode === "family") return item.audience === "family";
  return true;
};

const fallbackFetchPage = async (familyId: string, uid: string, mode: HomeWhisperFeedMode, cursor: WhisperPageCursor, pageSize: number): Promise<WhisperPage> => {
  const offset = isFallbackCursor(cursor) ? cursor.__homeWhisperFallbackOffset : 0;
  const fallbackLimit = 120;
  const fallbackQuery = query(
    collection(getFirestore(), whisperCollection(familyId)),
    where("viewerUids", "array-contains", uid),
    limit(fallbackLimit),
  );
  const snap = await getDocs(fallbackQuery);
  const all = snap.docs
    .map(d => normalizeWhisper(d.id, d.data() as Record<string, unknown>))
    .filter(isNotExpired)
    .filter(item => matchesFeedMode(item, uid, mode))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const size = Math.max(1, Math.min(pageSize, 40));
  const items = all.slice(offset, offset + size);
  const nextOffset = offset + items.length;
  const hasMore = nextOffset < all.length;
  return {
    items,
    cursor: hasMore ? { __homeWhisperFallbackOffset: nextOffset } : null,
    hasMore,
  };
};

const buildFeedQuery = (
  familyId: string,
  uid: string,
  mode: HomeWhisperFeedMode,
  pageSize: number,
  cursor?: WhisperPageCursor,
) => {
  const ref = collection(getFirestore(), whisperCollection(familyId));
  const parts: any[] = [];

  // Every read query constrains viewerUids, matching the privacy rule.
  parts.push(where("viewerUids", "array-contains", uid));
  if (mode === "toMe") {
    parts.push(where("audience", "==", "direct"));
    parts.push(where("recipientUid", "==", uid));
  } else if (mode === "sent") {
    parts.push(where("authorUid", "==", uid));
  } else if (mode === "family") {
    parts.push(where("audience", "==", "family"));
  }
  parts.push(orderBy("createdAt", "desc"));
  if (cursor) parts.push(startAfter(cursor as any));
  parts.push(limit(Math.max(1, Math.min(pageSize, 40))));
  return query(ref, ...parts);
};

export const homeWhisperService = {
  pageSize: PAGE_SIZE,
  retentionDays: RETENTION_DAYS,

  async create(input: CreateHomeWhisperInput): Promise<string> {
    const db = getFirestore();
    const message = input.message.trim();
    if (!message) throw new Error("Lời thì thầm không được để trống.");
    if (message.length > 500) throw new Error("Lời thì thầm tối đa 500 ký tự.");

    const authorUid = input.authorUid;
    const isDirect = input.audience === "direct";
    const recipientUid = isDirect ? input.recipientUid?.trim() || null : null;
    if (isDirect && (!recipientUid || recipientUid === authorUid)) {
      throw new Error("Hãy chọn một người thân khác để nhận lời thì thầm.");
    }

    const familySet = new Set(input.familyMemberUids.filter(Boolean));
    familySet.add(authorUid);
    if (isDirect && recipientUid && !familySet.has(recipientUid)) {
      throw new Error("Người nhận không còn là thành viên của Nhà Mình.");
    }

    const viewerUids = isDirect
      ? Array.from(new Set([authorUid, recipientUid!]))
      : Array.from(familySet);

    const ref = doc(collection(db, whisperCollection(input.familyId)));
    const createdAt = nowIso();
    const expireAt = Timestamp.fromDate(new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000));
    const batch = writeBatch(db);

    batch.set(ref, {
      id: ref.id,
      familyId: input.familyId,
      authorUid,
      authorName: input.authorName.trim().slice(0, 80) || "Một người thân",
      audience: input.audience,
      recipientUid,
      recipientName: isDirect ? input.recipientName?.trim().slice(0, 80) || null : null,
      viewerUids,
      message,
      emotion: input.emotion,
      heartUids: [],
      createdAt,
      updatedAt: createdAt,
      expireAt,
    });

    // A direct whisper produces exactly one recipient-targeted inbox event.
    // Family whispers intentionally create no notification event.
    if (isDirect && recipientUid) {
      const inboxRef = doc(db, `${inboxCollection(recipientUid)}/${ref.id}`);
      batch.set(inboxRef, {
        id: ref.id,
        type: "home_whisper",
        familyId: input.familyId,
        sourceId: ref.id,
        senderUid: authorUid,
        senderName: input.authorName.trim().slice(0, 80) || "Người thân",
        recipientUid,
        title: "Bạn có một lời thì thầm 💌",
        body: `${input.authorName.trim().slice(0, 80) || "Một người thân"} vừa gửi một lời riêng cho bạn.`,
        createdAt,
        readAt: null,
      });
    }

    await batch.commit();
    return ref.id;
  },

  /**
   * Spark-friendly physical cleanup. We do not rely on Firestore TTL because TTL deletes
   * require billing. Only documents the current user is already allowed to read are queried,
   * then deleted after expireAt. At most 40 documents are removed per pass to avoid UI stalls.
   */
  async cleanupExpired(familyId: string, uid: string, batchLimit = 40): Promise<number> {
    const db = getFirestore();
    const q = query(
      collection(db, whisperCollection(familyId)),
      where("viewerUids", "array-contains", uid),
      where("expireAt", "<=", Timestamp.now()),
      orderBy("expireAt", "asc"),
      limit(Math.max(1, Math.min(batchLimit, 40))),
    );
    const snap = await getDocs(q);
    if (!snap.docs.length) return 0;
    const batch = writeBatch(db);
    for (const row of snap.docs) batch.delete(row.ref);
    await batch.commit();
    return snap.docs.length;
  },

  async fetchPage(
    familyId: string,
    uid: string,
    mode: HomeWhisperFeedMode,
    cursor: WhisperPageCursor = null,
    pageSize = PAGE_SIZE,
  ): Promise<WhisperPage> {
    // While a newly deployed composite index is still building, keep the screen usable
    // with a bounded client-sorted fallback instead of exposing Firebase's long index URL.
    if (isFallbackCursor(cursor)) return fallbackFetchPage(familyId, uid, mode, cursor, pageSize);
    try {
      const q = buildFeedQuery(familyId, uid, mode, pageSize, cursor);
      const snap = await getDocs(q);
      const items = snap.docs
        .map(d => normalizeWhisper(d.id, d.data() as Record<string, unknown>))
        .filter(isNotExpired);
      return {
        items,
        cursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : cursor,
        hasMore: snap.docs.length >= pageSize,
      };
    } catch (error) {
      if (!isMissingIndexError(error)) throw error;
      return fallbackFetchPage(familyId, uid, mode, null, pageSize);
    }
  },

  watchHead(
    familyId: string,
    uid: string,
    mode: HomeWhisperFeedMode,
    onChange: (items: HomeWhisper[]) => void,
    onError?: (error: unknown) => void,
  ) {
    const q = buildFeedQuery(familyId, uid, mode, PAGE_SIZE, null);
    return onSnapshot(
      q,
      snap => onChange(
        snap.docs
          .map(d => normalizeWhisper(d.id, d.data() as Record<string, unknown>))
          .filter(isNotExpired),
      ),
      onError,
    );
  },

  async toggleHeart(familyId: string, whisperId: string, uid: string): Promise<void> {
    const ref = doc(getFirestore(), whisperPath(familyId, whisperId));
    await runTransaction(getFirestore(), async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error("Lời thì thầm không còn tồn tại.");
      const raw = snap.data() as Record<string, unknown>;
      const viewerUids = Array.isArray(raw.viewerUids) ? raw.viewerUids : [];
      if (!viewerUids.includes(uid)) throw new Error("Bạn không có quyền phản hồi lời thì thầm này.");
      const hearts = new Set(Array.isArray(raw.heartUids) ? raw.heartUids.filter(v => typeof v === "string") as string[] : []);
      hearts.has(uid) ? hearts.delete(uid) : hearts.add(uid);
      tx.update(ref, { heartUids: Array.from(hearts), updatedAt: nowIso() });
    });
  },

  async save(uid: string, whisper: HomeWhisper): Promise<void> {
    if (!whisper.viewerUids.includes(uid)) throw new Error("Bạn không có quyền lưu lời thì thầm này.");
    const savedAt = nowIso();
    const snapshot: SavedHomeWhisper = {
      id: whisper.id,
      sourceWhisperId: whisper.id,
      familyId: whisper.familyId,
      savedByUid: uid,
      authorUid: whisper.authorUid,
      authorName: whisper.authorName,
      audience: whisper.audience,
      recipientUid: whisper.recipientUid,
      recipientName: whisper.recipientName,
      message: whisper.message,
      emotion: whisper.emotion,
      originalCreatedAt: whisper.createdAt,
      savedAt,
    };
    await setDoc(doc(getFirestore(), `${savedCollection(uid)}/${whisper.id}`), snapshot);
  },

  async removeSaved(uid: string, whisperId: string): Promise<void> {
    await deleteDoc(doc(getFirestore(), `${savedCollection(uid)}/${whisperId}`));
  },

  async listSaved(uid: string, pageSize = 50): Promise<SavedHomeWhisper[]> {
    const q = query(
      collection(getFirestore(), savedCollection(uid)),
      orderBy("savedAt", "desc"),
      limit(Math.max(1, Math.min(pageSize, 100))),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as SavedHomeWhisper);
  },

  async repairRecentDirectWhisperInbox(
    uid: string,
    familyIds: string[],
    options?: { maxFamilies?: number; maxPerFamily?: number; maxAgeHours?: number },
  ): Promise<number> {
    if (!uid) return 0;
    const maxFamilies = Math.max(1, Math.min(options?.maxFamilies ?? 6, 10));
    const maxPerFamily = Math.max(1, Math.min(options?.maxPerFamily ?? 8, 20));
    const maxAgeMs = Math.max(1, options?.maxAgeHours ?? 72) * 60 * 60 * 1000;
    const uniqueFamilies = Array.from(new Set(familyIds.filter(Boolean))).slice(0, maxFamilies);
    let repaired = 0;
    const db = getFirestore();

    // Compatibility bridge for mixed-version testing/installations. Builds before
    // Phase 14R.5 wrote the direct whisper itself but did not create homeInbox.
    // The recipient may safely backfill ONLY an inbox row proven by an existing
    // whisper addressed to their uid. Firestore rules validate that source link.
    for (const familyId of uniqueFamilies) {
      const page = await this.fetchPage(familyId, uid, "toMe", null, maxPerFamily).catch(() => null);
      if (!page) continue;
      for (const whisper of page.items) {
        const createdMs = Date.parse(whisper.createdAt);
        if (!Number.isFinite(createdMs) || Date.now() - createdMs < 0 || Date.now() - createdMs > maxAgeMs) continue;
        if (whisper.audience !== "direct" || whisper.recipientUid !== uid) continue;
        const inboxRef = doc(db, `${inboxCollection(uid)}/${whisper.id}`);
        const didRepair = await runTransaction(db, async tx => {
          const existing = await tx.get(inboxRef);
          if (existing.exists()) return false;
          tx.set(inboxRef, {
            id: whisper.id,
            type: "home_whisper",
            familyId: whisper.familyId,
            sourceId: whisper.id,
            senderUid: whisper.authorUid,
            senderName: whisper.authorName || "Người thân",
            recipientUid: uid,
            title: "Bạn có một lời thì thầm 💌",
            body: "Một lời thì thầm đang chờ bạn trong Nhà Mình.",
            createdAt: whisper.createdAt,
            readAt: null,
          });
          return true;
        }).catch(() => false);
        if (didRepair) repaired += 1;
      }
    }
    return repaired;
  },

  watchInbox(
    uid: string,
    onChange: (events: HomeWhisperInboxEvent[]) => void,
    onError?: (error: unknown) => void,
  ) {
    // One user-private bounded listener covers direct whispers across every family.
    // This avoids adding one listener per family and lets Release + DEV share the
    // same delivery claim in Firestore.
    const q = query(collection(getFirestore(), inboxCollection(uid)), orderBy("createdAt", "desc"), limit(20));
    return onSnapshot(q, snap => onChange(
      snap.docs
        .map(d => normalizeInboxEvent(d.id, d.data() as Record<string, unknown>))
        .filter((item): item is HomeWhisperInboxEvent => !!item && item.recipientUid === uid),
    ), onError);
  },

  async claimInboxDelivery(uid: string, eventId: string): Promise<boolean> {
    if (!uid || !eventId) return false;
    const db = getFirestore();
    const ref = doc(db, `${inboxCollection(uid)}/${eventId}`);
    return runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return false;
      const raw = snap.data() as Record<string, unknown>;
      if (raw.type !== "home_whisper" || raw.recipientUid !== uid) return false;
      if (typeof raw.deliveredAt === "string" && raw.deliveredAt.trim()) return false;
      if (typeof raw.readAt === "string" && raw.readAt.trim()) return false;
      tx.update(ref, { deliveredAt: nowIso() });
      return true;
    });
  },

  async claimInboxForeground(uid: string, eventId: string): Promise<boolean> {
    if (!uid || !eventId) return false;
    const db = getFirestore();
    const ref = doc(db, `${inboxCollection(uid)}/${eventId}`);
    return runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return false;
      const raw = snap.data() as Record<string, unknown>;
      if (raw.type !== "home_whisper" || raw.recipientUid !== uid) return false;
      if (typeof raw.readAt === "string" && raw.readAt.trim()) return false;
      if (typeof raw.inAppSeenAt === "string" && raw.inAppSeenAt.trim()) return false;
      const now = nowIso();
      const patch: Record<string, unknown> = { inAppSeenAt: now };
      if (!(typeof raw.deliveredAt === "string" && raw.deliveredAt.trim())) patch.deliveredAt = now;
      tx.update(ref, patch);
      return true;
    });
  },

  async releaseInboxDelivery(uid: string, eventId: string): Promise<void> {
    if (!uid || !eventId) return;
    const db = getFirestore();
    const ref = doc(db, `${inboxCollection(uid)}/${eventId}`);
    await runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const raw = snap.data() as Record<string, unknown>;
      if (raw.type !== "home_whisper" || raw.recipientUid !== uid) return;
      if (typeof raw.readAt === "string" && raw.readAt.trim()) return;
      if (raw.deliveredAt == null) return;
      tx.update(ref, { deliveredAt: null });
    });
  },

  async markInboxRead(uid: string, eventId: string): Promise<void> {
    const ref = doc(getFirestore(), `${inboxCollection(uid)}/${eventId}`);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const raw = snap.data() as Record<string, unknown>;
    const now = nowIso();
    await setDoc(ref, {
      readAt: now,
      deliveredAt: typeof raw.deliveredAt === "string" && raw.deliveredAt.trim() ? raw.deliveredAt : now,
      inAppSeenAt: typeof raw.inAppSeenAt === "string" && raw.inAppSeenAt.trim() ? raw.inAppSeenAt : now,
    }, { merge: true });
  },
};
