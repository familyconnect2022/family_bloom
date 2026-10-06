import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { BloomHeroHeader } from "../../../components/ui/BloomHeroHeader";
import { BloomCard } from "../../../components/ui/BloomPageComponents";
import { COLORS } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { homeTimeCapsuleService, isTimeCapsuleOpen, timeCapsuleOpenMillis } from "../../../services/home/homeTimeCapsuleService";
import { subscribeSharedRealtime } from "../../../services/realtime/sharedRealtimeRegistry";
import type { HomeTimeCapsule, HomeTimeCapsuleRevealTheme } from "../../../types/homeLiving";

const BOX_WIDTH = 164;
const BOX_GAP = 12;

type CapsuleRailState = "ready" | "upcoming" | "opened";

type ThemeBoxUi = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  card: string;
  body: string;
  lid: string;
  ribbon: string;
  accent: string;
  glow: string;
};

const THEME_UI: Record<HomeTimeCapsuleRevealTheme, ThemeBoxUi> = {
  warm: {
    label: "Ấm áp",
    icon: "heart-outline",
    card: "#FFF5F7",
    body: "#E79BB0",
    lid: "#F2B5C6",
    ribbon: "#FFF0E9",
    accent: "#B84F72",
    glow: "rgba(231,126,158,0.24)",
  },
  formal: {
    label: "Trang trọng",
    icon: "shield-checkmark-outline",
    card: "#F2F7FF",
    body: "#74A4D8",
    lid: "#9FC3E9",
    ribbon: "#EAF3FC",
    accent: "#3978C5",
    glow: "rgba(73,137,207,0.22)",
  },
  festive: {
    label: "Rộn ràng",
    icon: "sparkles-outline",
    card: "#FFF9E7",
    body: "#F2C969",
    lid: "#F6D989",
    ribbon: "#F59BB0",
    accent: "#C8687E",
    glow: "rgba(241,190,76,0.25)",
  },
};

const openedCountFor = (capsule: HomeTimeCapsule) => {
  const allowed = new Set(capsule.recipientUids);
  return new Set((capsule.openedByUids ?? []).filter(uid => allowed.has(uid))).size;
};

const recipientOpened = (capsule: HomeTimeCapsule, uid: string) => (capsule.openedByUids ?? []).includes(uid);

const railStateFor = (capsule: HomeTimeCapsule, uid: string, now = Date.now()): CapsuleRailState => {
  const mine = capsule.createdByUid === uid;
  if (mine && openedCountFor(capsule) > 0) return "opened";
  if (!mine && recipientOpened(capsule, uid)) return "opened";
  return isTimeCapsuleOpen(capsule, now) ? "ready" : "upcoming";
};

const sortForRail = (uid: string) => (a: HomeTimeCapsule, b: HomeTimeCapsule) => {
  const now = Date.now();
  const aState = railStateFor(a, uid, now);
  const bState = railStateFor(b, uid, now);
  const rank: Record<CapsuleRailState, number> = { ready: 0, upcoming: 1, opened: 2 };
  if (rank[aState] !== rank[bState]) return rank[aState] - rank[bState];
  const aTime = timeCapsuleOpenMillis(a);
  const bTime = timeCapsuleOpenMillis(b);
  return aState === "opened" ? bTime - aTime : aTime - bTime;
};

const formatRailDate = (capsule: HomeTimeCapsule) => {
  const millis = timeCapsuleOpenMillis(capsule);
  if (!millis) return "Chưa rõ thời gian";
  const value = new Date(millis);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const clock = value.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  if (sameDay(value, now)) return `Hôm nay · ${clock}`;
  if (sameDay(value, tomorrow)) return `Ngày mai · ${clock}`;
  return `${value.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} · ${clock}`;
};

function RailHeader({ title, subtitle, count }: { title: string; subtitle: string; count: number }) {
  return (
    <View style={styles.railHeader}>
      <View style={styles.railTitleRow}>
        <Text style={styles.railTitle}>{title}</Text>
        <View style={styles.countPill}><Text style={styles.countText}>{count}</Text></View>
      </View>
      <Text style={styles.railSubtitle}>{subtitle}</Text>
    </View>
  );
}

function CapsuleBoxCard({
  capsule,
  uid,
  attentionDismissed,
  onPress,
}: {
  capsule: HomeTimeCapsule;
  uid: string;
  attentionDismissed?: boolean;
  onPress: () => void;
}) {
  const theme = THEME_UI[capsule.revealTheme];
  const mine = capsule.createdByUid === uid;
  const state = railStateFor(capsule, uid);
  const openedCount = openedCountFor(capsule);
  const recipientCount = capsule.recipientUids.length;
  const fullyOpenedByRecipients = mine && recipientCount > 0 && openedCount >= recipientCount;
  const openTarget = mine
    ? (openedCount > 0 ? (fullyOpenedByRecipients ? 1 : 0.62) : 0)
    : (state === "opened" ? 1 : 0);
  const shouldShake = !mine && state === "ready" && !attentionDismissed;
  const shakeX = useRef(new Animated.Value(0)).current;
  const openProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;
      if (reduceMotion) {
        openProgress.setValue(openTarget);
        return;
      }
      Animated.timing(openProgress, {
        toValue: openTarget,
        duration: openTarget > 0 ? 560 : 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
    return () => {
      cancelled = true;
      openProgress.stopAnimation();
    };
  }, [openProgress, openTarget]);

  useEffect(() => {
    if (!shouldShake) {
      shakeX.stopAnimation();
      shakeX.setValue(0);
      return;
    }
    let cancelled = false;
    let firstTimer: ReturnType<typeof setTimeout> | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    const runShake = () => {
      if (cancelled) return;
      Animated.sequence([
        Animated.timing(shakeX, { toValue: -4, duration: 65, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 4, duration: 75, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -3, duration: 70, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 3, duration: 70, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 0, duration: 90, useNativeDriver: true }),
      ]).start();
    };
    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled || reduceMotion) return;
      firstTimer = setTimeout(runShake, 700);
      interval = setInterval(runShake, 5800);
    });
    return () => {
      cancelled = true;
      if (firstTimer) clearTimeout(firstTimer);
      if (interval) clearInterval(interval);
      shakeX.stopAnimation();
      shakeX.setValue(0);
    };
  }, [shakeX, shouldShake]);

  const lidStyle = {
    opacity: openProgress.interpolate({ inputRange: [0, 0.12, 1], outputRange: [1, 1, 0.98] }),
    transform: [
      { translateY: openProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -13] }) },
      { rotateZ: openProgress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-9deg"] }) },
      { scale: openProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) },
    ],
  };
  const letterStyle = {
    opacity: openProgress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.35, 1] }),
    transform: [{ translateY: openProgress.interpolate({ inputRange: [0, 1], outputRange: [17, -7] }) }],
  };
  const glowStyle = {
    opacity: openProgress.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.3, 1] }),
    transform: [{ scale: openProgress.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.12] }) }],
  };

  const statusLabel = mine
    ? openedCount > 0
      ? (fullyOpenedByRecipients ? "Đã mở hết" : "Đã mở")
      : state === "ready" ? "Đang chờ" : "Đã gửi"
    : state === "opened" ? "Đã mở" : state === "ready" ? "Mở ngay" : "Sắp mở";

  const detailLine = mine
    ? openedCount > 0
      ? `${openedCount}/${recipientCount} người đã mở`
      : state === "ready" ? "Chờ người thân mở hộp" : formatRailDate(capsule)
    : state === "opened" ? "Lời nhắn đã được mở" : state === "ready" ? "Đúng giờ rồi · chạm để mở" : formatRailDate(capsule);

  const title = mine ? `Gửi ${recipientCount} người thân` : `Từ ${capsule.createdByName}`;

  return (
    <Animated.View style={{ width: BOX_WIDTH, transform: [{ translateX: shakeX }] }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${statusLabel}. ${detailLine}`}
        style={({ pressed }) => [
          styles.boxCard,
          { backgroundColor: theme.card, borderColor: state === "ready" && !mine ? theme.accent : `${theme.accent}38` },
          state === "ready" && !mine && styles.boxCardReady,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.boxCardTopRow}>
          <View style={[styles.statePill, state === "ready" && !mine && { backgroundColor: theme.accent }]}> 
            <Ionicons
              name={state === "opened" ? "checkmark-circle" : state === "ready" ? "sparkles" : "time-outline"}
              size={12}
              color={state === "ready" && !mine ? COLORS.white : theme.accent}
            />
            <Text style={[styles.stateText, { color: state === "ready" && !mine ? COLORS.white : theme.accent }]}>{statusLabel}</Text>
          </View>
          <Ionicons name={theme.icon} size={15} color={theme.accent} />
        </View>

        <View style={styles.boxStage}>
          <Animated.View style={[styles.boxGlow, { backgroundColor: theme.glow }, glowStyle]} />
          <Animated.View style={[styles.letterPeek, letterStyle]}>
            <View style={[styles.letterRule, { backgroundColor: theme.accent }]} />
            <View style={[styles.letterRuleShort, { backgroundColor: `${theme.accent}88` }]} />
          </Animated.View>
          <View style={[styles.boxBody, { backgroundColor: theme.body }]}> 
            <View style={[styles.ribbonVertical, { backgroundColor: theme.ribbon }]} />
            <View style={styles.boxBodyShine} />
          </View>
          <Animated.View style={[styles.boxLid, { backgroundColor: theme.lid }, lidStyle]}>
            <View style={[styles.ribbonHorizontal, { backgroundColor: theme.ribbon }]} />
            <View style={[styles.bowLoop, styles.bowLeft, { borderColor: theme.ribbon }]} />
            <View style={[styles.bowLoop, styles.bowRight, { borderColor: theme.ribbon }]} />
            <View style={[styles.bowKnot, { backgroundColor: theme.ribbon }]} />
          </Animated.View>
        </View>

        <Text style={styles.boxTitle} numberOfLines={1}>{title}</Text>
        <Text style={[styles.boxDetail, state === "ready" && !mine && { color: theme.accent, fontWeight: "900" }]} numberOfLines={2}>{detailLine}</Text>
        <View style={styles.boxFooter}>
          <Text style={[styles.themeName, { color: theme.accent }]}>{theme.label}</Text>
          <Ionicons name="chevron-forward" size={14} color={theme.accent} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

function EmptyRailTile({ incoming }: { incoming: boolean }) {
  return (
    <View style={styles.emptyRailTile}>
      <View style={styles.emptyRailIcon}><Ionicons name={incoming ? "mail-outline" : "gift-outline"} size={24} color={COLORS.primary} /></View>
      <Text style={styles.emptyRailTitle}>{incoming ? "Chưa có hộp dành cho bạn" : "Bạn chưa gửi hộp nào"}</Text>
      <Text style={styles.emptyRailText}>{incoming ? "Khi một lời được gửi đến bạn, chiếc hộp sẽ nằm ở đây." : "Tạo một lời cho tương lai và Bloom sẽ giữ nó đến đúng ngày."}</Text>
    </View>
  );
}

function CapsuleRail({
  title,
  subtitle,
  items,
  uid,
  incoming,
  attentionDismissed,
  onOpen,
}: {
  title: string;
  subtitle: string;
  items: HomeTimeCapsule[];
  uid: string;
  incoming: boolean;
  attentionDismissed: Set<string>;
  onOpen: (capsule: HomeTimeCapsule) => void;
}) {
  return (
    <View style={styles.railSection}>
      <RailHeader title={title} subtitle={subtitle} count={items.length} />
      {items.length ? (
        <FlatList
          horizontal
          data={items}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <CapsuleBoxCard
              capsule={item}
              uid={uid}
              attentionDismissed={attentionDismissed.has(item.id)}
              onPress={() => onOpen(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ width: BOX_GAP }} />}
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={BOX_WIDTH + BOX_GAP}
          snapToAlignment="start"
          disableIntervalMomentum
          initialNumToRender={4}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={false}
          contentContainerStyle={styles.railContent}
        />
      ) : <EmptyRailTile incoming={incoming} />}
    </View>
  );
}

export default function HomeTimeCapsulesScreen() {
  const router = useRouter();
  const { user, activeFamilyId, activeMembership } = useAuth();
  const uid = user?.uid ?? "";
  const [items, setItems] = useState<HomeTimeCapsule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeVersion, setTimeVersion] = useState(0);
  const [attentionDismissed, setAttentionDismissed] = useState<Set<string>>(() => new Set());
  const [recipientUpcoming, setRecipientUpcoming] = useState<HomeTimeCapsule[]>([]);

  const load = useCallback(async (refresh = false) => {
    if (!activeFamilyId || !uid) {
      setItems([]);
      setLoading(false);
      return;
    }
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const rows = await homeTimeCapsuleService.listVisible(activeFamilyId, uid);
      setItems(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được Hộp thời gian.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFamilyId, uid]);

  useFocusEffect(useCallback(() => { void load(false); }, [load]));

  useEffect(() => {
    if (!activeFamilyId || !uid) {
      setRecipientUpcoming([]);
      return;
    }
    return subscribeSharedRealtime<HomeTimeCapsule[]>({
      key: `home.time_capsules.recipient.all:${activeFamilyId}:${uid}`,
      listenerName: "home.time_capsules.recipient",
      start: (onData, onError) => homeTimeCapsuleService.watchRecipientCapsules(activeFamilyId, uid, onData, onError),
      onData: (capsules) => {
        const now = Date.now();
        setRecipientUpcoming(capsules.filter(item => timeCapsuleOpenMillis(item) > now));
        const visibleIncoming = capsules.filter(item => item.previewMode === "locked" || isTimeCapsuleOpen(item, now));
        setItems(current => {
          const kept = current.filter(item => !(item.createdByUid !== uid && item.recipientUids.includes(uid)));
          const byId = new Map(kept.map(item => [item.id, item]));
          visibleIncoming.forEach(item => byId.set(item.id, item));
          return Array.from(byId.values());
        });
      },
      onError: () => undefined,
    });
  }, [activeFamilyId, uid]);

  // The sender watches the same capsule metadata document that recipients update
  // through openedByUids. This makes the sender-side box lid animate as soon as
  // another device completes the first-open ceremony; no manual refresh is needed.
  useEffect(() => {
    if (!activeFamilyId || !uid) return;
    return subscribeSharedRealtime<HomeTimeCapsule[]>({
      key: `home.time_capsules.created.all:${activeFamilyId}:${uid}`,
      listenerName: "home.time_capsules.created",
      start: (onData, onError) => homeTimeCapsuleService.watchCreatedCapsules(activeFamilyId, uid, onData, onError),
      onData: (capsules) => {
        setItems(current => {
          const kept = current.filter(item => item.createdByUid !== uid);
          const byId = new Map(kept.map(item => [item.id, item]));
          capsules.forEach(item => byId.set(item.id, item));
          return Array.from(byId.values());
        });
      },
      onError: () => undefined,
    });
  }, [activeFamilyId, uid]);

  useEffect(() => {
    const now = Date.now();
    const nextOpenAt = [...items, ...recipientUpcoming]
      .map(timeCapsuleOpenMillis)
      .filter(value => value > now)
      .sort((a, b) => a - b)[0];
    if (!nextOpenAt) return;
    const delay = Math.min(2_147_000_000, Math.max(180, nextOpenAt - now + 120));
    const timer = setTimeout(() => {
      setTimeVersion(value => value + 1);
      if (activeFamilyId && uid) {
        void homeTimeCapsuleService.listVisible(activeFamilyId, uid)
          .then(rows => { setItems(rows); setError(null); })
          .catch(() => undefined);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [activeFamilyId, items, recipientUpcoming, timeVersion, uid]);

  const incoming = useMemo(
    () => items
      .filter(item => item.createdByUid !== uid && item.recipientUids.includes(uid))
      .sort(sortForRail(uid)),
    [items, timeVersion, uid],
  );
  const sent = useMemo(
    () => items
      .filter(item => item.createdByUid === uid)
      .sort(sortForRail(uid)),
    [items, timeVersion, uid],
  );

  const openCapsule = useCallback((capsule: HomeTimeCapsule) => {
    if (capsule.createdByUid !== uid && railStateFor(capsule, uid) === "ready") {
      setAttentionDismissed(current => {
        const next = new Set(current);
        next.add(capsule.id);
        return next;
      });
    }
    router.push(`/home-time-capsule/${capsule.id}` as never);
  }, [router, uid]);

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={COLORS.primary} />}
      >
        <BloomHeroHeader
          eyebrow="NHÀ MÌNH · HỘP THỜI GIAN"
          title="Giữ một lời cho đúng ngày"
          subtitle={`Một lời từ ${activeMembership?.familyName || "gia đình mình"} có thể ngủ yên đến đúng khoảnh khắc bạn chọn.`}
          variant="living"
          compact
          roundedBottom
          onBack={() => router.back()}
        />

        <View style={styles.body}>
          <Pressable onPress={() => router.push("/home-time-capsule-compose" as never)} style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}>
            <View style={styles.createIcon}><Ionicons name="gift-outline" size={23} color={COLORS.white} /></View>
            <View style={styles.createCopy}>
              <Text style={styles.createTitle}>Tạo Hộp thời gian</Text>
              <Text style={styles.createText}>Chọn người nhận, ngày mở và một trong 3 phong cách đã chốt.</Text>
            </View>
            <Ionicons name="add-circle" size={26} color={COLORS.white} />
          </Pressable>

          {!!error && <View style={styles.error}><Ionicons name="alert-circle-outline" size={18} color="#A7475B" /><Text style={styles.errorText}>{error}</Text></View>}

          {loading ? (
            <View style={styles.loading}><ActivityIndicator color={COLORS.primary} /><Text style={styles.loadingText}>Bloom đang tìm những chiếc hộp của nhà mình…</Text></View>
          ) : (
            <>
              <CapsuleRail
                title="Hộp dành cho tôi"
                subtitle="Hộp cần mở và hộp sắp đến ngày luôn ở phía trước. Vuốt ngang để xem thêm."
                items={incoming}
                uid={uid}
                incoming
                attentionDismissed={attentionDismissed}
                onOpen={openCapsule}
              />
              <CapsuleRail
                title="Hộp tôi gửi"
                subtitle="Theo dõi những lời bạn đã gửi. Hộp sẽ hé mở khi người thân bắt đầu đọc."
                items={sent}
                uid={uid}
                incoming={false}
                attentionDismissed={attentionDismissed}
                onOpen={openCapsule}
              />
            </>
          )}

          <BloomCard tone="soft" style={styles.note}>
            <Ionicons name="shield-checkmark-outline" size={21} color={COLORS.primary} />
            <View style={styles.noteCopy}>
              <Text style={styles.noteTitle}>Nội dung vẫn được khóa riêng</Text>
              <Text style={styles.noteText}>Chiếc hộp chỉ hé lộ trạng thái bên ngoài. Tên và lời nhắn vẫn được Bloom cất kín cho tới đúng giờ mở.</Text>
            </View>
          </BloomCard>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 34 },
  body: { paddingHorizontal: 16, paddingTop: 18, gap: 24 },
  createButton: { minHeight: 88, borderRadius: 24, backgroundColor: COLORS.primary, paddingHorizontal: 15, paddingVertical: 13, flexDirection: "row", alignItems: "center", gap: 12 },
  createIcon: { width: 50, height: 50, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.17)", alignItems: "center", justifyContent: "center" },
  createCopy: { flex: 1 },
  createTitle: { color: COLORS.white, fontSize: 15.5, fontWeight: "900" },
  createText: { marginTop: 4, color: "rgba(255,255,255,0.86)", fontSize: 11, lineHeight: 16 },
  pressed: { opacity: 0.76 },
  error: { flexDirection: "row", gap: 8, alignItems: "flex-start", borderRadius: 16, padding: 12, backgroundColor: "#FFF0F3" },
  errorText: { flex: 1, color: "#A7475B", fontSize: 11.5, lineHeight: 16 },
  loading: { minHeight: 190, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: COLORS.secondaryText, fontSize: 11.5 },
  railSection: { marginHorizontal: -16 },
  railHeader: { paddingHorizontal: 16, marginBottom: 12 },
  railTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  railTitle: { color: COLORS.primaryText, fontSize: 18, fontWeight: "900" },
  countPill: { minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 7, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  countText: { color: COLORS.primary, fontSize: 10, fontWeight: "900" },
  railSubtitle: { marginTop: 5, color: COLORS.secondaryText, fontSize: 10.8, lineHeight: 15.5, maxWidth: 350 },
  railContent: { paddingHorizontal: 16, paddingRight: 30, paddingBottom: 8 },
  boxCard: { width: BOX_WIDTH, minHeight: 218, borderRadius: 25, borderWidth: 1.2, padding: 12, shadowColor: "#75495A", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.09, shadowRadius: 12, elevation: 2 },
  boxCardReady: { borderWidth: 1.7, shadowOpacity: 0.17, elevation: 4 },
  boxCardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 24 },
  statePill: { minHeight: 24, borderRadius: 999, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.72)" },
  stateText: { fontSize: 8.5, fontWeight: "900" },
  boxStage: { height: 96, alignItems: "center", justifyContent: "flex-end", marginTop: 4 },
  boxGlow: { position: "absolute", width: 118, height: 70, borderRadius: 999, bottom: 9 },
  letterPeek: { position: "absolute", zIndex: 1, width: 65, height: 39, borderRadius: 9, bottom: 43, backgroundColor: "#FFFDF9", borderWidth: 1, borderColor: "rgba(137,87,103,0.12)", alignItems: "center", paddingTop: 10, gap: 5 },
  letterRule: { width: 35, height: 2, borderRadius: 2 },
  letterRuleShort: { width: 23, height: 2, borderRadius: 2 },
  boxBody: { zIndex: 2, width: 106, height: 57, borderRadius: 15, overflow: "hidden", borderWidth: 1, borderColor: "rgba(86,45,59,0.08)" },
  boxBodyShine: { position: "absolute", left: 8, right: 8, top: 7, height: 1, backgroundColor: "rgba(255,255,255,0.38)" },
  ribbonVertical: { position: "absolute", top: 0, bottom: 0, left: 44, width: 18, opacity: 0.94 },
  boxLid: { position: "absolute", zIndex: 3, width: 116, height: 27, borderRadius: 11, bottom: 46, borderWidth: 1, borderColor: "rgba(86,45,59,0.08)", shadowColor: "#593343", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.11, shadowRadius: 4, elevation: 2 },
  ribbonHorizontal: { position: "absolute", left: 0, right: 0, top: 8, height: 11, opacity: 0.96 },
  bowLoop: { position: "absolute", top: -11, width: 25, height: 16, borderWidth: 6, borderRadius: 12, backgroundColor: "transparent" },
  bowLeft: { left: 34, transform: [{ rotateZ: "-22deg" }] },
  bowRight: { right: 34, transform: [{ rotateZ: "22deg" }] },
  bowKnot: { position: "absolute", top: -7, left: 52, width: 13, height: 13, borderRadius: 7 },
  boxTitle: { marginTop: 8, color: COLORS.primaryText, fontSize: 12, fontWeight: "900" },
  boxDetail: { marginTop: 4, minHeight: 28, color: COLORS.secondaryText, fontSize: 9.7, lineHeight: 13.5 },
  boxFooter: { marginTop: 7, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  themeName: { fontSize: 9, fontWeight: "900" },
  emptyRailTile: { marginHorizontal: 16, minHeight: 122, borderRadius: 23, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, paddingHorizontal: 16, paddingVertical: 15, flexDirection: "row", alignItems: "center", gap: 12 },
  emptyRailIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  emptyRailTitle: { position: "absolute", left: 76, right: 14, top: 22, color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },
  emptyRailText: { flex: 1, marginLeft: 0, marginTop: 30, color: COLORS.secondaryText, fontSize: 10.4, lineHeight: 15 },
  note: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  noteCopy: { flex: 1 },
  noteTitle: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },
  noteText: { marginTop: 4, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15.5 },
});
