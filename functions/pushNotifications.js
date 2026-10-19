const { onDocumentCreated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

const REGION = "asia-southeast1";
const HOUR = 60 * 60 * 1000;
const INVALID_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

const clean = (value) => typeof value === "string" ? value.trim() : "";
const asArray = (value) => Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()) : [];
const pushEnabled = (profile) => profile?.pushNotificationsEnabled !== false;
const smartPrefs = (profile) => {
  const raw = profile?.smartReminderPreferences || {};
  return {
    birthdays: typeof raw.birthdays === "boolean" ? raw.birthdays : true,
    memorials: typeof raw.memorials === "boolean" ? raw.memorials : true,
    events: typeof raw.events === "boolean" ? raw.events : true,
  };
};

const categoryAllowed = (profile, category) => {
  if (!pushEnabled(profile)) return false;
  const prefs = smartPrefs(profile);
  if (category === "birthday") return prefs.birthdays;
  if (category === "memorial") return prefs.memorials;
  if (category === "event") return prefs.events;
  return true;
};

const categoryForEvent = (event) => {
  if (event?.eventType === "birthday") return "birthday";
  if (event?.eventType === "memorial") return "memorial";
  return "event";
};

const importanceForEvent = (event) => {
  if (event?.notificationLevel === "important") return "important";
  if (event?.notificationLevel === "notable") return "notable";
  if (event?.eventType === "birthday" || event?.eventType === "memorial") return "notable";
  return "normal";
};

const channelFor = (importance) => importance === "important"
  ? "bloom_important"
  : importance === "notable" ? "bloom_notable" : "bloom_normal";

const androidPriorityFor = (importance) => importance === "important" ? "high" : "normal";

const tokenDocsForUid = async (uid) => {
  const db = getFirestore();
  const snap = await db.collection(`users/${uid}/pushTokens`).get();
  return snap.docs
    .map((item) => ({ ref: item.ref, ...item.data() }))
    .filter((item) => item.enabled === true && item.permissionGranted === true && clean(item.token));
};

const cleanupInvalidTokens = async (tokenDocs, response) => {
  const deletes = [];
  response.responses.forEach((result, index) => {
    const code = result.error?.code;
    if (code && INVALID_TOKEN_CODES.has(code) && tokenDocs[index]?.ref) deletes.push(tokenDocs[index].ref.delete());
  });
  await Promise.allSettled(deletes);
};

const sendToUid = async (uid, payload, category = "always") => {
  const db = getFirestore();
  const profileSnap = await db.doc(`users/${uid}`).get();
  const profile = profileSnap.exists ? profileSnap.data() : {};
  if (!categoryAllowed(profile, category)) return { sent: 0, skipped: true };
  const tokenDocs = await tokenDocsForUid(uid);
  if (!tokenDocs.length) return { sent: 0, skipped: true };

  const importance = payload.importance === "important" || payload.importance === "notable" ? payload.importance : "normal";
  const message = {
    tokens: tokenDocs.map((item) => item.token),
    notification: {
      title: clean(payload.title) || "Chuyện mới trong nhà",
      body: clean(payload.body) || "Mở Family Bloom để xem nhé.",
    },
    data: {
      familyId: clean(payload.familyId),
      sourceType: clean(payload.sourceType),
      sourceId: clean(payload.sourceId),
      importance,
      notificationId: clean(payload.notificationId),
    },
    android: {
      priority: androidPriorityFor(importance),
      notification: {
        channelId: channelFor(importance),
        tag: clean(payload.notificationId) || "bloom",
      },
    },
  };
  const response = await getMessaging().sendEachForMulticast(message);
  await cleanupInvalidTokens(tokenDocs, response);
  return { sent: response.successCount, failed: response.failureCount };
};

const loadEventForActivity = async (activity) => {
  if (activity?.sourceType !== "event" || !clean(activity?.sourceId) || !clean(activity?.familyId)) return null;
  const snap = await getFirestore().doc(`families/${activity.familyId}/events/${activity.sourceId}`).get();
  return snap.exists ? snap.data() : null;
};

const activityPayload = (activity, notificationId) => ({
  familyId: clean(activity.familyId),
  sourceType: clean(activity.sourceType),
  sourceId: clean(activity.sourceId),
  importance: activity.importance === "important" || activity.importance === "notable" ? activity.importance : "normal",
  notificationId,
  title: clean(activity.title) || "Chuyện mới trong nhà",
  body: clean(activity.body) || "Mở Family Bloom để xem nhé.",
});

const adminUidsForFamily = async (familyId) => {
  const snap = await getFirestore().collection(`families/${familyId}/members`).get();
  return snap.docs
    .filter((item) => {
      const role = clean(item.data()?.role);
      return role === "owner" || role === "admin";
    })
    .map((item) => item.id)
    .filter(Boolean);
};

exports.pushFamilyActivityCreated = onDocumentCreated(
  { document: "families/{familyId}/activities/{activityId}", region: REGION, retry: false },
  async (event) => {
    const activity = event.data?.data();
    if (!activity || activity.badgeEligible !== true) return;
    const familyId = event.params.familyId;
    const actorUid = clean(activity.actorUid);
    const [members, sourceEvent] = await Promise.all([
      getFirestore().collection(`families/${familyId}/members`).get(),
      loadEventForActivity(activity),
    ]);
    const category = sourceEvent ? categoryForEvent(sourceEvent) : "always";
    const payload = activityPayload({ ...activity, familyId }, `family:${familyId}:${event.params.activityId}`);
    const uids = members.docs.map((item) => item.id).filter((uid) => uid && uid !== actorUid);
    await Promise.allSettled(uids.map((uid) => sendToUid(uid, payload, category)));
  },
);

exports.pushTargetActivityCreated = onDocumentCreated(
  { document: "families/{familyId}/members/{uid}/activities/{activityId}", region: REGION, retry: false },
  async (event) => {
    const activity = event.data?.data();
    if (!activity || activity.badgeEligible !== true) return;
    const uid = event.params.uid;
    if (!uid || uid === clean(activity.actorUid)) return;
    const sourceEvent = await loadEventForActivity(activity);
    const category = sourceEvent ? categoryForEvent(sourceEvent) : "always";
    await sendToUid(uid, activityPayload({ ...activity, familyId: event.params.familyId }, `target:${event.params.familyId}:${uid}:${event.params.activityId}`), category);
  },
);

// Review work is intentionally pushed only to the people who can act on it.
// These triggers do not create Activity documents and therefore do not add any
// realtime listener or duplicate the existing in-app review indicators.
exports.pushJoinRequestCreated = onDocumentCreated(
  { document: "families/{familyId}/joinRequests/{uid}", region: REGION, retry: false },
  async (event) => {
    const request = event.data?.data();
    if (!request || request.status !== "pending") return;
    const { familyId, uid } = event.params;
    const admins = (await adminUidsForFamily(familyId)).filter((adminUid) => adminUid !== uid);
    if (!admins.length) return;
    const displayName = clean(request.applicant?.displayName) || "Một thành viên";
    const familyName = clean(request.familyName);
    const payload = {
      familyId,
      sourceType: "join_request",
      sourceId: uid,
      importance: "notable",
      notificationId: `join:${familyId}:${uid}`,
      title: "Có người muốn vào nhà",
      body: familyName
        ? `${displayName} vừa gửi yêu cầu gia nhập ${familyName}.`
        : `${displayName} vừa gửi yêu cầu gia nhập gia đình.`,
    };
    await Promise.allSettled(admins.map((adminUid) => sendToUid(adminUid, payload, "always")));
  },
);

exports.pushGraphProposalCreated = onDocumentCreated(
  { document: "families/{familyId}/graphProposals/{proposalId}", region: REGION, retry: false },
  async (event) => {
    const proposal = event.data?.data();
    if (!proposal || proposal.status !== "pending") return;
    const { familyId, proposalId } = event.params;
    const actorUid = clean(proposal.createdByUid);
    const admins = (await adminUidsForFamily(familyId)).filter((uid) => uid !== actorUid);
    if (!admins.length) return;
    const actionLabel = proposal.action === "create" ? "thêm" : proposal.action === "delete" ? "xóa" : "cập nhật";
    const entityLabel = proposal.entity === "relationships" ? "quan hệ" : "thành viên";
    const payload = {
      familyId,
      sourceType: "graph_proposal",
      sourceId: proposalId,
      importance: "notable",
      notificationId: `proposal:${familyId}:${proposalId}`,
      title: "Có đề xuất phả hệ mới",
      body: `Một thành viên vừa đề xuất ${actionLabel} ${entityLabel}.`,
    };
    await Promise.allSettled(admins.map((uid) => sendToUid(uid, payload, "always")));
  },
);

const nextOccurrence = (event, now = new Date()) => {
  const base = new Date(event.dateISO);
  if (Number.isNaN(base.getTime())) return null;
  if (event.recurrence !== "yearly") return base;
  const next = new Date(base);
  next.setUTCFullYear(now.getUTCFullYear());
  if (next.getTime() < now.getTime() - 6 * HOUR) next.setUTCFullYear(next.getUTCFullYear() + 1);
  return next;
};

const reminderCopy = (event, stage) => {
  const type = event.eventType === "birthday" ? "sinh nhật"
    : event.eventType === "memorial" ? "ngày giỗ"
      : event.eventType === "anniversary" ? "ngày kỷ niệm"
        : event.eventType === "wedding" ? "cưới hỏi"
          : event.eventType === "gathering" ? "buổi họp mặt"
            : event.eventType === "travel" ? "chuyến đi" : "sự kiện";
  if (stage === "tomorrow") {
    return { title: `Ngày mai là ${type} · ${event.title}`, body: event.location ? `Bloom nhắc bạn trước một ngày · ${event.location}` : "Bloom nhắc bạn trước một ngày để cả nhà không bỏ lỡ." };
  }
  if (stage === "today") {
    return event.eventType === "memorial"
      ? { title: `Hôm nay là ${type} · ${event.title}`, body: event.location ? `Một lời nhắc nhẹ để gia đình cùng nhớ đến ngày này · ${event.location}` : "Một lời nhắc nhẹ để gia đình cùng nhớ đến ngày này." }
      : { title: `Hôm nay có ${type} · ${event.title}`, body: event.location ? `Một ngày đáng nhớ của nhà mình · ${event.location}` : "Một ngày đáng nhớ của nhà mình đã đến." };
  }
  return { title: `Sắp đến giờ · ${event.title}`, body: event.location ? `Còn không lâu nữa là đến giờ · ${event.location}` : "Còn không lâu nữa là đến giờ." };
};

const jobIdFor = (familyId, eventId, occurrence, stage) => {
  const key = occurrence.toISOString().slice(0, 10).replace(/-/g, "");
  return `${familyId}_${eventId}_${key}_${stage}`.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 500);
};

const buildJobs = (familyId, eventId, event, now = new Date()) => {
  if (!event || event.moderationStatus === "hidden") return [];
  const occurrence = nextOccurrence(event, now);
  if (!occurrence) return [];
  if (event.recurrence !== "yearly" && occurrence.getTime() < now.getTime() - HOUR) return [];

  const special = event.eventType === "birthday" || event.eventType === "memorial";
  const importance = importanceForEvent(event);
  const stages = [];
  if (special) {
    stages.push({ stage: "tomorrow", offsetMs: event.allDay ? -27 * HOUR : -24 * HOUR });
    stages.push({ stage: "today", offsetMs: -3 * HOUR });
  } else if (importance === "important") {
    stages.push({ stage: "tomorrow", offsetMs: event.allDay ? -27 * HOUR : -24 * HOUR });
    stages.push({ stage: "soon", offsetMs: -3 * HOUR });
  } else if (importance === "notable") {
    stages.push({ stage: "tomorrow", offsetMs: event.allDay ? -27 * HOUR : -24 * HOUR });
  } else if (!event.allDay) {
    stages.push({ stage: "soon", offsetMs: -3 * HOUR });
  }

  return stages.flatMap(({ stage, offsetMs }) => {
    let dueMs = occurrence.getTime() + offsetMs;
    if (dueMs < now.getTime()) {
      if (occurrence.getTime() <= now.getTime() || dueMs < now.getTime() - 6 * HOUR) return [];
      dueMs = now.getTime() + 15_000;
    }
    const copy = reminderCopy(event, stage);
    return [{
      id: jobIdFor(familyId, eventId, occurrence, stage),
      familyId,
      eventId,
      eventPath: `families/${familyId}/events/${eventId}`,
      eventUpdatedAt: clean(event.updatedAt),
      stage,
      relativeOffsetMs: offsetMs,
      occurrenceISO: occurrence.toISOString(),
      dueAt: Timestamp.fromDate(new Date(dueMs)),
      importance,
      title: copy.title,
      body: copy.body,
      status: "pending",
      createdAt: new Date().toISOString(),
    }];
  });
};

const deleteJobsForEvent = async (eventPath) => {
  const db = getFirestore();
  const snap = await db.collection("pushJobs").where("eventPath", "==", eventPath).get();
  const batch = db.batch();
  snap.docs.forEach((item) => batch.delete(item.ref));
  if (!snap.empty) await batch.commit();
};

exports.syncEventPushJobs = onDocumentWritten(
  { document: "families/{familyId}/events/{eventId}", region: REGION, retry: false },
  async (change) => {
    const { familyId, eventId } = change.params;
    const path = `families/${familyId}/events/${eventId}`;
    await deleteJobsForEvent(path);
    const after = change.data?.after;
    if (!after?.exists) return;
    const event = after.data();
    const jobs = buildJobs(familyId, eventId, event, new Date());
    if (!jobs.length) return;
    const db = getFirestore();
    const batch = db.batch();
    jobs.forEach((job) => batch.set(db.doc(`pushJobs/${job.id}`), job));
    await batch.commit();
  },
);

const recipientUidsForEvent = async (familyId, event) => {
  if (event.participantsMode === "selected") return Array.from(new Set(asArray(event.participantIds)));
  const members = await getFirestore().collection(`families/${familyId}/members`).get();
  return members.docs.map((item) => item.id).filter(Boolean);
};

const claimJob = async (ref) => {
  const db = getFirestore();
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return false;
    const raw = snap.data() || {};
    const processingAt = clean(raw.processingAt);
    const staleProcessing = raw.status === "processing"
      && processingAt
      && (Date.now() - new Date(processingAt).getTime()) > 30 * 60 * 1000;
    if (raw.status !== "pending" && !staleProcessing) return false;
    tx.update(ref, { status: "processing", processingAt: new Date().toISOString() });
    return true;
  });
};

const scheduleNextYear = async (job, event) => {
  if (event.recurrence !== "yearly") return;
  const occurrence = new Date(job.occurrenceISO);
  if (Number.isNaN(occurrence.getTime())) return;
  occurrence.setUTCFullYear(occurrence.getUTCFullYear() + 1);
  const dueAt = new Date(occurrence.getTime() + Number(job.relativeOffsetMs || 0));
  const id = jobIdFor(job.familyId, job.eventId, occurrence, job.stage);
  const copy = reminderCopy(event, job.stage);
  await getFirestore().doc(`pushJobs/${id}`).set({
    ...job,
    id,
    occurrenceISO: occurrence.toISOString(),
    dueAt: Timestamp.fromDate(dueAt),
    title: copy.title,
    body: copy.body,
    status: "pending",
    processingAt: null,
    createdAt: new Date().toISOString(),
  }, { merge: false });
};

exports.dispatchSmartReminderPush = onSchedule(
  { schedule: "every 15 minutes", region: REGION, timeZone: "Asia/Ho_Chi_Minh", memory: "256MiB" },
  async () => {
    const db = getFirestore();
    const due = await db.collection("pushJobs")
      .where("dueAt", "<=", Timestamp.now())
      .orderBy("dueAt", "asc")
      .limit(100)
      .get();

    for (const jobSnap of due.docs) {
      const claimed = await claimJob(jobSnap.ref);
      if (!claimed) continue;
      const job = jobSnap.data();
      try {
        const eventSnap = await db.doc(job.eventPath).get();
        if (!eventSnap.exists) {
          await jobSnap.ref.delete();
          continue;
        }
        const event = eventSnap.data();
        if (event.moderationStatus === "hidden" || clean(event.updatedAt) !== clean(job.eventUpdatedAt)) {
          await jobSnap.ref.delete();
          continue;
        }
        const category = categoryForEvent(event);
        const uids = await recipientUidsForEvent(job.familyId, event);
        const payload = {
          familyId: job.familyId,
          sourceType: "event",
          sourceId: job.eventId,
          importance: job.importance,
          notificationId: `reminder:${job.id}`,
          title: job.title,
          body: job.body,
        };
        await Promise.allSettled(uids.map((uid) => sendToUid(uid, payload, category)));
        await scheduleNextYear(job, event);
        await jobSnap.ref.delete();
      } catch (error) {
        console.error("dispatchSmartReminderPush", jobSnap.id, error);
        await jobSnap.ref.update({ status: "pending", processingAt: null, lastErrorAt: new Date().toISOString() }).catch(() => undefined);
      }
    }
  },
);

exports._test = { buildJobs, reminderCopy, nextOccurrence, categoryForEvent, importanceForEvent, channelFor };

// Phase 14R.5 — direct Lời thì thầm delivery. The recipient inbox is the
// single source of truth for both the local-first client fallback and Cloud Push.
// Client and server atomically claim `deliveredAt`, so Release + DEV (or a live
// Cloud Function) cannot emit duplicate notifications for the same whisper.
// Family-audience whispers never create a homeInbox event and therefore never push.
exports.pushDirectWhisperCreated = onDocumentCreated(
  { document: "users/{uid}/homeInbox/{eventId}", region: REGION, retry: false },
  async (event) => {
    const inbox = event.data?.data();
    const uid = clean(event.params.uid);
    const eventId = clean(event.params.eventId);
    if (!inbox || inbox.type !== "home_whisper" || clean(inbox.recipientUid) !== uid || !uid || !eventId) return;

    const ref = event.data.ref;
    const db = getFirestore();
    let claimed = false;
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const current = snap.data() || {};
      if (clean(current.recipientUid) !== uid || current.type !== "home_whisper") return;
      if (clean(current.deliveredAt) || clean(current.readAt)) return;
      tx.update(ref, { deliveredAt: new Date().toISOString() });
      claimed = true;
    });
    if (!claimed) return;

    const releaseClaim = async () => {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return;
        const current = snap.data() || {};
        if (clean(current.readAt) || !clean(current.deliveredAt)) return;
        tx.update(ref, { deliveredAt: null });
      }).catch(() => undefined);
    };

    try {
      const result = await sendToUid(uid, {
        familyId: clean(inbox.familyId),
        sourceType: "home_whisper",
        sourceId: clean(inbox.sourceId) || eventId,
        importance: "normal",
        notificationId: `whisper:${clean(inbox.familyId)}:${clean(inbox.sourceId) || eventId}`,
        title: clean(inbox.title) || "Bạn có một lời thì thầm 💌",
        body: clean(inbox.body) || `${clean(inbox.senderName) || "Một người thân"} vừa gửi một lời riêng cho bạn.`,
      }, "always");

      // No eligible token / permission: release the claim so an active or later
      // reopened client can still surface the inbox event locally.
      if (!result || result.sent < 1) {
        await releaseClaim();
      }
    } catch (error) {
      await releaseClaim();
      console.error("pushDirectWhisperCreated", eventId, error);
    }
  },
);
