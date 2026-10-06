import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { useBloomToast } from "../ui/BloomToast";
import { useAuth } from "../../context/AuthContext";
import { momentDeepLinkCache } from "../../services/moments/momentDeepLinkCache";
import { momentsService } from "../../services/moments/momentsService";
import { homeTimeCapsuleService } from "../../services/home/homeTimeCapsuleService";
import { homeWhisperService, type HomeWhisperInboxEvent } from "../../services/home/homeWhisperService";
import { localNotificationService, type BloomLocalNotificationData } from "../../services/push/localNotificationService";
import { pushTokenService } from "../../services/push/pushTokenService";
import { subscribeSharedRealtime } from "../../services/realtime/sharedRealtimeRegistry";
import type { HomeTimeCapsule } from "../../types/homeLiving";

const normalizeData = (raw: Record<string, unknown> | null | undefined): BloomLocalNotificationData => {
  const sourceType = raw?.sourceType === "moment" || raw?.sourceType === "event" || raw?.sourceType === "graph" || raw?.sourceType === "join_request" || raw?.sourceType === "graph_proposal" || raw?.sourceType === "home_whisper" || raw?.sourceType === "home_time_capsule"
    ? raw.sourceType
    : null;
  const importance = raw?.importance === "important" || raw?.importance === "notable" ? raw.importance : "normal";
  return {
    familyId: typeof raw?.familyId === "string" && raw.familyId.trim() ? raw.familyId.trim() : null,
    sourceType,
    sourceId: typeof raw?.sourceId === "string" && raw.sourceId.trim() ? raw.sourceId.trim() : null,
    importance,
    notificationId: typeof raw?.notificationId === "string" && raw.notificationId.trim() ? raw.notificationId.trim() : null,
    localOnly: true,
  };
};

export function BloomPushBridge() {
  const router = useRouter();
  const { user, userProfile, families, activeFamilyId, switchFamily } = useAuth();
  const { showToast } = useBloomToast();
  const openingRef = useRef(false);
  const initialHandledRef = useRef(false);

  const openNotificationData = useCallback(async (data: BloomLocalNotificationData) => {
    if (!user || openingRef.current) return;
    if (!data.familyId || !data.sourceType) {
      router.push("/notifications" as never);
      return;
    }
    openingRef.current = true;
    try {
      if (data.sourceType === "moment" && data.sourceId) {
        void momentDeepLinkCache.prefetch(
          data.familyId,
          data.sourceId,
          () => momentsService.getById(data.familyId!, data.sourceId!),
        ).catch(() => null);
      }
      if (data.familyId !== activeFamilyId) {
        const switched = await switchFamily(data.familyId);
        if (!switched) return;
      }
      if (data.sourceType === "moment" && data.sourceId) {
        router.push({ pathname: "/(tabs)/moments", params: { highlightMomentId: data.sourceId, highlightFamilyId: data.familyId } } as never);
      } else if (data.sourceType === "moment") {
        router.push("/(tabs)/moments" as never);
      } else if (data.sourceType === "event" && data.sourceId) {
        router.push(`/event/${data.sourceId}` as never);
      } else if (data.sourceType === "event") {
        router.push("/(tabs)/planner" as never);
      } else if (data.sourceType === "graph") {
        router.push("/family-graph" as never);
      } else if (data.sourceType === "join_request") {
        router.push("/family-join-requests" as never);
      } else if (data.sourceType === "graph_proposal") {
        router.push("/family-graph-proposals" as never);
      } else if (data.sourceType === "home_whisper") {
        if (data.sourceId) {
          void homeWhisperService.markInboxRead(user.uid, data.sourceId).catch(() => undefined);
        }
        router.push("/home-whispers" as never);
      } else if (data.sourceType === "home_time_capsule" && data.sourceId) {
        router.push(`/home-time-capsule/${data.sourceId}` as never);
      } else {
        router.push("/notifications" as never);
      }
    } finally {
      openingRef.current = false;
    }
  }, [activeFamilyId, router, switchFamily, user]);

  const syncLocalReminders = useCallback((force = false) => {
    if (!user || !userProfile || Platform.OS !== "android") return;
    void localNotificationService.syncSmartReminders({
      uid: user.uid,
      families,
      preferences: userProfile.smartReminderPreferences,
      enabled: userProfile.pushNotificationsEnabled,
      force,
    }).catch(() => undefined);
  }, [families, user, userProfile]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    void localNotificationService.initialize().catch(() => undefined);
  }, []);

  // Phase 13: keep a private native FCM/APNs device registry ready for remote
  // delivery. This never prompts on startup; it registers only after the user
  // already granted notification permission. Cloud Functions may remain
  // undeployed until Blaze is available.
  useEffect(() => {
    if (!user || (Platform.OS !== "android" && Platform.OS !== "ios")) return;
    const enabled = userProfile?.pushNotificationsEnabled !== false;
    void pushTokenService.syncCurrentDevice(user.uid, enabled).catch(() => undefined);

    const subscription = Notifications.addPushTokenListener((token) => {
      const value = typeof token?.data === "string" ? token.data : "";
      if (value) void pushTokenService.registerToken(user.uid, value, enabled).catch(() => undefined);
    });
    return () => subscription.remove();
  }, [user, userProfile?.pushNotificationsEnabled]);

  useEffect(() => {
    if (!user || !userProfile || Platform.OS !== "android") return;
    const timer = setTimeout(() => syncLocalReminders(false), 900);
    return () => clearTimeout(timer);
  }, [syncLocalReminders, user, userProfile]);

  // Phase 14R.5A — one user-private listener for direct Lời thì thầm.
  // Startup is a special case: Firestore may emit the inbox snapshot while
  // React Native AppState is still `inactive`/`unknown`. We MUST NOT consume
  // deliveredAt during that transient state, otherwise the user opens Bloom
  // and sees nothing. We cache the latest bounded snapshot and retry when the
  // app becomes active. `inAppSeenAt` is a separate cross-session claim so an
  // unread whisper gets exactly one in-app catch-up toast even if an OS push
  // had already been delivered earlier.
  useEffect(() => {
    if (!user) return;
    let closed = false;
    let latestEvents: HomeWhisperInboxEvent[] = [];
    let deliveryChain = Promise.resolve();
    let hasBeenActive = AppState.currentState === "active";

    const enqueueDelivery = () => {
      deliveryChain = deliveryChain.then(async () => {
        if (closed) return;
        const events = latestEvents;
        const now = Date.now();
        const unread = events.filter(item => !item.readAt);
        const targetFamilyId = unread[0]?.familyId ?? null;
        if (!targetFamilyId) return;
        const sameFamily = unread.filter(item => item.familyId === targetFamilyId);
        const state = AppState.currentState;

        if (state === "active") {
          hasBeenActive = true;
          const freshClaimed: HomeWhisperInboxEvent[] = [];
          for (const item of sameFamily) {
            if (closed) return;
            const claimed = await homeWhisperService.claimInboxForeground(user.uid, item.id).catch(() => false);
            if (!claimed) continue;
            const createdMs = Date.parse(item.createdAt);
            const ageMs = Number.isFinite(createdMs) ? now - createdMs : Number.POSITIVE_INFINITY;
            // Old unread events are marked as seen silently to avoid an upgrade-time
            // toast storm. Recent unread whispers are surfaced once on app entry.
            if (ageMs >= 0 && ageMs <= 72 * 60 * 60 * 1000) freshClaimed.push(item);
          }
          if (closed || freshClaimed.length === 0) return;

          const latest = freshClaimed[0];
          const count = freshClaimed.length;
          const data: BloomLocalNotificationData = {
            familyId: latest.familyId,
            sourceType: "home_whisper",
            sourceId: latest.sourceId,
            importance: "normal",
            notificationId: `whisper:${latest.familyId}:${latest.sourceId}`,
            localOnly: true,
          };
          showToast({
            type: "notification",
            title: count > 1 ? `Bạn có ${count} lời thì thầm mới 💌` : latest.title,
            message: count > 1 ? "Những lời riêng đang chờ bạn trong Nhà Mình." : latest.body,
            duration: 5200,
            onPress: () => void openNotificationData(data),
          });
          return;
        }

        // Do not claim during cold-start `inactive` / `unknown`. The AppState
        // listener below will retry the cached snapshot as soon as Bloom is active.
        if (state !== "background" || !hasBeenActive) return;
        if (Platform.OS !== "android" || userProfile?.pushNotificationsEnabled === false) return;

        const claimed: HomeWhisperInboxEvent[] = [];
        for (const item of sameFamily) {
          if (closed) return;
          const ok = await homeWhisperService.claimInboxDelivery(user.uid, item.id).catch(() => false);
          if (ok) claimed.push(item);
        }
        if (closed || claimed.length === 0) return;

        const latest = claimed[0];
        const result = await localNotificationService.scheduleWhisperInboxNotification({
          uid: user.uid,
          eventId: latest.id,
          familyId: latest.familyId,
          sourceId: latest.sourceId,
          title: latest.title,
          body: latest.body,
          count: claimed.length,
        }).catch(() => ({ permissionGranted: false, scheduled: false }));

        // A delivery claim is only valid if Android actually accepted a notification.
        // Otherwise release it so opening the app can still surface the whisper.
        if (!result.scheduled) {
          await Promise.all(claimed.map(item => homeWhisperService.releaseInboxDelivery(user.uid, item.id).catch(() => undefined)));
        }
      }).catch((error) => {
        console.warn("[Bloom whispers] inbox delivery failed", error);
      });
    };

    const stop = subscribeSharedRealtime<HomeWhisperInboxEvent[]>({
      key: `home.whispers.inbox:${user.uid}`,
      listenerName: "home.whispers.inbox",
      start: (onData, onError) => homeWhisperService.watchInbox(user.uid, onData, onError),
      onData: (events) => {
        latestEvents = events;
        enqueueDelivery();
      },
      onError: (error) => console.warn("[Bloom whispers] inbox listener failed", error),
    });
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") hasBeenActive = true;
      if (state === "active" || state === "background") enqueueDelivery();
    });

    return () => {
      closed = true;
      stop();
      appStateSubscription.remove();
    };
  }, [openNotificationData, showToast, user, userProfile?.pushNotificationsEnabled]);

  // Mixed-version compatibility: Release may still be an older installed build
  // while DEV is already on 14R.5A. Older senders wrote the direct whisper but
  // had no homeInbox write, so backfill a small recent window from the recipient
  // side. Rules prove the source whisper is genuinely addressed to this uid.
  useEffect(() => {
    if (!user || families.length === 0) return;
    const familyIds = families.map(item => item.familyId);
    void homeWhisperService.repairRecentDirectWhisperInbox(user.uid, familyIds).catch((error) => {
      console.warn("[Bloom whispers] legacy inbox repair failed", error);
    });
  }, [families, user]);

  // Time Capsules need to be scheduled on the RECIPIENT device. A one-shot
  // startup sync is not enough when another family member creates/edits a box
  // while this app is already open. Keep exactly one bounded listener for the
  // active family and refresh only that family's Time Capsule alarms on change.
  useEffect(() => {
    if (!user || !activeFamilyId || Platform.OS !== "android" || userProfile?.pushNotificationsEnabled === false) return;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    let initialized = false;
    let previousIds = new Set<string>();
    const stop = subscribeSharedRealtime<HomeTimeCapsule[]>({
      key: `home.time_capsules.recipient.all:${activeFamilyId}:${user.uid}`,
      listenerName: "home.time_capsules.recipient",
      start: (onData, onError) => homeTimeCapsuleService.watchRecipientCapsules(activeFamilyId, user.uid, onData, onError),
      onData: (capsules) => {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(() => {
          void localNotificationService.syncTimeCapsuleReminders({
            uid: user.uid,
            familyId: activeFamilyId,
            capsules,
            enabled: userProfile?.pushNotificationsEnabled !== false,
          }).catch(() => undefined);
        }, 120);

        const nextIds = new Set(capsules.map(item => item.id));
        if (initialized && AppState.currentState === "active") {
          const newLocked = capsules.find(item => !previousIds.has(item.id) && item.previewMode === "locked");
          if (newLocked) {
            showToast({
              type: "notification",
              title: "Có một Hộp thời gian đang chờ bạn 🎁",
              message: `${newLocked.createdByName || "Một người thân"} vừa gửi một chiếc hộp. Nội dung vẫn được khóa đến đúng giờ mở.`,
              duration: 5200,
              onPress: () => router.push(`/home-time-capsule/${newLocked.id}` as never),
            });
          }
        }
        previousIds = nextIds;
        initialized = true;
      },
      onError: () => undefined,
    });
    return () => {
      if (debounce) clearTimeout(debounce);
      stop();
    };
  }, [activeFamilyId, router, showToast, user, userProfile?.pushNotificationsEnabled]);

  // Sender-side state is a separate bounded query. Recipients update openedByUids
  // on the shared capsule metadata, so this listener reflects another device's
  // first-open ceremony immediately and can notify the sender without refreshing.
  useEffect(() => {
    if (!user || !activeFamilyId) return;
    let initialized = false;
    let previousOpened = new Map<string, Set<string>>();
    return subscribeSharedRealtime<HomeTimeCapsule[]>({
      key: `home.time_capsules.created.all:${activeFamilyId}:${user.uid}`,
      listenerName: "home.time_capsules.created",
      start: (onData, onError) => homeTimeCapsuleService.watchCreatedCapsules(activeFamilyId, user.uid, onData, onError),
      onData: (capsules) => {
        const next = new Map<string, Set<string>>();
        for (const capsule of capsules) {
          const allowed = new Set(capsule.recipientUids);
          const currentOpened = new Set((capsule.openedByUids ?? []).filter(uid => allowed.has(uid)));
          next.set(capsule.id, currentOpened);
          if (!initialized) continue;
          const before = previousOpened.get(capsule.id) ?? new Set<string>();
          const newlyOpened = [...currentOpened].filter(uid => !before.has(uid));
          if (!newlyOpened.length || AppState.currentState !== "active") continue;
          const allOpened = capsule.recipientUids.length > 0 && currentOpened.size >= capsule.recipientUids.length;
          showToast({
            type: "notification",
            title: allOpened ? "Hộp thời gian đã được mở hết 🎁" : "Hộp thời gian vừa được mở 🎁",
            message: allOpened
              ? "Tất cả người nhận đã mở lời bạn gửi."
              : `${newlyOpened.length > 1 ? `${newlyOpened.length} người thân` : "Một người thân"} vừa mở Hộp thời gian của bạn.`,
            duration: 5200,
            onPress: () => router.push(`/home-time-capsule/${capsule.id}` as never),
          });
        }
        previousOpened = next;
        initialized = true;
      },
      onError: () => undefined,
    });
  }, [activeFamilyId, router, showToast, user]);

  useEffect(() => {
    if (!user || Platform.OS !== "android") return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        syncLocalReminders(true);
        void pushTokenService.syncCurrentDevice(user.uid, userProfile?.pushNotificationsEnabled !== false).catch(() => undefined);
      }
    });
    return () => subscription.remove();
  }, [syncLocalReminders, user, userProfile?.pushNotificationsEnabled]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const received = Notifications.addNotificationReceivedListener((notification) => {
      if (AppState.currentState !== "active") return;
      const title = notification.request.content.title?.trim() || "Chuyện mới trong nhà";
      const body = notification.request.content.body?.trim() || "Bloom có một điều muốn nhắc bạn.";
      const data = normalizeData(notification.request.content.data);
      showToast({
        type: "notification",
        title,
        message: body,
        duration: 5200,
        onPress: () => void openNotificationData(data),
      });
    });
    return () => received.remove();
  }, [openNotificationData, showToast]);

  useEffect(() => {
    if (Platform.OS !== "android" || !user) return;
    const response = Notifications.addNotificationResponseReceivedListener((event) => {
      void openNotificationData(normalizeData(event.notification.request.content.data));
    });

    if (!initialHandledRef.current) {
      initialHandledRef.current = true;
      void Notifications.getLastNotificationResponseAsync().then(async (event) => {
        if (!event) return;
        await Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
        await openNotificationData(normalizeData(event.notification.request.content.data));
      }).catch(() => undefined);
    }
    return () => response.remove();
  }, [openNotificationData, user]);

  return null;
}
