import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../components/layout/ScreenContainer";
import { BloomButton, BloomIconButton } from "../components/ui/BloomButtonComponents";
import { BloomEmptyState, BloomPill, BloomStickyHeader } from "../components/ui/BloomPageComponents";
import { COLORS } from "../constants/theme";
import { isPerformanceTestAccount } from "../constants/performanceTest";
import { useAuth } from "../context/AuthContext";
import { useBloomToast } from "../components/ui/BloomToast";
import { activityService } from "../services/activity/activityService";
import { smartReminderService } from "../services/activity/smartReminderService";
import { momentsService } from "../services/moments/momentsService";
import { momentDeepLinkCache } from "../services/moments/momentDeepLinkCache";
import { localNotificationService } from "../services/push/localNotificationService";
import type { FamilyActivity } from "../types";

type ActivityWithFamily = FamilyActivity & { familyName: string; isUnread: boolean; isSmartReminder?: boolean };
type ActivitySection = { title: string; data: ActivityWithFamily[] };

const dayBucket = (iso: string) => {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "Trước đó";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startValue = new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diff = Math.round((startToday - startValue) / 86400000);
  if (diff <= 0) return "Hôm nay";
  if (diff === 1) return "Hôm qua";
  if (diff < 7) return "Tuần này";
  return "Trước đó";
};

const iconFor = (activity: FamilyActivity): keyof typeof Ionicons.glyphMap => {
  if (activity.kind === "event") return activity.importance === "important" ? "calendar" : "calendar-outline";
  if (activity.kind === "graph") return "git-network-outline";
  if (activity.kind === "review") return "shield-checkmark-outline";
  if (activity.kind === "home" || activity.sourceType === "home_time_capsule") return "gift-outline";
  return activity.audience === "target" ? "flower-outline" : "images-outline";
};

const timeText = (iso: string) => {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "";
  const now = new Date();
  if (value.toDateString() === now.toDateString()) {
    return value.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }
  return value.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export default function Notifications() {
  const router = useRouter();
  const { user, userProfile, families, activeFamilyId, switchFamily } = useAuth();
  const { showToast } = useBloomToast();
  const [items, setItems] = useState<ActivityWithFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [openingStage, setOpeningStage] = useState<string | null>(null);
  const [schedulingTestSuite, setSchedulingTestSuite] = useState(false);
  const showNotificationTest = isPerformanceTestAccount(user?.email);

  const scheduleNotificationTestSuite = useCallback(async () => {
    if (!user || schedulingTestSuite) return;
    const familyId = activeFamilyId ?? families[0]?.familyId ?? null;
    if (!familyId) {
      showToast({ title: "Chưa có gia đình để test", message: "Hãy vào một gia đình trước rồi thử lại.", type: "warning", duration: 2600 });
      return;
    }
    setSchedulingTestSuite(true);
    try {
      const result = await localNotificationService.scheduleFullTestSuite(familyId);
      if (!result.permissionGranted) {
        showToast({ title: "Android chưa cho phép thông báo", message: "Bật quyền Thông báo cho Family Bloom rồi thử lại.", type: "warning", duration: 3200 });
        return;
      }
      showToast({
        title: `Đã hẹn ${result.scheduled} thông báo test 🌸`,
        message: `Đưa app xuống nền. Bloom sẽ lần lượt gửi Kỷ niệm → Lịch nhà → Phả hệ, đủ 3 mức trong khoảng ${result.durationSeconds} giây.`,
        type: "info",
        duration: 5200,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error("[Bloom notifications] test suite scheduling failed", error);
      const exactAlarmIssue = /exact alarm|SCHEDULE_EXACT_ALARM/i.test(detail);
      showToast({
        title: "Chưa tạo được bộ test",
        message: exactAlarmIssue
          ? "Android chưa cho phép hẹn thông báo chính xác. Hãy cài lại bản build mới rồi thử lại."
          : detail || "Không thể hẹn thông báo test. Xem log Android để biết lỗi chi tiết.",
        type: "warning",
        duration: 5200,
      });
    } finally {
      setSchedulingTestSuite(false);
    }
  }, [activeFamilyId, families, schedulingTestSuite, showToast, user]);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const pages = await Promise.all(families.map(async (membership) => {
        const [activityResult, reminderResult] = await Promise.allSettled([
          activityService.listForUser(membership.familyId, user.uid, 60),
          smartReminderService.listForUser(
            membership.familyId,
            user.uid,
            userProfile?.smartReminderPreferences,
            { includeDiscovery: true },
          ),
        ]);
        return {
          membership,
          activityPage: activityResult.status === "fulfilled" ? activityResult.value : null,
          reminderPage: reminderResult.status === "fulfilled" ? reminderResult.value : null,
        };
      }));
      const successfulPages = pages.filter((item) => item.activityPage || item.reminderPage);
      const merged = successfulPages
        .flatMap(({ membership, activityPage, reminderPage }) => [
          ...(activityPage?.items ?? []).map((activity) => ({
            ...activity,
            familyName: membership.familyName,
            isUnread: activity.actorUid !== user.uid && (!activityPage?.lastSeenAt || activity.createdAt > activityPage.lastSeenAt),
            isSmartReminder: false,
          })),
          ...(reminderPage?.items ?? []).map((activity) => ({
            ...activity,
            familyName: membership.familyName,
            isUnread: activity.badgeEligible && (!reminderPage?.lastSeenAt || activity.createdAt > reminderPage.lastSeenAt),
            isSmartReminder: true,
          })),
        ])
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 120);
      setItems(merged);
      setLoadError(successfulPages.length === 0 && families.length > 0);
      // Opening Chuyện trong nhà means both persisted activity and smart reminders
      // currently visible to the user are considered seen.
      await Promise.all(successfulPages.flatMap(({ membership, activityPage, reminderPage }) => [
        activityPage ? activityService.markAllSeen(membership.familyId, user.uid).catch(() => undefined) : Promise.resolve(undefined),
        reminderPage ? smartReminderService.markAllSeen(membership.familyId, user.uid).catch(() => undefined) : Promise.resolve(undefined),
      ]));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [families, user, userProfile?.smartReminderPreferences]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const sections = useMemo<ActivitySection[]>(() => {
    const order = ["Hôm nay", "Hôm qua", "Tuần này", "Trước đó"];
    const grouped = new Map<string, ActivityWithFamily[]>();
    items.forEach((item) => {
      const key = dayBucket(item.createdAt);
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    });
    return order.map((title) => ({ title, data: grouped.get(title) ?? [] })).filter((section) => section.data.length > 0);
  }, [items]);

  const waitForOverlayPaint = useCallback(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }), []);

  const openActivity = useCallback(async (activity: ActivityWithFamily) => {
    if (openingId) return;
    setOpeningId(activity.id);
    setOpeningStage(activity.sourceType === "moment" ? "Bloom đang mở đúng kỷ niệm…" : "Bloom đang chuẩn bị nội dung…");
    try {
      // Paint the transition first so a slow family switch / Firestore read never feels frozen.
      await waitForOverlayPaint();

      // Start the exact Moment read immediately after the overlay paints. For a cross-family
      // notification it runs in parallel with switchFamily; for the current family we navigate
      // right away. The Moments screen reuses this same in-flight promise, so there is no second read.
      const momentPrefetch = activity.sourceType === "moment" && activity.sourceId
        ? momentDeepLinkCache.prefetch(
            activity.familyId,
            activity.sourceId,
            () => momentsService.getById(activity.familyId, activity.sourceId!),
          ).catch(() => null)
        : null;

      if (activity.familyId !== activeFamilyId) {
        setOpeningStage(`Đang vào ${activity.familyName}…`);
        const switched = await switchFamily(activity.familyId);
        if (!switched) return;
      }

      if (activity.sourceType === "event" && activity.sourceId) {
        setOpeningStage("Đang mở sự kiện…");
        router.push(`/event/${activity.sourceId}` as never);
      } else if (activity.sourceType === "event") {
        setOpeningStage("Đang mở Lịch nhà…");
        router.push("/(tabs)/planner" as never);
      } else if (activity.sourceType === "moment" && activity.sourceId) {
        setOpeningStage("Đang mở kỷ niệm…");
        void momentPrefetch;
        router.push({ pathname: "/(tabs)/moments", params: { highlightMomentId: activity.sourceId, highlightFamilyId: activity.familyId } } as never);
      } else if (activity.sourceType === "graph") {
        setOpeningStage("Đang mở cây nhà…");
        router.push("/family-graph" as never);
      } else if (activity.sourceType === "join_request") {
        router.push("/family-join-requests" as never);
      } else if (activity.sourceType === "graph_proposal") {
        router.push("/family-graph-proposals" as never);
      } else if (activity.sourceType === "home_time_capsule" && activity.sourceId) {
        setOpeningStage("Đang mở Hộp thời gian…");
        router.push(`/home-time-capsule/${activity.sourceId}` as never);
      } else if (activity.sourceType === "home_time_capsule") {
        router.push("/home-time-capsules" as never);
      }
    } finally {
      setOpeningId(null);
      setOpeningStage(null);
    }
  }, [activeFamilyId, openingId, router, switchFamily, waitForOverlayPaint]);

  return (
    <ScreenContainer>
      <BloomStickyHeader
        title="Chuyện trong nhà"
        subtitle="Những điều đáng chú ý từ các gia đình của bạn"
        onBack={() => router.back()}
        right={<BloomIconButton icon="options-outline" size={19} onPress={() => router.push("/notification-preferences" as never)} customStyle={styles.headerAction} />}
      />
      <SectionList
        sections={sections}
        keyExtractor={(item) => `${item.familyId}:${item.audience}:${item.targetUid || "family"}:${item.id}`}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={7}
        ListHeaderComponent={(
          <View>
            <View style={styles.intro}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.primary} />
              <Text style={styles.introText}>Bloom chỉ làm nổi bật những điều thật sự cần chú ý. Kỷ niệm “Toàn gia đình” bình thường vẫn ở đây nhưng không làm phiền bạn.</Text>
            </View>
            {showNotificationTest && (
              <View style={styles.testCard}>
                <View style={styles.testCopy}>
                  <Text style={styles.testTitle}>Test toàn bộ thông báo 11.2A</Text>
                  <Text style={styles.testText}>9 thông báo local: Kỷ niệm, Lịch nhà, Phả hệ × Bình thường, Đáng chú ý, Quan trọng. Mỗi thông báo cách nhau 8 giây.</Text>
                </View>
                <BloomButton
                  title="Gửi 9 thông báo test"
                  variant="outline"
                  icon="flask-outline"
                  isLoading={schedulingTestSuite}
                  onPress={() => void scheduleNotificationTestSuite()}
                  customStyle={styles.testButton}
                />
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={loading ? (
          <View style={styles.loading}><ActivityIndicator color={COLORS.primary} /><Text style={styles.loadingText}>Bloom đang gom chuyện trong nhà…</Text></View>
        ) : loadError ? (
          <BloomEmptyState icon="cloud-offline-outline" title="Chưa mở được Chuyện trong nhà" description="Kiểm tra kết nối rồi thử lại nhé." />
        ) : (
          <BloomEmptyState icon="mail-open-outline" title="Mọi thứ đang yên bình" description="Khi có một kỷ niệm, sự kiện hoặc thay đổi đáng chú ý, Bloom sẽ đặt ở đây." />
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{section.title}</Text></View>
        )}
        ItemSeparatorComponent={() => <View style={styles.itemGap} />}
        renderItem={({ item }) => {
          const important = item.importance === "important";
          const notable = item.importance === "notable" || item.badgeEligible;
          return (
            <Pressable onPress={() => void openActivity(item)} style={({ pressed }) => [styles.card, important && styles.cardImportant, notable && !important && styles.cardNotable, pressed && styles.pressed]}>
              <View style={[styles.icon, important && styles.iconImportant]}>
                <Ionicons name={iconFor(item)} size={20} color={important ? COLORS.white : COLORS.primary} />
              </View>
              <View style={styles.copy}>
                <View style={styles.metaRow}>
                  <BloomPill icon="home-outline" label={item.familyName} />
                  {important && <BloomPill icon="alert-circle-outline" label="Quan trọng" />}
                  {!important && item.importance === "notable" && <BloomPill icon="sparkles-outline" label="Đáng chú ý" />}
                  {item.isSmartReminder && <BloomPill icon="sparkles-outline" label="Nhắc" />}
                  {item.isUnread && <BloomPill icon="ellipse" label="Mới" />}
                </View>
                <Text style={styles.title}>{item.title}</Text>
                {!!item.body && <Text style={styles.body} numberOfLines={3}>{item.body}</Text>}
                <Text style={styles.time}>{item.isSmartReminder ? "Nhắc hôm nay" : timeText(item.createdAt)}</Text>
              </View>
              {openingId === item.id ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="chevron-forward" size={18} color={COLORS.secondaryText} />}
            </Pressable>
          );
        }}
      />

      <Modal visible={!!openingStage} transparent animationType="fade" statusBarTranslucent onRequestClose={() => undefined}>
        <View style={styles.openingOverlay}>
          <View style={styles.openingCard}>
            <View style={styles.openingFlower}>
              <Ionicons name="flower-outline" size={28} color={COLORS.primary} />
            </View>
            <Text style={styles.openingTitle}>{openingStage}</Text>
            <View style={styles.openingProgressRow}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.openingText}>Một chút nhé, Bloom đang đưa bạn tới đúng nơi.</Text>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerAction: { width: 40, height: 40, borderRadius: 16 },
  content: { paddingBottom: 34 },
  intro: { marginBottom: 20, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, padding: 14, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  introText: { flex: 1, color: COLORS.secondaryText, fontSize: 11, lineHeight: 16, fontWeight: "600" },
  testCard: { marginTop: -8, marginBottom: 20, borderRadius: 22, borderWidth: 1, borderColor: COLORS.focusBorder, backgroundColor: COLORS.white, padding: 14, gap: 12 },
  testCopy: { gap: 4 },
  testTitle: { color: COLORS.primaryText, fontSize: 13, fontWeight: "900" },
  testText: { color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15, fontWeight: "600" },
  testButton: { minHeight: 46 },
  loading: { minHeight: 180, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: COLORS.secondaryText, fontSize: 11.5, fontWeight: "700" },
  sectionHeader: { backgroundColor: COLORS.background, paddingTop: 8, paddingBottom: 9 },
  sectionTitle: { color: COLORS.primaryText, fontSize: 13, fontWeight: "900" },
  itemGap: { height: 10 },
  card: { minHeight: 96, borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, padding: 13, flexDirection: "row", alignItems: "center", gap: 11 },
  cardNotable: { borderColor: COLORS.focusBorder },
  cardImportant: { borderColor: COLORS.primary, borderWidth: 1.5 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
  icon: { width: 44, height: 44, borderRadius: 16, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  iconImportant: { backgroundColor: COLORS.primary },
  copy: { flex: 1, minWidth: 0 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 7 },
  title: { color: COLORS.primaryText, fontSize: 13, lineHeight: 18, fontWeight: "900" },
  body: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15, fontWeight: "600" },
  time: { marginTop: 6, color: COLORS.secondaryText, fontSize: 9.5, fontWeight: "700" },

  openingOverlay: { flex: 1, backgroundColor: "rgba(255,247,250,0.96)", alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  openingCard: { width: "100%", maxWidth: 360, borderRadius: 28, paddingHorizontal: 24, paddingVertical: 26, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.focusBorder, alignItems: "center" },
  openingFlower: { width: 62, height: 62, borderRadius: 22, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  openingTitle: { color: COLORS.primaryText, fontSize: 17, fontWeight: "900", textAlign: "center" },
  openingProgressRow: { marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  openingText: { flexShrink: 1, color: COLORS.secondaryText, fontSize: 11, lineHeight: 16, fontWeight: "700" },
});
