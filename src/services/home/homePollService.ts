import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  where,
  writeBatch,
} from "@react-native-firebase/firestore";
import type { HomePoll, HomePollAudience, HomePollBallot, HomePollChoice } from "@/types/homeLiving";
import { FIRESTORE_PATHS } from "../firebase/firestorePaths";

const POLL_RETENTION_DAYS = 30;
const PAGE_SIZE = 20;
const nowIso = () => new Date().toISOString();
const pollsCollection = FIRESTORE_PATHS.familyHomePolls;
const pollPath = FIRESTORE_PATHS.familyHomePoll;
const ballotPath = FIRESTORE_PATHS.familyHomePollBallot;

const isMissingIndexError = (error: unknown) => {
  const code = String((error as { code?: unknown } | null)?.code ?? "").toLowerCase();
  const message = String((error as { message?: unknown } | null)?.message ?? "").toLowerCase();
  return code.includes("failed-precondition") && (message.includes("index") || message.includes("requires an index"));
};

const sortPollsNewestFirst = (polls: HomePoll[]) => [...polls].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export type CreateHomePollInput = {
  familyId: string;
  createdByUid: string;
  createdByName: string;
  question: string;
  description: string;
  audience: HomePollAudience;
  eligibleUids: string[];
  anonymous: boolean;
  expiresAt: Date;
};

const asMillis = (value: unknown): number | null => {
  if (!value || typeof value !== "object") return null;
  const maybe = value as { toMillis?: () => number; toDate?: () => Date };
  if (typeof maybe.toMillis === "function") return maybe.toMillis();
  if (typeof maybe.toDate === "function") return maybe.toDate().getTime();
  return null;
};

export const isHomePollExpired = (poll: HomePoll, now = Date.now()) => {
  const ms = asMillis(poll.expiresAt);
  return ms != null && ms <= now;
};

const normalizePoll = (id: string, raw: Record<string, unknown>): HomePoll => ({
  id,
  familyId: String(raw.familyId ?? ""),
  createdByUid: String(raw.createdByUid ?? ""),
  createdByName: String(raw.createdByName ?? ""),
  question: String(raw.question ?? ""),
  description: String(raw.description ?? ""),
  audience: raw.audience === "group" ? "group" : "family",
  eligibleUids: Array.isArray(raw.eligibleUids) ? raw.eligibleUids.filter((v): v is string => typeof v === "string") : [],
  eligibleCount: Number(raw.eligibleCount ?? 0),
  anonymous: raw.anonymous === true,
  agreeCount: Number(raw.agreeCount ?? 0),
  disagreeCount: Number(raw.disagreeCount ?? 0),
  votedCount: Number(raw.votedCount ?? 0),
  createdAt: String(raw.createdAt ?? ""),
  updatedAt: String(raw.updatedAt ?? raw.createdAt ?? ""),
  expiresAt: raw.expiresAt,
  deleteAt: raw.deleteAt,
});

const normalizeBallot = (raw: Record<string, unknown>): HomePollBallot => ({
  uid: String(raw.uid ?? ""),
  displayName: String(raw.displayName ?? ""),
  choice: raw.choice === "disagree" ? "disagree" : "agree",
  createdAt: String(raw.createdAt ?? ""),
  updatedAt: String(raw.updatedAt ?? raw.createdAt ?? ""),
  deleteAt: raw.deleteAt,
});

export const endOfLocalDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const homePollService = {
  pageSize: PAGE_SIZE,
  retentionDaysAfterExpiry: POLL_RETENTION_DAYS,

  async create(input: CreateHomePollInput): Promise<string> {
    const db = getFirestore();
    const q = input.question.trim();
    const description = input.description.trim();
    if (!q) throw new Error("Hãy nhập nội dung cần cả nhà quyết định.");
    if (q.length > 220) throw new Error("Tên cuộc bỏ phiếu tối đa 220 ký tự.");
    if (description.length > 1200) throw new Error("Mô tả tối đa 1.200 ký tự.");

    const eligible = Array.from(new Set(input.eligibleUids.filter(Boolean)));
    if (!eligible.includes(input.createdByUid)) eligible.unshift(input.createdByUid);
    if (input.audience === "group" && eligible.length < 3) {
      throw new Error("Nhóm bỏ phiếu phải có ít nhất 3 người.");
    }
    if (eligible.length === 0) throw new Error("Không có thành viên đủ điều kiện bỏ phiếu.");

    const expires = endOfLocalDay(input.expiresAt);
    if (expires.getTime() <= Date.now()) throw new Error("Ngày hết hạn phải còn thời gian bỏ phiếu.");
    const deleteAtDate = new Date(expires.getTime() + POLL_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const ref = doc(collection(db, pollsCollection(input.familyId)));
    const createdAt = nowIso();

    await runTransaction(db, async tx => {
      tx.set(ref, {
        id: ref.id,
        familyId: input.familyId,
        createdByUid: input.createdByUid,
        createdByName: input.createdByName.trim().slice(0, 80) || "Người thân",
        question: q,
        description,
        audience: input.audience,
        eligibleUids: eligible,
        eligibleCount: eligible.length,
        anonymous: input.anonymous,
        agreeCount: 0,
        disagreeCount: 0,
        votedCount: 0,
        createdAt,
        updatedAt: createdAt,
        expiresAt: Timestamp.fromDate(expires),
        deleteAt: Timestamp.fromDate(deleteAtDate),
      });
    });
    return ref.id;
  },

  /**
   * Spark-friendly cleanup for completed polls. The parent stores the frozen eligible UID list,
   * so anonymous ballots can be deleted by document id without ever listing/reading their content.
   * Each poll is cleaned in its own <=201-write batch.
   */
  async cleanupExpired(familyId: string, uid: string, pollLimit = 5): Promise<number> {
    const db = getFirestore();
    const q = query(
      collection(db, pollsCollection(familyId)),
      where("eligibleUids", "array-contains", uid),
      where("deleteAt", "<=", Timestamp.now()),
      orderBy("deleteAt", "asc"),
      limit(Math.max(1, Math.min(pollLimit, 5))),
    );
    const snap = await getDocs(q);
    let removed = 0;
    for (const row of snap.docs) {
      const poll = normalizePoll(row.id, row.data() as Record<string, unknown>);
      const batch = writeBatch(db);
      for (const eligibleUid of poll.eligibleUids.slice(0, 200)) {
        batch.delete(doc(db, ballotPath(familyId, poll.id, eligibleUid)));
      }
      batch.delete(row.ref);
      await batch.commit();
      removed += 1;
    }
    return removed;
  },

  watchVisible(
    familyId: string,
    uid: string,
    onChange: (polls: HomePoll[]) => void,
    onError?: (error: unknown) => void,
  ) {
    // eligibleUids is a frozen snapshot at create time. The optimized query uses a composite
    // index. If that index is newly deployed and still building, temporarily fall back to a
    // bounded array-contains query and sort the <=60 documents on-device.
    const ref = collection(getFirestore(), pollsCollection(familyId));
    const optimized = query(
      ref,
      where("eligibleUids", "array-contains", uid),
      orderBy("createdAt", "desc"),
      limit(60),
    );
    let fallbackUnsubscribe: (() => void) | null = null;
    const optimizedUnsubscribe = onSnapshot(
      optimized,
      snap => onChange(snap.docs.map(d => normalizePoll(d.id, d.data() as Record<string, unknown>))),
      error => {
        if (!isMissingIndexError(error)) {
          onError?.(error);
          return;
        }
        if (fallbackUnsubscribe) return;
        const fallback = query(ref, where("eligibleUids", "array-contains", uid), limit(60));
        fallbackUnsubscribe = onSnapshot(
          fallback,
          snap => onChange(sortPollsNewestFirst(snap.docs.map(d => normalizePoll(d.id, d.data() as Record<string, unknown>)))),
          fallbackError => onError?.(new Error("Không tải được Cùng quyết định. Hãy thử lại sau.")),
        );
      },
    );
    return () => {
      optimizedUnsubscribe();
      fallbackUnsubscribe?.();
    };
  },

  async vote(
    familyId: string,
    pollId: string,
    uid: string,
    displayName: string,
    choice: HomePollChoice,
  ): Promise<void> {
    const db = getFirestore();
    const pRef = doc(db, pollPath(familyId, pollId));
    const bRef = doc(db, ballotPath(familyId, pollId, uid));

    await runTransaction(db, async tx => {
      const [pollSnap, ballotSnap] = await Promise.all([tx.get(pRef), tx.get(bRef)]);
      if (!pollSnap.exists()) throw new Error("Cuộc bỏ phiếu không còn tồn tại.");
      const poll = normalizePoll(pollSnap.id, pollSnap.data() as Record<string, unknown>);
      if (!poll.eligibleUids.includes(uid)) throw new Error("Bạn không thuộc nhóm tham gia cuộc bỏ phiếu này.");
      if (isHomePollExpired(poll)) throw new Error("Cuộc bỏ phiếu đã kết thúc.");

      const old = ballotSnap.exists() ? normalizeBallot(ballotSnap.data() as Record<string, unknown>) : null;
      let agreeCount = poll.agreeCount;
      let disagreeCount = poll.disagreeCount;
      let votedCount = poll.votedCount;

      if (!old) {
        votedCount += 1;
        choice === "agree" ? agreeCount += 1 : disagreeCount += 1;
      } else if (old.choice !== choice) {
        if (old.choice === "agree") agreeCount -= 1;
        else disagreeCount -= 1;
        if (choice === "agree") agreeCount += 1;
        else disagreeCount += 1;
      }

      const updatedAt = nowIso();
      tx.set(bRef, {
        uid,
        // Anonymous polls deliberately do not persist the display name. The ballot document
        // still uses uid as its security-owned document id, but other family clients cannot read it.
        displayName: poll.anonymous ? "" : (displayName.trim().slice(0, 80) || "Thành viên"),
        choice,
        createdAt: old?.createdAt ?? updatedAt,
        updatedAt,
        deleteAt: poll.deleteAt,
      });
      tx.update(pRef, {
        agreeCount: Math.max(0, agreeCount),
        disagreeCount: Math.max(0, disagreeCount),
        votedCount: Math.max(0, votedCount),
        updatedAt,
      });
    });
  },

  async getMyBallot(familyId: string, pollId: string, uid: string): Promise<HomePollBallot | null> {
    const snap = await getDoc(doc(getFirestore(), ballotPath(familyId, pollId, uid)));
    if (!snap.exists()) return null;
    return normalizeBallot(snap.data() as Record<string, unknown>);
  },

  async listNamedBallots(familyId: string, poll: HomePoll): Promise<HomePollBallot[]> {
    if (poll.anonymous) return [];
    const q = query(collection(getFirestore(), `${pollPath(familyId, poll.id)}/ballots`), orderBy("updatedAt", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => normalizeBallot(d.data() as Record<string, unknown>));
  },

  percentages(poll: HomePoll) {
    const denominator = Math.max(1, poll.eligibleCount);
    const noVote = Math.max(0, poll.eligibleCount - poll.votedCount);
    return {
      agree: Math.round((poll.agreeCount / denominator) * 100),
      disagree: Math.round((poll.disagreeCount / denominator) * 100),
      noVote: Math.max(0, 100 - Math.round((poll.agreeCount / denominator) * 100) - Math.round((poll.disagreeCount / denominator) * 100)),
      noVoteCount: noVote,
    };
  },
};
