import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { BloomHeroHeader } from "../../../components/ui/BloomHeroHeader";
import { BloomCard, BloomEmptyState, BloomPill, BloomSectionHeader } from "../../../components/ui/BloomPageComponents";
import { COLORS } from "../../../constants/theme";
import { ENABLE_FAMILY_BULLETIN } from "../../../constants/featureFlags";
import { useAuth } from "../../../context/AuthContext";
import { eventService } from "../../../services/event/eventService";
import { momentsService } from "../../../services/moments/momentsService";
import type { FamilyEvent, MomentPost } from "../../../types";
import { formatEventDate } from "../../../utils/event";

/** Shared household digest is not a second unread-notification inbox. No realtime listener. */
type BoardDigest = { events: FamilyEvent[]; memories: MomentPost[]; expiresAt: number };
const boardCache = new Map<string, BoardDigest>();
const CACHE_MS = 90_000;

/** Keep the route registered so old deep links redirect safely rather than mounting
 * the deferred feed or loading any of its Firestore data. */
export default function HomeBoardScreen() {
  if (!ENABLE_FAMILY_BULLETIN) return <Redirect href="/(tabs)/play" />;
  return <ActiveHomeBoardScreen />;
}

function ActiveHomeBoardScreen() {
  const router = useRouter();
  const { activeFamilyId } = useAuth();
  const [digest, setDigest] = useState<BoardDigest | null>(() => activeFamilyId ? boardCache.get(activeFamilyId) ?? null : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!activeFamilyId) { setDigest(null); return; }
    const familyId = activeFamilyId;
    const cached = boardCache.get(familyId);
    if (cached && cached.expiresAt > Date.now()) { setDigest(cached); return; }
    let mounted = true;
    setDigest(cached ?? null);
    setLoading(!cached);
    setError(false);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 30);
    Promise.allSettled([
      eventService.listReminderWindow(familyId, start, end),
      momentsService.listFamilyTimelineOnce(familyId, 18),
    ]).then(([eventsPage, memoriesPage]) => {
      if (!mounted) return;
      const next: BoardDigest = {
        events: eventsPage.status === "fulfilled"
          ? eventsPage.value.filter(item => item.notificationLevel !== "normal" || item.eventType === "birthday" || item.eventType === "memorial").slice(0, 8)
          : cached?.events ?? [],
        memories: memoriesPage.status === "fulfilled" ? memoriesPage.value.slice(0, 5) : cached?.memories ?? [],
        expiresAt: Date.now() + CACHE_MS,
      };
      setError(eventsPage.status === "rejected" && memoriesPage.status === "rejected");
      setDigest(next);
      boardCache.set(familyId, next);
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [activeFamilyId]));

  const eventCards = useMemo(() => digest?.events ?? [], [digest?.events]);
  const memories = useMemo(() => digest?.memories ?? [], [digest?.memories]);
  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BloomHeroHeader eyebrow="BẢNG TIN NHÀ MÌNH" title="Điều cả nhà cần biết" subtitle="Một bảng tin chung nhẹ nhàng, không trùng với thông báo cá nhân của bạn." variant="notice" onBack={() => router.back()} roundedBottom compact />
        <View style={styles.body}>
          <View style={styles.info}><Ionicons name="information-circle-outline" size={20} color={COLORS.primary} /><Text style={styles.infoText}>Bảng tin tổng hợp sự kiện đáng chú ý và kỷ niệm chia sẻ với cả gia đình. Thông báo riêng, lượt đã đọc và nhắc cá nhân vẫn ở Chuyện trong nhà.</Text></View>
          {loading && <View style={styles.loading}><ActivityIndicator color={COLORS.primary} /><Text style={styles.loadingText}>Bloom đang gom tin chung…</Text></View>}
          {error && !digest && <BloomEmptyState icon="cloud-offline-outline" title="Chưa tải được bảng tin" description="Hãy thử mở lại khi kết nối ổn định." compact />}
          <View style={styles.section}>
            <BloomSectionHeader title="Điều đáng chú ý sắp tới" subtitle="Ngày quan trọng và lịch chung trong 30 ngày tới" actionIcon="calendar-outline" onAction={() => router.push("/planner" as never)} />
            {eventCards.length ? eventCards.map(item => (
              <BloomCard key={item.id} onPress={() => router.push(`/event/${item.id}` as never)} style={styles.newsCard}>
                <View style={[styles.newsIcon, { backgroundColor: "#FFE8F0" }]}><Ionicons name={item.eventType === "birthday" ? "gift-outline" : "calendar-outline"} size={22} color={COLORS.primary} /></View>
                <View style={styles.newsCopy}><Text style={styles.newsTitle}>{item.title}</Text><Text style={styles.newsMeta}>{formatEventDate(item)}</Text></View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
              </BloomCard>
            )) : !loading && <BloomCard tone="soft"><Text style={styles.emptyText}>Chưa có sự kiện nổi bật. Những ngày thường vẫn ở Lịch nhà.</Text></BloomCard>}
          </View>
          <View style={styles.section}>
            <BloomSectionHeader title="Chuyện vui được chia sẻ" subtitle="Kỷ niệm đăng cho toàn gia đình" actionIcon="images-outline" onAction={() => router.push("/moments" as never)} />
            {memories.length ? memories.map(item => (
              <BloomCard key={item.id} onPress={() => router.navigate({ pathname: "/(tabs)/moments", params: { highlightMomentId: item.id } } as never)} style={styles.newsCard}>
                <View style={[styles.newsIcon, { backgroundColor: "#F8EAFB" }]}><Ionicons name="heart-outline" size={22} color={COLORS.primaryText} /></View>
                <View style={styles.newsCopy}><Text style={styles.newsTitle} numberOfLines={2}>{item.caption || "Một khoảnh khắc của cả nhà"}</Text><Text style={styles.newsMeta}>{item.authorName} · {new Date(item.createdAt).toLocaleDateString("vi-VN")}</Text></View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
              </BloomCard>
            )) : !loading && <BloomCard tone="soft"><Text style={styles.emptyText}>Khi có kỷ niệm chia sẻ với cả nhà, Bloom sẽ gom tại đây.</Text></BloomCard>}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  body: { paddingHorizontal: 16, paddingTop: 22, gap: 23 },
  section: { gap: 11 },
  info: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 22, backgroundColor: "#FFF4F8", borderWidth: 1, borderColor: COLORS.border },
  infoText: { flex: 1, fontSize: 11.5, lineHeight: 17, color: COLORS.secondaryText },
  loading: { minHeight: 76, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10 },
  loadingText: { fontSize: 12, color: COLORS.secondaryText },
  newsCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13, minHeight: 78 },
  newsIcon: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  newsCopy: { flex: 1, minWidth: 0 },
  newsTitle: { fontSize: 13, fontWeight: "900", color: COLORS.primaryText },
  newsMeta: { fontSize: 10.5, marginTop: 5, color: COLORS.secondaryText },
  emptyText: { fontSize: 12, lineHeight: 18, color: COLORS.secondaryText },
});
