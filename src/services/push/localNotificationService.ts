import * as Notifications from "expo-notifications";
import { AppState, Platform } from "react-native";
import type { FamilyEvent, SmartReminderPreferences, UserFamilyMembership } from "../../types";
import { DEFAULT_SMART_REMINDER_PREFERENCES } from "../../types";
import { getEffectiveEventDate, startOfLocalDay, toDateKey } from "../../utils/event";
import { eventService } from "../event/eventService";
import { homeTimeCapsuleService, timeCapsuleOpenMillis } from "../home/homeTimeCapsuleService";
import type { HomeTimeCapsule } from "../../types/homeLiving";

const LOCAL_PREFIX = "bloom-local:";
const HORIZON_DAYS = 30;
const MAX_SCHEDULED = 48;
const MIN_FUTURE_MS = 45 * 1000;
const TIME_CAPSULE_MIN_FUTURE_MS = 5 * 1000;
const SYNC_TTL_MS = 5 * 60 * 1000;
let initialized = false;
let lastSyncKey = "";
let lastSyncAt = 0;

const TEST_SUITE_PREFIX = `${LOCAL_PREFIX}test-suite:`;
const TEST_SUITE_STEP_SECONDS = 8;

type NotificationTestCase = {
  sourceType: Exclude<BloomLocalNotificationData["sourceType"], "join_request" | "graph_proposal" | null>;
  importance: BloomLocalNotificationData["importance"];
  channelId: PlannedReminder["channelId"];
  title: string;
  body: string;
};

const NOTIFICATION_TEST_CASES: NotificationTestCase[] = [
  { sourceType: "moment", importance: "normal", channelId: "bloom_normal", title: "Kỷ niệm · Bình thường", body: "Test Bloom: thông báo Kỷ niệm mức Bình thường." },
  { sourceType: "moment", importance: "notable", channelId: "bloom_notable", title: "Kỷ niệm · Đáng chú ý", body: "Test Bloom: thông báo Kỷ niệm mức Khá quan trọng." },
  { sourceType: "moment", importance: "important", channelId: "bloom_important", title: "Kỷ niệm · Quan trọng", body: "Test Bloom: thông báo Kỷ niệm mức Quan trọng." },
  { sourceType: "event", importance: "normal", channelId: "bloom_normal", title: "Lịch nhà · Bình thường", body: "Test Bloom: sự kiện Lịch nhà mức Bình thường." },
  { sourceType: "event", importance: "notable", channelId: "bloom_notable", title: "Lịch nhà · Đáng chú ý", body: "Test Bloom: sự kiện Lịch nhà mức Khá quan trọng." },
  { sourceType: "event", importance: "important", channelId: "bloom_important", title: "Lịch nhà · Quan trọng", body: "Test Bloom: sự kiện Lịch nhà mức Quan trọng." },
  { sourceType: "graph", importance: "normal", channelId: "bloom_normal", title: "Phả hệ · Bình thường", body: "Test Bloom: thay đổi Phả hệ mức Bình thường." },
  { sourceType: "graph", importance: "notable", channelId: "bloom_notable", title: "Phả hệ · Đáng chú ý", body: "Test Bloom: thay đổi Phả hệ mức Khá quan trọng." },
  { sourceType: "graph", importance: "important", channelId: "bloom_important", title: "Phả hệ · Quan trọng", body: "Test Bloom: thay đổi Phả hệ mức Quan trọng." },
];

export type BloomLocalNotificationData = {
  familyId: string | null;
  sourceType: "moment" | "event" | "graph" | "join_request" | "graph_proposal" | "home_whisper" | "home_time_capsule" | null;
  sourceId: string | null;
  importance: "normal" | "notable" | "important";
  notificationId: string | null;
  localOnly: true;
};

type PlannedReminder = {
  identifier: string;
  when: Date;
  title: string;
  body: string;
  channelId: "bloom_normal" | "bloom_notable" | "bloom_important";
  data: BloomLocalNotificationData;
};

const cleanPreferences = (value?: Partial<SmartReminderPreferences> | null): SmartReminderPreferences => ({
  birthdays: typeof value?.birthdays === "boolean" ? value.birthdays : DEFAULT_SMART_REMINDER_PREFERENCES.birthdays,
  memorials: typeof value?.memorials === "boolean" ? value.memorials : DEFAULT_SMART_REMINDER_PREFERENCES.memorials,
  events: typeof value?.events === "boolean" ? value.events : DEFAULT_SMART_REMINDER_PREFERENCES.events,
  onThisDay: typeof value?.onThisDay === "boolean" ? value.onThisDay : DEFAULT_SMART_REMINDER_PREFERENCES.onThisDay,
});

const appliesToUser = (event: FamilyEvent, uid: string) =>
  event.participantsMode === "all" || event.participantIds.includes(uid);

const allowedByPreferences = (event: FamilyEvent, preferences: SmartReminderPreferences) => {
  if (event.eventType === "birthday") return preferences.birthdays;
  if (event.eventType === "memorial") return preferences.memorials;
  return preferences.events;
};

const localTimeOnDay = (base: Date, hour: number, minute = 0) =>
  new Date(base.getFullYear(), base.getMonth(), base.getDate(), hour, minute, 0, 0);

const addDays = (base: Date, days: number) => {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
};

const importanceOf = (event: FamilyEvent): "normal" | "notable" | "important" => {
  if (event.notificationLevel === "important") return "important";
  if (event.notificationLevel === "notable" || event.eventType === "birthday" || event.eventType === "memorial") return "notable";
  return "normal";
};

const channelOf = (importance: "normal" | "notable" | "important") =>
  importance === "important" ? "bloom_important" as const
    : importance === "notable" ? "bloom_notable" as const
      : "bloom_normal" as const;

const eventLabel = (event: FamilyEvent) => {
  if (event.eventType === "birthday") return "sinh nhật";
  if (event.eventType === "memorial") return "ngày giỗ";
  if (event.eventType === "anniversary") return "ngày kỷ niệm";
  if (event.eventType === "gathering") return "buổi họp mặt";
  if (event.eventType === "wedding") return "cưới hỏi";
  if (event.eventType === "travel") return "chuyến đi";
  return "sự kiện";
};

const copyFor = (event: FamilyEvent, stage: "tomorrow" | "today" | "soon" | "near" | "start") => {
  const label = eventLabel(event);
  const location = event.location ? ` · ${event.location}` : "";
  if (stage === "tomorrow") {
    return {
      title: `Ngày mai là ${label} · ${event.title}`,
      body: event.eventType === "memorial"
        ? `Một lời nhắc nhẹ để gia đình cùng nhớ đến ngày này${location}.`
        : `Bloom nhắc bạn để cả nhà không bỏ lỡ${location}.`,
    };
  }
  if (stage === "soon") return { title: `Sắp đến giờ · ${event.title}`, body: `Còn khoảng 3 giờ nữa${location}.` };
  if (stage === "near") return { title: `Sắp bắt đầu · ${event.title}`, body: `Còn khoảng 30 phút nữa${location}.` };
  if (stage === "start") return { title: `Đến giờ rồi · ${event.title}`, body: `Sự kiện của nhà mình bắt đầu bây giờ${location}.` };
  return {
    title: event.eventType === "memorial" ? `Hôm nay là ${label} · ${event.title}` : `Hôm nay có ${label} · ${event.title}`,
    body: event.eventType === "memorial"
      ? `Một lời nhắc nhẹ để gia đình cùng nhớ đến ngày này${location}.`
      : `Bloom nhắc bạn để cả nhà không bỏ lỡ${location}.`,
  };
};

const occurrenceFor = (event: FamilyEvent, anchor: Date) =>
  event.recurrence === "yearly" ? getEffectiveEventDate(event, anchor) : new Date(event.dateISO);

const planEvent = (event: FamilyEvent, uid: string, now: Date): PlannedReminder[] => {
  if (!appliesToUser(event, uid)) return [];
  const occurrence = occurrenceFor(event, now);
  if (Number.isNaN(occurrence.getTime())) return [];
  const importance = importanceOf(event);
  const channelId = channelOf(importance);
  const dateKey = toDateKey(occurrence);
  const baseData = {
    familyId: event.familyId,
    sourceType: "event" as const,
    sourceId: event.id,
    importance,
    localOnly: true as const,
  };
  const planned: PlannedReminder[] = [];
  const add = (stage: "tomorrow" | "today" | "soon" | "near" | "start", when: Date, stageChannel = channelId) => {
    if (when.getTime() <= now.getTime() + MIN_FUTURE_MS) return;
    const copy = copyFor(event, stage);
    const identifier = `${LOCAL_PREFIX}${uid}:${event.familyId}:${event.id}:${dateKey}:${stage}`;
    planned.push({
      identifier,
      when,
      title: copy.title,
      body: copy.body,
      channelId: stageChannel,
      data: { ...baseData, notificationId: identifier },
    });
  };

  const dayStart = startOfLocalDay(occurrence);
  const specialAnnual = event.eventType === "birthday" || event.eventType === "memorial";

  if (specialAnnual) {
    add("tomorrow", localTimeOnDay(addDays(dayStart, -1), 19));
    add("today", localTimeOnDay(dayStart, 8));
    return planned;
  }

  if (event.allDay) {
    if (importance !== "normal") add("tomorrow", localTimeOnDay(addDays(dayStart, -1), 19));
    add("today", localTimeOnDay(dayStart, 8), importance === "normal" ? "bloom_normal" : channelId);
    return planned;
  }

  if (importance !== "normal") add("tomorrow", localTimeOnDay(addDays(dayStart, -1), 19));
  add("soon", new Date(occurrence.getTime() - 3 * 60 * 60 * 1000));
  if (importance === "important") add("near", new Date(occurrence.getTime() - 30 * 60 * 1000));
  // Always keep one reminder at the actual event time. This matters when an event
  // is created only a few minutes before it starts: the 3h/30m reminder windows
  // are already in the past, but the on-device notification should still fire.
  add("start", occurrence);
  return planned;
};

const planTimeCapsule = (capsule: HomeTimeCapsule, uid: string, now: Date): PlannedReminder[] => {
  const openAtMs = timeCapsuleOpenMillis(capsule);
  // Time Capsules can intentionally sleep for months or years. Once this device
  // has seen the metadata, keep the exact reveal notification scheduled instead
  // of applying the 30-day Event reminder horizon.
  if (!openAtMs || openAtMs <= now.getTime() + TIME_CAPSULE_MIN_FUTURE_MS) return [];
  const identifier = `${LOCAL_PREFIX}${uid}:${capsule.familyId}:time-capsule:${capsule.id}:open`;
  return [{
    identifier,
    when: new Date(openAtMs),
    title: "Hộp thời gian đã đến lúc mở 🎁",
    body: `${capsule.createdByName || "Một người thân"} đã giữ một lời nhắn cho bạn đến đúng khoảnh khắc này.`,
    channelId: "bloom_notable",
    data: {
      familyId: capsule.familyId,
      sourceType: "home_time_capsule",
      sourceId: capsule.id,
      importance: "notable",
      notificationId: identifier,
      localOnly: true,
    },
  }];
};

const configureChannels = async () => {
  if (Platform.OS !== "android") return;
  await Promise.all([
    Notifications.setNotificationChannelAsync("bloom_normal", {
      name: "Bloom nhẹ nhàng",
      description: "Nhắc nhẹ, không âm thanh và không rung",
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      enableVibrate: false,
      vibrationPattern: [0],
    }),
    Notifications.setNotificationChannelAsync("bloom_notable", {
      name: "Bloom đáng chú ý",
      description: "Thông báo đáng chú ý với âm thanh nhẹ và rung",
      importance: Notifications.AndroidImportance.DEFAULT,
      enableVibrate: true,
      vibrationPattern: [0, 180],
    }),
    Notifications.setNotificationChannelAsync("bloom_important", {
      name: "Bloom quan trọng",
      description: "Thông báo quan trọng, có heads-up, âm thanh và rung rõ",
      importance: Notifications.AndroidImportance.HIGH,
      enableVibrate: true,
      vibrationPattern: [0, 260, 120, 260],
    }),
  ]);
};

const configureHandler = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => {
      const foreground = AppState.currentState === "active";
      return {
        shouldShowBanner: !foreground,
        shouldShowList: !foreground,
        shouldPlaySound: !foreground,
        shouldSetBadge: false,
      };
    },
  });
};

const ensureInitialized = async () => {
  if (initialized) return;
  configureHandler();
  await configureChannels();
  initialized = true;
};

const permissionGranted = async (request: boolean) => {
  await ensureInitialized();
  let status = await Notifications.getPermissionsAsync();
  if (!status.granted && request) status = await Notifications.requestPermissionsAsync();
  return status.granted;
};

const cancelLocalScheduled = async (uid?: string) => {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const prefix = uid ? `${LOCAL_PREFIX}${uid}:` : LOCAL_PREFIX;
  await Promise.all(all.filter((item) => item.identifier.startsWith(prefix)).map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
};

export const localNotificationService = {
  async initialize() {
    await ensureInitialized();
  },

  async setEnabled(enabled: boolean) {
    const granted = enabled ? await permissionGranted(true) : false;
    if (!enabled) return { permissionGranted: false };
    return { permissionGranted: granted };
  },

  async clearForUser(uid: string) {
    if (!uid) return;
    await cancelLocalScheduled(uid).catch(() => undefined);
    if (lastSyncKey.startsWith(`${uid}:`)) {
      lastSyncKey = "";
      lastSyncAt = 0;
    }
  },

  async scheduleWhisperInboxNotification(input: {
    uid: string;
    eventId: string;
    familyId: string;
    sourceId: string;
    title: string;
    body: string;
    count?: number;
  }) {
    if (Platform.OS !== "android" || !input.uid || !input.eventId) {
      return { permissionGranted: false, scheduled: false };
    }
    await ensureInitialized();
    const granted = await permissionGranted(false);
    if (!granted) return { permissionGranted: false, scheduled: false };

    const count = Math.max(1, Math.round(input.count ?? 1));
    const identifier = `${LOCAL_PREFIX}${input.uid}:whisper:${input.eventId}`;
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: count > 1 ? `Bạn có ${count} lời thì thầm mới 💌` : input.title,
        body: count > 1 ? "Những lời riêng đang chờ bạn trong Nhà Mình." : input.body,
        data: {
          familyId: input.familyId,
          sourceType: "home_whisper",
          sourceId: input.sourceId,
          importance: "normal",
          notificationId: identifier,
          localOnly: true,
        } satisfies BloomLocalNotificationData,
        color: "#E98AA6",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        channelId: "bloom_notable",
      },
    });
    return { permissionGranted: true, scheduled: true, identifier };
  },

  async scheduleTest(familyId: string | null) {
    if (Platform.OS !== "android") return { permissionGranted: false };
    const granted = await permissionGranted(true);
    if (!granted) return { permissionGranted: false };
    const identifier = `${LOCAL_PREFIX}test:${Date.now()}`;
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: "Bloom đang hoạt động 🌸",
        body: "Đây là lời nhắc thử trên thiết bị. Không cần Cloud Functions.",
        data: {
          familyId,
          sourceType: null,
          sourceId: null,
          importance: "notable",
          notificationId: identifier,
          localOnly: true,
        } satisfies BloomLocalNotificationData,
        color: "#E98AA6",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 8,
        channelId: "bloom_notable",
      },
    });
    return { permissionGranted: true };
  },


  async scheduleE2EEventProbe(input: { familyId: string; eventId: string; title: string; seconds?: number }) {
    if (Platform.OS !== "android") {
      return { permissionGranted: false, identifier: null as string | null, seconds: 0, deliverAtISO: null as string | null, verified: false };
    }
    const granted = await permissionGranted(true);
    if (!granted) {
      return { permissionGranted: false, identifier: null as string | null, seconds: 0, deliverAtISO: null as string | null, verified: false };
    }

    // Use the same DATE-trigger path as real Family Bloom event reminders. The
    // previous probe used a TIME_INTERVAL trigger and the UI encouraged the user
    // to background the app before Firebase creation/scheduling had necessarily
    // completed. This probe is only considered ready after Android confirms the
    // scheduled request exists in its notification queue.
    const seconds = Math.max(30, Math.round(input.seconds ?? 60));
    const deliverAt = new Date(Date.now() + seconds * 1000);
    const identifier = `${LOCAL_PREFIX}e2e:${input.eventId}:${Date.now()}`;
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: "Bloom E2E · Event test 🌸",
        body: `${input.title} · Chạm để mở Event test.`,
        data: {
          familyId: input.familyId,
          sourceType: "event",
          sourceId: input.eventId,
          importance: "notable",
          notificationId: identifier,
          localOnly: true,
        } satisfies BloomLocalNotificationData,
        color: "#E98AA6",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: deliverAt,
        channelId: "bloom_notable",
      },
    });

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const verified = scheduled.some((item) => item.identifier === identifier);
    if (!verified) throw new Error("E2E_ANDROID_SCHEDULE_NOT_CONFIRMED");

    console.info("[Bloom E2E] Android notification schedule confirmed", {
      identifier,
      eventId: input.eventId,
      deliverAtISO: deliverAt.toISOString(),
    });
    return { permissionGranted: true, identifier, seconds, deliverAtISO: deliverAt.toISOString(), verified: true };
  },

  async scheduleFullTestSuite(familyId: string | null) {
    if (Platform.OS !== "android") return { permissionGranted: false, scheduled: 0, durationSeconds: 0 };
    const granted = await permissionGranted(true);
    if (!granted) return { permissionGranted: false, scheduled: 0, durationSeconds: 0 };

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((item) => item.identifier.startsWith(TEST_SUITE_PREFIX))
        .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
    );

    const runId = Date.now();
    let scheduledCount = 0;
    for (const [index, item] of NOTIFICATION_TEST_CASES.entries()) {
      const seconds = TEST_SUITE_STEP_SECONDS * (index + 1);
      const identifier = `${TEST_SUITE_PREFIX}${runId}:${index + 1}`;
      try {
        await Notifications.scheduleNotificationAsync({
          identifier,
          content: {
            title: `[${index + 1}/${NOTIFICATION_TEST_CASES.length}] ${item.title}`,
            body: `${item.body} Chạm để mở đúng khu vực.`,
            data: {
              familyId,
              sourceType: item.sourceType,
              sourceId: null,
              importance: item.importance,
              notificationId: identifier,
              localOnly: true,
            } satisfies BloomLocalNotificationData,
            color: "#E98AA6",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds,
            channelId: item.channelId,
          },
        });
        scheduledCount += 1;
        console.info(`[Bloom notifications] test ${index + 1}/${NOTIFICATION_TEST_CASES.length} scheduled`, { identifier, seconds, channelId: item.channelId });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        console.error(`[Bloom notifications] failed to schedule test ${index + 1}/${NOTIFICATION_TEST_CASES.length}`, error);
        // Do not leave a partial test suite behind after a scheduling failure.
        const partial = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
        await Promise.all(partial
          .filter((notification) => notification.identifier.startsWith(`${TEST_SUITE_PREFIX}${runId}:`))
          .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier).catch(() => undefined)));
        throw new Error(`Không hẹn được thông báo test ${index + 1}/9: ${detail}`);
      }
    }

    return {
      permissionGranted: true,
      scheduled: scheduledCount,
      durationSeconds: NOTIFICATION_TEST_CASES.length * TEST_SUITE_STEP_SECONDS,
    };
  },

  async syncTimeCapsuleReminders(input: {
    uid: string;
    familyId: string;
    capsules: HomeTimeCapsule[];
    enabled: boolean;
    now?: Date;
  }) {
    const { uid, familyId, capsules, enabled } = input;
    if (!uid || !familyId || Platform.OS !== "android") return { scheduled: 0, permissionGranted: false };
    await ensureInitialized();

    const prefix = `${LOCAL_PREFIX}${uid}:${familyId}:time-capsule:`;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
    const existing = scheduled.filter((item) => item.identifier.startsWith(prefix));

    if (!enabled) {
      await Promise.all(existing.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier).catch(() => undefined)));
      return { scheduled: 0, permissionGranted: false };
    }

    const granted = await permissionGranted(false);
    if (!granted) return { scheduled: 0, permissionGranted: false };

    const now = input.now ?? new Date();
    const plans = capsules
      .flatMap((capsule) => planTimeCapsule(capsule, uid, now))
      .sort((a, b) => a.when.getTime() - b.when.getTime())
      .slice(0, MAX_SCHEDULED);

    // A create/edit/delete snapshot can move the reveal time. Replace only this
    // family's Time Capsule alarms; Event and other Bloom reminders stay intact.
    await Promise.all(existing.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier).catch(() => undefined)));
    await Promise.all(plans.map((plan) => Notifications.scheduleNotificationAsync({
      identifier: plan.identifier,
      content: {
        title: plan.title,
        body: plan.body,
        data: plan.data,
        color: "#E98AA6",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: plan.when,
        channelId: plan.channelId,
      },
    })));

    return { scheduled: plans.length, permissionGranted: true };
  },

  async syncSmartReminders(input: {
    uid: string;
    families: UserFamilyMembership[];
    preferences?: Partial<SmartReminderPreferences> | null;
    enabled: boolean;
    force?: boolean;
    now?: Date;
  }) {
    const { uid, families, enabled } = input;
    if (!uid || Platform.OS !== "android") return { scheduled: 0, permissionGranted: false };
    await ensureInitialized();
    if (!enabled) {
      await cancelLocalScheduled(uid);
      return { scheduled: 0, permissionGranted: false };
    }

    const granted = await permissionGranted(false);
    if (!granted) return { scheduled: 0, permissionGranted: false };

    const preferences = cleanPreferences(input.preferences);
    const now = input.now ?? new Date();
    const familyKey = [...families].map((item) => item.familyId).sort().join(",");
    const preferenceKey = `${Number(preferences.birthdays)}${Number(preferences.memorials)}${Number(preferences.events)}${Number(preferences.onThisDay)}`;
    const syncKey = `${uid}:${familyKey}:${preferenceKey}`;
    if (!input.force && syncKey === lastSyncKey && Date.now() - lastSyncAt < SYNC_TTL_MS) {
      return { scheduled: -1, permissionGranted: true };
    }

    const end = addDays(now, HORIZON_DAYS);
    const reminderBatches = await Promise.all(families.slice(0, 6).map(async (membership) => {
      const [events, capsules] = await Promise.all([
        eventService.listReminderWindow(membership.familyId, now, end).catch(() => []),
        homeTimeCapsuleService.listUpcomingForRecipient(membership.familyId, uid).catch(() => []),
      ]);
      return [
        ...events
          .filter((event) => allowedByPreferences(event, preferences))
          .flatMap((event) => planEvent(event, uid, now)),
        ...capsules.flatMap((capsule) => planTimeCapsule(capsule, uid, now)),
      ];
    }));

    const plans = reminderBatches
      .flat()
      .sort((a, b) => a.when.getTime() - b.when.getTime())
      .slice(0, MAX_SCHEDULED);

    await cancelLocalScheduled(uid);
    await Promise.all(plans.map((plan) => Notifications.scheduleNotificationAsync({
      identifier: plan.identifier,
      content: {
        title: plan.title,
        body: plan.body,
        data: plan.data,
        color: "#E98AA6",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: plan.when,
        channelId: plan.channelId,
      },
    })));

    lastSyncKey = syncKey;
    lastSyncAt = Date.now();
    return { scheduled: plans.length, permissionGranted: true };
  },
};
