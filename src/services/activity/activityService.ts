import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from "@react-native-firebase/firestore";
import type {
  FamilyActivity,
  FamilyActivityImportance,
  FamilyActivityPage,
  FamilyEvent,
  MomentPost,
} from "../../types";
import { removeUndefinedDeep } from "../../utils/firestore";
import { familyGraphRepository } from "../familyGraph/familyGraphRepository";
import { FIRESTORE_PATHS } from "../firebase/firestorePaths";

const nowIso = () => new Date().toISOString();
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";

const normalizeActivity = (
  raw: Record<string, unknown>,
  fallbackId: string,
  fallbackFamilyId: string,
): FamilyActivity => ({
  id: clean(raw.id) || fallbackId,
  familyId: clean(raw.familyId) || fallbackFamilyId,
  kind: raw.kind === "event" || raw.kind === "graph" || raw.kind === "review" || raw.kind === "home" ? raw.kind : "moment",
  audience: raw.audience === "target" ? "target" : "family",
  targetUid: clean(raw.targetUid) || null,
  actorUid: clean(raw.actorUid),
  actorName: clean(raw.actorName) || "Một thành viên",
  title: clean(raw.title) || "Chuyện mới trong nhà",
  body: clean(raw.body) || null,
  sourceType: raw.sourceType === "event" || raw.sourceType === "graph" || raw.sourceType === "join_request" || raw.sourceType === "graph_proposal" || raw.sourceType === "home_time_capsule"
    ? raw.sourceType
    : "moment",
  sourceId: clean(raw.sourceId) || null,
  importance: raw.importance === "important" || raw.importance === "notable" ? raw.importance : "normal",
  badgeEligible: raw.badgeEligible === true,
  createdAt: clean(raw.createdAt) || nowIso(),
});

const writeFamilyActivity = async (activity: FamilyActivity) => {
  await setDoc(
    doc(getFirestore(), FIRESTORE_PATHS.familyActivity(activity.familyId, activity.id)),
    removeUndefinedDeep(activity) as unknown as Record<string, unknown>,
  );
};

const writeTargetActivity = async (activity: FamilyActivity & { targetUid: string }) => {
  await setDoc(
    doc(getFirestore(), FIRESTORE_PATHS.memberActivity(activity.familyId, activity.targetUid, activity.id)),
    removeUndefinedDeep(activity) as unknown as Record<string, unknown>,
  );
};


const resolveLinkedUidForPerson = async (familyId: string, personId: string): Promise<string | null> => {
  const person = await familyGraphRepository.getPerson(familyId, personId);
  const direct = person?.linkedUid?.trim() || "";
  if (direct) return direct;

  // Defensive fallback for older/partially synced graph data: the canonical
  // personLinks projection may exist even when the Person document projection
  // has not been refreshed yet. This keeps targeted Moment activity reliable.
  const snapshot = await getDocs(query(
    collection(getFirestore(), FIRESTORE_PATHS.familyPersonLinks(familyId)),
    where("personId", "==", personId),
    limit(2),
  ));
  const match = snapshot.docs[0];
  if (!match) return null;
  const raw = match.data() as Record<string, unknown>;
  return clean(raw.uid) || match.id || null;
};



type BadgeSummary = { count: number; updatedAt: string | null };
type BadgeCacheEntry = { count: number; expiresAt: number };
const badgeCache = new Map<string, BadgeCacheEntry>();
const BADGE_CACHE_TTL_MS = 12_000;
const badgeCacheKey = (familyId: string, uid: string) => `${familyId}:${uid}`;

const normalizeBadgeSummary = (raw: Record<string, unknown> | undefined): BadgeSummary => ({
  count: typeof raw?.count === "number" && Number.isFinite(raw.count) ? Math.max(0, Math.floor(raw.count)) : 0,
  updatedAt: clean(raw?.updatedAt) || null,
});

const readBadgeSummary = async (path: string): Promise<BadgeSummary> => {
  const snap = await getDoc(doc(getFirestore(), path));
  return normalizeBadgeSummary(snap.exists() ? snap.data() as Record<string, unknown> : undefined);
};

const writeActivityWithBadgeSummary = async (activity: FamilyActivity) => {
  if (!activity.badgeEligible) {
    if (activity.audience === "target" && activity.targetUid) {
      await writeTargetActivity(activity as FamilyActivity & { targetUid: string });
    } else {
      await writeFamilyActivity(activity);
    }
    return;
  }

  const db = getFirestore();
  const activityRef = activity.audience === "target" && activity.targetUid
    ? doc(db, FIRESTORE_PATHS.memberActivity(activity.familyId, activity.targetUid, activity.id))
    : doc(db, FIRESTORE_PATHS.familyActivity(activity.familyId, activity.id));
  const summaryRef = activity.audience === "target" && activity.targetUid
    ? doc(db, FIRESTORE_PATHS.memberActivityBadgeSummary(activity.familyId, activity.targetUid))
    : doc(db, FIRESTORE_PATHS.familyActivityBadgeSummary(activity.familyId));
  const actorMemberRef = activity.audience === "family"
    ? doc(db, FIRESTORE_PATHS.familyMember(activity.familyId, activity.actorUid))
    : null;

  await runTransaction(db, async (tx) => {
    const [existingActivity, summarySnap, actorMemberSnap] = await Promise.all([
      tx.get(activityRef),
      tx.get(summaryRef),
      actorMemberRef ? tx.get(actorMemberRef) : Promise.resolve(null),
    ]);
    // Activity ids are deterministic. Retries must never increment the badge twice.
    if (existingActivity.exists()) return;
    const current = normalizeBadgeSummary(summarySnap.exists() ? summarySnap.data() as Record<string, unknown> : undefined);
    tx.set(activityRef, removeUndefinedDeep(activity) as unknown as Record<string, unknown>);
    tx.set(summaryRef, removeUndefinedDeep({
      familyId: activity.familyId,
      ...(activity.targetUid ? { uid: activity.targetUid } : {}),
      count: current.count + 1,
      updatedAt: activity.createdAt,
      lastActivityId: activity.id,
    }) as unknown as Record<string, unknown>);

    // Family-wide badge counters are shared by every member. Track how many of those
    // were authored by this user so their own posts/events never light their bell.
    if (actorMemberRef && actorMemberSnap?.exists()) {
      const raw = actorMemberSnap.data() as Record<string, unknown>;
      const authored = typeof raw.activitySelfAuthoredBadgeCount === "number"
        ? Math.max(0, Math.floor(raw.activitySelfAuthoredBadgeCount))
        : 0;
      tx.update(actorMemberRef, { activitySelfAuthoredBadgeCount: authored + 1 });
    }
  });
};

const eventLabel = (event: FamilyEvent) => {
  if (event.eventType === "birthday") return "Sinh nhật";
  if (event.eventType === "memorial") return "Ngày giỗ";
  if (event.eventType === "wedding") return "Cưới hỏi";
  if (event.eventType === "travel") return "Chuyến đi";
  if (event.eventType === "gathering") return "Họp mặt";
  if (event.eventType === "anniversary") return "Ngày kỷ niệm";
  return "Sự kiện";
};

const eventImportance = (event: FamilyEvent): FamilyActivityImportance =>
  event.notificationLevel === "important" ? "important" : event.notificationLevel === "notable" ? "notable" : "normal";

const sourceRoute = (activity: FamilyActivity) => {
  if (!activity.sourceId) return null;
  if (activity.sourceType === "event") return `/event/${activity.sourceId}`;
  if (activity.sourceType === "moment") return `/(tabs)/moments?momentId=${encodeURIComponent(activity.sourceId)}`;
  if (activity.sourceType === "graph") return "/family-graph";
  if (activity.sourceType === "join_request") return "/family-join-requests";
  if (activity.sourceType === "graph_proposal") return "/family-graph-proposals";
  if (activity.sourceType === "home_time_capsule") return activity.sourceId ? `/home-time-capsule/${activity.sourceId}` : "/home-time-capsules";
  return null;
};

export const activityService = {
  routeFor(activity: FamilyActivity) {
    return sourceRoute(activity);
  },

  async createForMoment(post: MomentPost): Promise<void> {
    if (post.timelineAudience === "self") return;
    const timestamp = nowIso();

    if (post.timelineAudience === "family") {
      await writeActivityWithBadgeSummary({
        id: `moment-${post.id}-family`,
        familyId: post.familyId,
        kind: "moment",
        audience: "family",
        targetUid: null,
        actorUid: post.authorUid,
        actorName: post.authorName,
        title: `${post.authorName} vừa thêm một kỷ niệm cho cả nhà`,
        body: post.caption || "Một khoảnh khắc mới vừa được lưu lại.",
        sourceType: "moment",
        sourceId: post.id,
        importance: post.notifyFamily ? "notable" : "normal",
        badgeEligible: post.notifyFamily,
        createdAt: timestamp,
      });
      return;
    }

    const resolvedTargets = await Promise.all(
      post.personIds.map((personId) => resolveLinkedUidForPerson(post.familyId, personId).catch(() => null)),
    );
    const targetUids = Array.from(new Set(
      resolvedTargets.filter((uid): uid is string => !!uid && uid !== post.authorUid),
    ));

    await Promise.all(targetUids.map((targetUid) => writeActivityWithBadgeSummary({
      id: `moment-${post.id}-tag`,
      familyId: post.familyId,
      kind: "moment",
      audience: "target",
      targetUid,
      actorUid: post.authorUid,
      actorName: post.authorName,
      title: `${post.authorName} vừa thêm một kỷ niệm có bạn`,
      body: post.caption || "Một kỷ niệm mới vừa được gắn với câu chuyện của bạn.",
      sourceType: "moment",
      sourceId: post.id,
      importance: "notable",
      badgeEligible: true,
      createdAt: timestamp,
    })));
  },

  async createForEvent(event: FamilyEvent, actorName: string): Promise<void> {
    const timestamp = nowIso();
    const importance = eventImportance(event);
    const badgeEligible = importance !== "normal";
    const title = `${eventLabel(event)} · ${event.title}`;
    const body = event.location ? `${actorName} đã thêm vào Lịch nhà · ${event.location}` : `${actorName} đã thêm vào Lịch nhà.`;

    if (event.participantsMode === "all") {
      await writeActivityWithBadgeSummary({
        id: `event-${event.id}-family`,
        familyId: event.familyId,
        kind: "event",
        audience: "family",
        targetUid: null,
        actorUid: event.createdByUid,
        actorName,
        title,
        body,
        sourceType: "event",
        sourceId: event.id,
        importance,
        badgeEligible,
        createdAt: timestamp,
      });
      return;
    }

    const targets = Array.from(new Set(event.participantIds.filter((uid) => uid && uid !== event.createdByUid)));
    await Promise.all(targets.map((targetUid) => writeActivityWithBadgeSummary({
      id: `event-${event.id}-invite`,
      familyId: event.familyId,
      kind: "event",
      audience: "target",
      targetUid,
      actorUid: event.createdByUid,
      actorName,
      title,
      body,
      sourceType: "event",
      sourceId: event.id,
      importance,
      badgeEligible,
      createdAt: timestamp,
    })));
  },

  async createGraphNotice(input: {
    familyId: string;
    actorUid: string;
    actorName: string;
    title: string;
    body: string;
    sessionId: string;
  }): Promise<void> {
    await writeActivityWithBadgeSummary({
      id: `graph-${input.sessionId}`,
      familyId: input.familyId,
      kind: "graph",
      audience: "family",
      targetUid: null,
      actorUid: input.actorUid,
      actorName: input.actorName,
      title: input.title,
      body: input.body,
      sourceType: "graph",
      sourceId: null,
      importance: "notable",
      badgeEligible: true,
      createdAt: nowIso(),
    });
  },

  async createTimeCapsuleWaitingNotices(input: {
    familyId: string;
    capsuleId: string;
    actorUid: string;
    actorName: string;
    recipientUids: string[];
  }): Promise<void> {
    const recipients = Array.from(new Set(input.recipientUids.filter(uid => uid && uid !== input.actorUid)));
    if (!recipients.length) return;
    const timestamp = nowIso();
    await Promise.all(recipients.map(targetUid => writeActivityWithBadgeSummary({
      id: `time-capsule-${input.capsuleId}-waiting`,
      familyId: input.familyId,
      kind: "home",
      audience: "target",
      targetUid,
      actorUid: input.actorUid,
      actorName: input.actorName || "Người thân",
      title: "Có một Hộp thời gian đang chờ bạn 🎁",
      body: "Nội dung vẫn được khóa. Bloom sẽ nhắc bạn khi đến đúng giờ mở.",
      sourceType: "home_time_capsule",
      sourceId: input.capsuleId,
      importance: "notable",
      badgeEligible: true,
      createdAt: timestamp,
    })));
  },

  async createTimeCapsuleOpenedNotice(input: {
    familyId: string;
    capsuleId: string;
    creatorUid: string;
    openerUid: string;
    openerName: string;
    openedCount: number;
    recipientCount: number;
  }): Promise<void> {
    if (!input.creatorUid || input.creatorUid === input.openerUid) return;
    const allOpened = input.recipientCount > 0 && input.openedCount >= input.recipientCount;
    await writeActivityWithBadgeSummary({
      id: `time-capsule-${input.capsuleId}-opened-${input.openerUid}`,
      familyId: input.familyId,
      kind: "home",
      audience: "target",
      targetUid: input.creatorUid,
      actorUid: input.openerUid,
      actorName: input.openerName || "Người thân",
      title: allOpened ? "Hộp thời gian đã được mở hết 🎁" : "Hộp thời gian vừa được mở 🎁",
      body: allOpened
        ? `${input.openerName || "Một người thân"} vừa mở hộp. Tất cả người nhận đã mở lời bạn gửi.`
        : `${input.openerName || "Một người thân"} vừa mở Hộp thời gian bạn đã gửi.`,
      sourceType: "home_time_capsule",
      sourceId: input.capsuleId,
      importance: "notable",
      badgeEligible: true,
      createdAt: nowIso(),
    });
  },

  async listForUser(familyId: string, uid: string, pageSize = 60): Promise<FamilyActivityPage> {
    if (!familyId || !uid) return { items: [], lastSeenAt: null, unreadBadgeCount: 0 };
    const db = getFirestore();
    const [familySnapshot, inboxSnapshot, memberSnapshot] = await Promise.all([
      getDocs(query(collection(db, FIRESTORE_PATHS.familyActivities(familyId)), orderBy("createdAt", "desc"), limit(pageSize))),
      getDocs(query(collection(db, FIRESTORE_PATHS.memberActivities(familyId, uid)), orderBy("createdAt", "desc"), limit(pageSize))),
      getDoc(doc(db, FIRESTORE_PATHS.familyMember(familyId, uid))),
    ]);

    const familyItems = familySnapshot.docs.map((item) => normalizeActivity(item.data() as Record<string, unknown>, item.id, familyId));
    const targetItems = inboxSnapshot.docs.map((item) => normalizeActivity(item.data() as Record<string, unknown>, item.id, familyId));
    const items = [...familyItems, ...targetItems]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, pageSize);
    const memberRaw = memberSnapshot.exists() ? memberSnapshot.data() as Record<string, unknown> : {};
    const lastSeenAt = clean(memberRaw.activityLastSeenAt) || null;
    const unreadBadgeCount = items.filter((item) => item.badgeEligible && item.actorUid !== uid && (!lastSeenAt || item.createdAt > lastSeenAt)).length;
    return { items, lastSeenAt, unreadBadgeCount };
  },

  async unreadBadgeCount(familyId: string, uid: string, options?: { force?: boolean }): Promise<number> {
    if (!familyId || !uid) return 0;
    const key = badgeCacheKey(familyId, uid);
    const cached = badgeCache.get(key);
    if (!options?.force && cached && cached.expiresAt > Date.now()) return cached.count;

    const db = getFirestore();
    const [memberSnapshot, familySummary, targetSummary] = await Promise.all([
      getDoc(doc(db, FIRESTORE_PATHS.familyMember(familyId, uid))),
      readBadgeSummary(FIRESTORE_PATHS.familyActivityBadgeSummary(familyId)),
      readBadgeSummary(FIRESTORE_PATHS.memberActivityBadgeSummary(familyId, uid)),
    ]);
    const memberRaw = memberSnapshot.exists() ? memberSnapshot.data() as Record<string, unknown> : {};
    const seenFamilyCount = typeof memberRaw.activityFamilySeenCount === "number" ? Math.max(0, Math.floor(memberRaw.activityFamilySeenCount)) : 0;
    const seenTargetCount = typeof memberRaw.activityTargetSeenCount === "number" ? Math.max(0, Math.floor(memberRaw.activityTargetSeenCount)) : 0;
    const selfAuthoredCount = typeof memberRaw.activitySelfAuthoredBadgeCount === "number" ? Math.max(0, Math.floor(memberRaw.activitySelfAuthoredBadgeCount)) : 0;
    const seenSelfAuthoredCount = typeof memberRaw.activitySelfAuthoredSeenCount === "number" ? Math.max(0, Math.floor(memberRaw.activitySelfAuthoredSeenCount)) : 0;
    const selfAuthoredUnread = Math.max(0, selfAuthoredCount - seenSelfAuthoredCount);
    const familyUnread = Math.max(0, familySummary.count - seenFamilyCount - selfAuthoredUnread);
    const count = familyUnread + Math.max(0, targetSummary.count - seenTargetCount);
    badgeCache.set(key, { count, expiresAt: Date.now() + BADGE_CACHE_TTL_MS });
    return count;
  },

  invalidateBadgeCache(familyId?: string, uid?: string) {
    if (familyId && uid) {
      badgeCache.delete(badgeCacheKey(familyId, uid));
      return;
    }
    badgeCache.clear();
  },

  async markAllSeen(familyId: string, uid: string): Promise<string> {
    const timestamp = nowIso();
    const db = getFirestore();
    const memberRef = doc(db, FIRESTORE_PATHS.familyMember(familyId, uid));
    const [familySummary, targetSummary, memberSnapshot] = await Promise.all([
      readBadgeSummary(FIRESTORE_PATHS.familyActivityBadgeSummary(familyId)),
      readBadgeSummary(FIRESTORE_PATHS.memberActivityBadgeSummary(familyId, uid)),
      getDoc(memberRef),
    ]);
    const memberRaw = memberSnapshot.exists() ? memberSnapshot.data() as Record<string, unknown> : {};
    const selfAuthoredCount = typeof memberRaw.activitySelfAuthoredBadgeCount === "number"
      ? Math.max(0, Math.floor(memberRaw.activitySelfAuthoredBadgeCount))
      : 0;
    await updateDoc(memberRef, {
      activityLastSeenAt: timestamp,
      activityFamilySeenCount: familySummary.count,
      activityTargetSeenCount: targetSummary.count,
      activitySelfAuthoredSeenCount: selfAuthoredCount,
    });
    badgeCache.set(badgeCacheKey(familyId, uid), { count: 0, expiresAt: Date.now() + BADGE_CACHE_TTL_MS });
    return timestamp;
  },
};
