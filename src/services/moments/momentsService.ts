import {
  collection,
  deleteDoc,
  endAt,
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
  startAt,
  updateDoc,
  where,
} from "@react-native-firebase/firestore";
import { getAuth } from "@react-native-firebase/auth";
import { DATA_LIMITS } from "../../constants/dataLimits";
import {
  CreateMomentInput,
  MomentComment,
  MomentCommentPage,
  MomentPage,
  MomentPageCursor,
  MomentPost,
  MomentModerationStatus,
  MomentReaction,
  MomentReactionRecord,
  MomentReactionPage,
  MomentReactionPageCursor,
} from "../../types/moments";
import { AppError } from "../../types/errors";
import { removeUndefinedDeep } from "../../utils/firestore";
import { FIRESTORE_PATHS } from "../firebase/firestorePaths";
import { mediaService } from "../media/mediaService";
import { familyGraphRepository } from "../familyGraph/familyGraphRepository";

const now = () => new Date().toISOString();
const emptyCounts = (): Record<MomentReaction, number> => ({
  like: 0,
  love: 0,
  haha: 0,
  wow: 0,
  sad: 0,
  celebrate: 0,
});

const normalizeMomentPost = (
  raw: Record<string, unknown>,
  fallbackId = "",
  fallbackFamilyId = "",
): MomentPost => ({
  id: typeof raw.id === "string" && raw.id ? raw.id : fallbackId,
  familyId: typeof raw.familyId === "string" && raw.familyId ? raw.familyId : fallbackFamilyId,
  authorUid: typeof raw.authorUid === "string" ? raw.authorUid : "",
  authorName: typeof raw.authorName === "string" && raw.authorName.trim() ? raw.authorName : "Thành viên",
  ...(typeof raw.authorAvatarUrl === "string" && raw.authorAvatarUrl ? { authorAvatarUrl: raw.authorAvatarUrl } : {}),
  caption: typeof raw.caption === "string" ? raw.caption : "",
  media: Array.isArray(raw.media) ? raw.media as MomentPost["media"] : [],
  mediaAssetIds: Array.isArray(raw.mediaAssetIds)
    ? raw.mediaAssetIds.filter((item): item is string => typeof item === "string")
    : [],
  personIds: Array.isArray(raw.personIds)
    ? Array.from(new Set(raw.personIds.filter((item): item is string => typeof item === "string" && !!item.trim())))
    : [],
  timelineAudience: raw.timelineAudience === "family" || raw.timelineAudience === "persons" || raw.timelineAudience === "self"
    ? raw.timelineAudience
    : (Array.isArray(raw.personIds) && raw.personIds.length ? "persons" : "self"),
  notifyFamily: raw.notifyFamily === true,
  visibility: "family",
  moderationStatus: raw.moderationStatus === "hidden" ? "hidden" : "visible",
  moderatedByUid: typeof raw.moderatedByUid === "string" && raw.moderatedByUid ? raw.moderatedByUid : null,
  moderatedAt: typeof raw.moderatedAt === "string" && raw.moderatedAt ? raw.moderatedAt : null,
  reactionCounts: { ...emptyCounts(), ...((raw.reactionCounts && typeof raw.reactionCounts === "object") ? raw.reactionCounts as Partial<Record<MomentReaction, number>> : {}) },
  commentCount: typeof raw.commentCount === "number" ? raw.commentCount : 0,
  createdAt: typeof raw.createdAt === "string" ? raw.createdAt : now(),
  updatedAt: typeof raw.updatedAt === "string"
    ? raw.updatedAt
    : (typeof raw.createdAt === "string" ? raw.createdAt : now()),
});

const pageFromSnapshot = (
  snapshot: { docs: Array<{ id?: string; data: () => unknown }> },
  familyId: string,
  pageSize: number,
): MomentPage => ({
  items: snapshot.docs
    .map((item) => normalizeMomentPost(
      item.data() as Record<string, unknown>,
      item.id ?? "",
      familyId,
    ))
    .filter((item) => item.moderationStatus !== "hidden"),
  cursor: snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] as unknown : null,
  hasMore: snapshot.docs.length >= pageSize,
});

const validatePersonIds = async (familyId: string, values: string[] | undefined): Promise<string[]> => {
  const ids = Array.from(new Set((values ?? []).map((value) => String(value).trim()).filter(Boolean))).slice(0, 24);
  if (!ids.length) return [];
  const persons = await familyGraphRepository.listPersons(familyId);
  const valid = new Set(persons.map((person) => person.id));
  if (ids.some((id) => !valid.has(id))) throw new AppError("PERSON_NOT_FOUND", "PERSON");
  return ids;
};

export const momentsService = {
  reserveId(familyId: string) {
    return doc(collection(getFirestore(), FIRESTORE_PATHS.moments(familyId))).id;
  },

  async publishWithAssets(
    familyId: string,
    postId: string,
    author: { uid: string; displayName: string; avatarUrl?: string },
    input: CreateMomentInput,
    mediaAssetIds: string[],
  ) {
    const timestamp = now();
    const personIds = await validatePersonIds(familyId, input.personIds);
    const post: MomentPost = {
      id: postId,
      familyId,
      authorUid: author.uid,
      authorName: author.displayName,
      ...(author.avatarUrl ? { authorAvatarUrl: author.avatarUrl } : {}),
      caption: input.caption.trim(),
      media: input.media,
      mediaAssetIds: [...mediaAssetIds],
      personIds,
      timelineAudience: input.timelineAudience,
      notifyFamily: input.timelineAudience === "family" && input.notifyFamily === true,
      visibility: "family",
      moderationStatus: "visible",
      moderatedByUid: null,
      moderatedAt: null,
      reactionCounts: emptyCounts(),
      commentCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await mediaService.attachAssetsToDocument(
      mediaAssetIds,
      FIRESTORE_PATHS.moment(familyId, postId),
      post as unknown as Record<string, unknown>,
    );
    return post;
  },

  async create(
    familyId: string,
    author: { uid: string; displayName: string; avatarUrl?: string },
    input: CreateMomentInput,
  ) {
    const db = getFirestore();
    const ref = doc(collection(db, FIRESTORE_PATHS.moments(familyId)));
    const timestamp = now();
    const personIds = await validatePersonIds(familyId, input.personIds);
    const post: MomentPost = {
      id: ref.id,
      familyId,
      authorUid: author.uid,
      authorName: author.displayName,
      ...(author.avatarUrl ? { authorAvatarUrl: author.avatarUrl } : {}),
      caption: input.caption.trim(),
      media: input.media,
      mediaAssetIds: [],
      personIds,
      timelineAudience: input.timelineAudience,
      notifyFamily: input.timelineAudience === "family" && input.notifyFamily === true,
      visibility: "family",
      moderationStatus: "visible",
      moderatedByUid: null,
      moderatedAt: null,
      reactionCounts: emptyCounts(),
      commentCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await setDoc(ref, removeUndefinedDeep(post) as unknown as Record<string, unknown>);
    return post;
  },

  async getById(familyId: string, postId: string) {
    const snapshot = await getDoc(doc(getFirestore(), FIRESTORE_PATHS.moment(familyId, postId)));
    return snapshot.exists()
      ? normalizeMomentPost(snapshot.data() as Record<string, unknown>, postId, familyId)
      : null;
  },

  /**
   * Phase 9.1: bounded, one-shot historical lookup for Home “Ngày này năm xưa”.
   * This intentionally does not add a realtime listener. Each year only reads a tiny
   * date range and the UI keeps at most a few memories.
   */
  async listOnThisDay(familyId: string, date = new Date(), yearsBack = 6, perYearLimit = 12) {
    const month = date.getMonth();
    const day = date.getDate();
    const currentYear = date.getFullYear();
    const years = Array.from({ length: Math.max(0, yearsBack) }, (_, index) => currentYear - index - 1);
    const snapshots = await Promise.all(years.map(async (year) => {
      const start = new Date(year, month, day, 0, 0, 0, 0);
      const end = new Date(year, month, day, 23, 59, 59, 999);
      const snapshot = await getDocs(query(
        collection(getFirestore(), FIRESTORE_PATHS.moments(familyId)),
        orderBy("createdAt", "desc"),
        startAt(end.toISOString()),
        endAt(start.toISOString()),
        limit(perYearLimit),
      ));
      return snapshot.docs.map((item) => normalizeMomentPost(item.data() as Record<string, unknown>, item.id, familyId));
    }));
    return snapshots
      .flat()
      .filter((item) => item.moderationStatus !== "hidden" && item.timelineAudience === "family")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listFamilyTimelineOnce(familyId: string, pageSize = 120) {
    const snapshot = await getDocs(query(collection(getFirestore(), FIRESTORE_PATHS.moments(familyId)), where("timelineAudience", "==", "family"), limit(pageSize)));
    return snapshot.docs.map((item) => normalizeMomentPost(item.data() as Record<string, unknown>, item.id, familyId)).filter((item) => item.moderationStatus !== "hidden").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listForPersonOnce(familyId: string, personId: string, pageSize = 120) {
    const snapshot = await getDocs(query(collection(getFirestore(), FIRESTORE_PATHS.moments(familyId)), where("personIds", "array-contains", personId), limit(pageSize)));
    return snapshot.docs.map((item) => normalizeMomentPost(item.data() as Record<string, unknown>, item.id, familyId)).filter((item) => item.moderationStatus !== "hidden").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  subscribeForPerson(
    familyId: string,
    personId: string,
    onChange: (items: MomentPost[]) => void,
    onError?: (error: unknown) => void,
    pageSize = 24,
  ) {
    return onSnapshot(
      query(
        collection(getFirestore(), FIRESTORE_PATHS.moments(familyId)),
        where("personIds", "array-contains", personId),
        limit(pageSize),
      ),
      (snapshot) => onChange(
        snapshot.docs
          .map((item) => normalizeMomentPost(item.data() as Record<string, unknown>, item.id, familyId))
          .filter((item) => item.moderationStatus !== "hidden")
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      ),
      onError,
    );
  },



  subscribeFamilyTimeline(
    familyId: string,
    onChange: (items: MomentPost[]) => void,
    onError?: (error: unknown) => void,
    pageSize = 60,
  ) {
    return onSnapshot(
      query(
        collection(getFirestore(), FIRESTORE_PATHS.moments(familyId)),
        where("timelineAudience", "==", "family"),
        limit(pageSize),
      ),
      (snapshot) => onChange(
        snapshot.docs
          .map((item) => normalizeMomentPost(item.data() as Record<string, unknown>, item.id, familyId))
          .filter((item) => item.moderationStatus !== "hidden")
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      ),
      onError,
    );
  },

  subscribeAuthoredTimeline(
    familyId: string,
    authorUid: string,
    onChange: (items: MomentPost[]) => void,
    onError?: (error: unknown) => void,
    pageSize = 24,
  ) {
    return onSnapshot(
      query(
        collection(getFirestore(), FIRESTORE_PATHS.moments(familyId)),
        where("authorUid", "==", authorUid),
        limit(pageSize),
      ),
      (snapshot) => onChange(
        snapshot.docs
          .map((item) => normalizeMomentPost(item.data() as Record<string, unknown>, item.id, familyId))
          .filter((item) => item.moderationStatus !== "hidden" && item.timelineAudience === "self" && item.personIds.length === 0)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      ),
      onError,
    );
  },

  /**
   * Small realtime head for the feed. Historical pages are intentionally not listeners.
   * 2,000 Moments therefore do not create 2,000 live documents in memory.
   */
  subscribeLatest(
    familyId: string,
    onChange: (page: MomentPage) => void,
    onError?: (error: unknown) => void,
    pageSize = DATA_LIMITS.moments.initialFeed,
  ) {
    const q = query(
      collection(getFirestore(), FIRESTORE_PATHS.moments(familyId)),
      orderBy("createdAt", "desc"),
      limit(pageSize),
    );
    return onSnapshot(
      q,
      (snapshot) => onChange(pageFromSnapshot(snapshot, familyId, pageSize)),
      onError,
    );
  },

  async listMore(
    familyId: string,
    cursor: MomentPageCursor | null,
    pageSize = DATA_LIMITS.moments.pageSize,
  ): Promise<MomentPage> {
    if (!cursor) return { items: [], cursor: null, hasMore: false };
    const snapshot = await getDocs(query(
      collection(getFirestore(), FIRESTORE_PATHS.moments(familyId)),
      orderBy("createdAt", "desc"),
      startAfter(cursor as never),
      limit(pageSize),
    ));
    return pageFromSnapshot(snapshot, familyId, pageSize);
  },

  /** Backward-compatible bounded listener for older callers. */
  list(
    familyId: string,
    onChange: (posts: MomentPost[]) => void,
    onError?: (error: unknown) => void,
  ) {
    return this.subscribeLatest(familyId, (page) => onChange(page.items), onError);
  },

  async updateOwnPost(
    familyId: string,
    postId: string,
    input: CreateMomentInput,
    mediaAssetIds: string[],
  ) {
    const uid = getAuth().currentUser?.uid;
    if (!uid) throw new AppError("MOMENT_NOT_OWNER", "MOMENT");
    const ref = doc(getFirestore(), FIRESTORE_PATHS.moment(familyId, postId));
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) throw new AppError("MOMENT_NOT_FOUND", "MOMENT");
    const current = normalizeMomentPost(snapshot.data() as Record<string, unknown>, postId, familyId);
    if (current.authorUid !== uid) throw new AppError("MOMENT_NOT_OWNER", "MOMENT");

    const personIds = await validatePersonIds(familyId, input.personIds);
    const nextAssetIds = Array.from(new Set(mediaAssetIds.filter(Boolean)));
    const removedAssetIds = (current.mediaAssetIds ?? []).filter((assetId) => !nextAssetIds.includes(assetId));

    await mediaService.attachAssetsToDocument(
      nextAssetIds,
      FIRESTORE_PATHS.moment(familyId, postId),
      {
        caption: input.caption.trim(),
        media: input.media,
        mediaAssetIds: nextAssetIds,
        personIds,
        timelineAudience: input.timelineAudience,
        notifyFamily: input.timelineAudience === "family" && input.notifyFamily === true,
        updatedAt: now(),
      },
    );

    if (removedAssetIds.length) {
      try {
        await mediaService.markCleanupPendingMany(removedAssetIds);
      } catch {
        // The Moment edit is already committed. Cleanup remains best-effort.
      }
    }
  },

  async updateOwnCaption(familyId: string, postId: string, caption: string) {
    const uid = getAuth().currentUser?.uid;
    if (!uid) throw new AppError("MOMENT_NOT_OWNER", "MOMENT");
    const ref = doc(getFirestore(), FIRESTORE_PATHS.moment(familyId, postId));
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) throw new AppError("MOMENT_NOT_FOUND", "MOMENT");
    const current = normalizeMomentPost(snapshot.data() as Record<string, unknown>, postId, familyId);
    if (current.authorUid !== uid) throw new AppError("MOMENT_NOT_OWNER", "MOMENT");
    await updateDoc(ref, { caption: caption.trim(), updatedAt: now() });
  },

  async delete(familyId: string, postId: string) {
    const uid = getAuth().currentUser?.uid;
    if (!uid) throw new AppError("MOMENT_NOT_OWNER", "MOMENT");
    const ref = doc(getFirestore(), FIRESTORE_PATHS.moment(familyId, postId));
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) return;
    const current = normalizeMomentPost(snapshot.data() as Record<string, unknown>, postId, familyId);
    if (current.authorUid !== uid) throw new AppError("MOMENT_NOT_OWNER", "MOMENT");
    await deleteDoc(ref);
    if (current.mediaAssetIds?.length) {
      try {
        await mediaService.markCleanupPendingMany(current.mediaAssetIds);
      } catch {
        // The post is already gone; keep cleanup as best-effort and preserve ownership semantics.
      }
    }
  },

  async setModerationStatus(
    familyId: string,
    postId: string,
    status: MomentModerationStatus,
  ) {
    const uid = getAuth().currentUser?.uid;
    if (!uid) throw new AppError("MOMENT_MODERATION_DENIED", "MOMENT");
    await updateDoc(doc(getFirestore(), FIRESTORE_PATHS.moment(familyId, postId)), {
      moderationStatus: status,
      moderatedByUid: uid,
      moderatedAt: now(),
      updatedAt: now(),
    });
  },

  subscribeHiddenForModeration(
    familyId: string,
    onChange: (posts: MomentPost[]) => void,
    onError?: (error: unknown) => void,
  ) {
    const q = query(
      collection(getFirestore(), FIRESTORE_PATHS.moments(familyId)),
      where("moderationStatus", "==", "hidden"),
      limit(DATA_LIMITS.moments.initialFeed),
    );
    return onSnapshot(
      q,
      (snapshot) => onChange(
        snapshot.docs
          .map((item) => normalizeMomentPost(item.data() as Record<string, unknown>, item.id, familyId))
          .sort((a, b) => (b.moderatedAt || b.updatedAt).localeCompare(a.moderatedAt || a.updatedAt)),
      ),
      onError,
    );
  },

  reserveCommentId(familyId: string, postId: string) {
    return doc(collection(getFirestore(), FIRESTORE_PATHS.momentComments(familyId, postId))).id;
  },

  async addCommentWithId(
    familyId: string,
    postId: string,
    commentId: string,
    author: { uid: string; displayName: string; avatarUrl?: string },
    text: string,
  ) {
    const clean = text.trim();
    if (!clean) throw new Error("COMMENT_EMPTY");
    const db = getFirestore();
    const commentRef = doc(db, FIRESTORE_PATHS.momentComment(familyId, postId, commentId));
    const postRef = doc(db, FIRESTORE_PATHS.moment(familyId, postId));
    const timestamp = now();
    const comment: MomentComment = {
      id: commentId,
      postId,
      authorUid: author.uid,
      authorName: author.displayName,
      ...(author.avatarUrl ? { authorAvatarUrl: author.avatarUrl } : {}),
      text: clean,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await runTransaction(db, async (tx) => {
      const [postSnap, existingComment] = await Promise.all([
        tx.get(postRef),
        tx.get(commentRef),
      ]);
      if (!postSnap.exists()) throw new Error("MOMENT_NOT_FOUND");
      // Safe retry: if the exact reserved comment already committed, do not
      // increment commentCount a second time.
      if (existingComment.exists()) return;
      const current = normalizeMomentPost(postSnap.data() as Record<string, unknown>, postId, familyId);
      tx.set(commentRef, removeUndefinedDeep(comment) as unknown as Record<string, unknown>);
      tx.update(postRef, {
        commentCount: (current.commentCount || 0) + 1,
        updatedAt: timestamp,
      });
    });
    return comment;
  },

  async addComment(
    familyId: string,
    postId: string,
    author: { uid: string; displayName: string; avatarUrl?: string },
    text: string,
  ) {
    const commentId = this.reserveCommentId(familyId, postId);
    return this.addCommentWithId(familyId, postId, commentId, author, text);
  },

  /**
   * Comments stay lazy and bounded. Phase 5.3 can add an explicit comment-history pager;
   * the collapsed feed never subscribes to comments at all.
   */
  listComments(
    familyId: string,
    postId: string,
    onChange: (comments: MomentComment[]) => void,
    onError?: (error: unknown) => void,
  ) {
    const q = query(
      collection(getFirestore(), FIRESTORE_PATHS.momentComments(familyId, postId)),
      orderBy("createdAt", "desc"),
      limit(DATA_LIMITS.moments.commentsPage),
    );
    return onSnapshot(
      q,
      (snapshot) => onChange(
        snapshot.docs.map((item) => item.data() as MomentComment),
      ),
      onError,
    );
  },


  /**
   * Older comments are fetched on demand in small pages. The feed never listens
   * to the whole comment history, even when a Moment has hundreds of replies.
   */
  async listOlderComments(
    familyId: string,
    postId: string,
    beforeCreatedAt: string,
    pageSize = DATA_LIMITS.moments.commentsPage,
  ): Promise<MomentCommentPage> {
    const snapshot = await getDocs(query(
      collection(getFirestore(), FIRESTORE_PATHS.momentComments(familyId, postId)),
      where("createdAt", "<", beforeCreatedAt),
      orderBy("createdAt", "desc"),
      limit(pageSize),
    ));
    const items = snapshot.docs.map((item) => item.data() as MomentComment);
    return {
      items,
      cursor: items.length ? items[items.length - 1].createdAt : null,
      hasMore: snapshot.docs.length >= pageSize,
    };
  },

  async setReaction(
    familyId: string,
    postId: string,
    uid: string,
    reaction: MomentReaction | null,
  ) {
    const db = getFirestore();
    const postRef = doc(db, FIRESTORE_PATHS.moment(familyId, postId));
    const reactionRef = doc(db, FIRESTORE_PATHS.momentReaction(familyId, postId, uid));
    const timestamp = now();

    return runTransaction(db, async (tx) => {
      const [postSnap, oldSnap] = await Promise.all([tx.get(postRef), tx.get(reactionRef)]);
      if (!postSnap.exists()) throw new Error("MOMENT_NOT_FOUND");

      const post = normalizeMomentPost(postSnap.data() as Record<string, unknown>, postId, familyId);
      const counts = { ...emptyCounts(), ...(post.reactionCounts || {}) };
      const old = oldSnap.exists() ? oldSnap.data() as MomentReactionRecord : null;

      if (old?.reaction === reaction) return { reactionCounts: counts, reaction };

      if (old) {
        counts[old.reaction] = Math.max(0, (counts[old.reaction] || 0) - 1);
      }

      if (reaction) {
        counts[reaction] = (counts[reaction] || 0) + 1;
        tx.set(reactionRef, {
          uid,
          reaction,
          createdAt: old?.createdAt || timestamp,
          updatedAt: timestamp,
        });
      } else {
        tx.delete(reactionRef);
      }

      tx.update(postRef, { reactionCounts: counts, updatedAt: timestamp });
      return { reactionCounts: counts, reaction };
    });
  },

  /** Backward-compatible toggle API for any older caller. */
  async react(familyId: string, postId: string, uid: string, reaction: MomentReaction) {
    const current = await this.getMyReaction(familyId, postId, uid);
    return this.setReaction(familyId, postId, uid, current?.reaction === reaction ? null : reaction);
  },

  async listReactionsPage(
    familyId: string,
    postId: string,
    cursor: MomentReactionPageCursor | null = null,
    pageSize = DATA_LIMITS.moments.reactionsPage,
  ): Promise<MomentReactionPage> {
    const reactionCollection = collection(getFirestore(), FIRESTORE_PATHS.momentReactions(familyId, postId));
    const q = cursor
      ? query(reactionCollection, orderBy("updatedAt", "desc"), startAfter(cursor as never), limit(pageSize))
      : query(reactionCollection, orderBy("updatedAt", "desc"), limit(pageSize));
    const snapshot = await getDocs(q);
    return {
      items: snapshot.docs.map((item) => item.data() as MomentReactionRecord),
      cursor: snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] as unknown : null,
      hasMore: snapshot.docs.length >= pageSize,
    };
  },

  async getMyReaction(familyId: string, postId: string, uid: string) {
    const snapshot = await getDoc(doc(getFirestore(), FIRESTORE_PATHS.momentReaction(familyId, postId, uid)));
    return snapshot.exists() ? (snapshot.data() as MomentReactionRecord) : null;
  },
};
