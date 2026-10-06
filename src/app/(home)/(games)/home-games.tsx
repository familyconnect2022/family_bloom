import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { BloomHeroHeader } from "../../../components/ui/BloomHeroHeader";
import { BloomCard, BloomEmptyState, BloomPill, BloomSectionHeader } from "../../../components/ui/BloomPageComponents";
import { useBloomToast } from "../../../components/ui/BloomToast";
import { XiangqiPiece } from "../../../components/xiangqi/XiangqiPiece";
import { COLORS } from "../../../constants/theme";
import { GAME_COPY } from "../../../data/games/homeGameQuestionBank";
import { useAuth } from "../../../context/AuthContext";
import { homeGameService } from "../../../services/home/homeGameService";
import { formatHomeGameDeadline, getHomeGamePlayWindow, homeGameStatusLabel } from "../../../services/home/homeGamePolicy";
import { subscribeSharedRealtime } from "../../../services/realtime/sharedRealtimeRegistry";
import type { HomeGameSession, HomeGameType } from "../../../types/homeLiving";

const TYPES: HomeGameType[] = ["know_each_other", "guess_person", "memory_owner", "truth_lie", "story_chain", "family_bingo"];


export default function HomeGamesScreen() {
  const router = useRouter();
  const { user, userProfile, activeFamilyId } = useAuth();
  const { showToast } = useBloomToast();
  const [sessions, setSessions] = useState<HomeGameSession[]>([]);
  const [demoCount, setDemoCount] = useState<0 | 10 | 50 | 100>(0);
  const [clockNow, setClockNow] = useState(Date.now());
  const uid = user?.uid ?? "";
  const displayName = userProfile?.shortName || userProfile?.displayName || "Bạn";
  const playWindow = useMemo(() => getHomeGamePlayWindow(clockNow), [clockNow]);

  useEffect(() => {
    const timer = setInterval(() => setClockNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!activeFamilyId || !uid) {
      setSessions([]);
      return;
    }
    return subscribeSharedRealtime<HomeGameSession[]>({
      key: `home.games.visible:${activeFamilyId}:${uid}`,
      listenerName: "home.games.visible",
      start: (onData, onError) => homeGameService.watchVisible(activeFamilyId, uid, onData, onError),
      onData: setSessions,
      onError: () => undefined,
    });
  }, [activeFamilyId, uid]);

  const visibleSessions = useMemo(() => {
    if (!demoCount || !activeFamilyId || !uid) return sessions;
    return homeGameService.simulated(activeFamilyId, uid, displayName, demoCount);
  }, [activeFamilyId, demoCount, displayName, sessions, uid]);

  const todayType = TYPES[new Date().getDate() % TYPES.length];
  const today = GAME_COPY[todayType];
  const create = (type: HomeGameType) => {
    const latest = getHomeGamePlayWindow();
    if (!latest.canCreate) {
      showToast({ title: "Hẹn nhà mình sáng mai nhé", message: latest.message || "Trò chơi mới sẽ mở lại từ 6:00 sáng.", duration: 4200 });
      return;
    }
    router.push({ pathname: "/home-game-create" as never, params: { type } } as never);
  };
  const open = (id: string) => router.push(`/home-game/${id}` as never);

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BloomHeroHeader
          eyebrow="TRÒ CHƠI NHÀ MÌNH"
          title="Một ván là một câu chuyện"
          subtitle="Chơi ngắn, chơi bất đồng bộ và để mỗi câu trả lời trở thành một lý do để cả nhà hiểu nhau hơn."
          variant="game"
          onBack={() => router.back()}
          roundedBottom
          compact
        />

        <View style={styles.body}>
          <BloomCard style={styles.todayCard} onPress={() => create(todayType)}>
            <View style={styles.todayTop}>
              <View style={[styles.todayIcon, { backgroundColor: today.tone }]}><Ionicons name={today.icon as any} size={28} color={COLORS.primaryText} /></View>
              <View style={styles.todayCopy}>
                <Text style={styles.kicker}>GỢI Ý HÔM NAY</Text>
                <Text style={styles.todayTitle}>{today.title}</Text>
                <Text style={styles.todayText}>{today.short}</Text>
              </View>
            </View>
            <View style={styles.pills}><BloomPill icon="people-outline" label="Cả nhà tự động tham gia" /><BloomPill icon="time-outline" label="06:00–22:00" /></View>
            <View style={[styles.todayAction, !playWindow.canCreate && styles.todayActionSleeping]}><Text style={styles.todayActionText}>{playWindow.canCreate ? "Tạo lượt mới" : "Mở lại lúc 06:00"}</Text><Ionicons name={playWindow.canCreate ? "arrow-forward" : "moon-outline"} size={18} color={COLORS.white} /></View>
          </BloomCard>

          <BloomSectionHeader title="Cờ vua cùng lúc" subtitle="Một bàn cờ riêng cho hai người đang cùng có mặt trong Bloom." />
          <BloomCard style={styles.chessCard} onPress={() => router.push("/chess-lobby" as never)}>
            <View style={styles.chessIcon}><Image accessibilityLabel="Quân Mã cờ vua" source={require("../../../../assets/images/chess/pieces-webp-default/bn.webp")} resizeMode="contain" fadeDuration={0} style={styles.chessPieceIcon} /></View>
            <View style={styles.chessCopy}>
              <Text style={styles.chessTitle}>Cờ vua Nhà Mình</Text>
              <Text style={styles.chessText}>Thách đấu trực tiếp · Bloom giữ nhịp ván cờ và giúp bạn trở lại nếu kết nối chập chờn.</Text>
              <View style={styles.pills}><BloomPill icon="flash-outline" label="Realtime 1v1" /><BloomPill icon="shield-checkmark-outline" label="Server authoritative" /></View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
          </BloomCard>

          <BloomSectionHeader title="Cờ tướng Nhà Mình" subtitle="Bộ quân đã chốt · luật nền đã chạy · thử một ván cùng Bloom Bot." />
          <BloomCard style={styles.chessCard} onPress={() => router.push("/xiangqi-preview" as never)}>
            <View style={styles.xiangqiIcon}><XiangqiPiece color="red" type="general" size={48} /></View>
            <View style={styles.chessCopy}>
              <Text style={styles.chessTitle}>Cờ tướng Nhà Mình</Text>
              <Text style={styles.chessText}>Chạm để chơi thử trọn ván với Bloom Bot: chọn quân, xem nước hợp lệ, bắt quân và chiếu Tướng.</Text>
              <View style={styles.pills}><BloomPill icon="game-controller-outline" label="Chơi được ngay" /><BloomPill icon="shield-checkmark-outline" label="Luật nền V1" /></View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
          </BloomCard>

          <BloomSectionHeader title="6 trò đã sẵn sàng" subtitle="Không có bảng xếp hạng áp lực. Điểm chỉ để vui, kết quả mới là phần đáng nhớ." />
          <View style={styles.grid}>
            {TYPES.map(type => {
              const item = GAME_COPY[type];
              return (
                <BloomCard key={type} style={styles.gameCard} onPress={() => create(type)}>
                  <View style={[styles.gameIcon, { backgroundColor: item.tone }]}><Ionicons name={item.icon as any} size={24} color={COLORS.primaryText} /></View>
                  <Text style={styles.gameTitle}>{item.title}</Text>
                  <Text style={styles.gameText}>{item.short}</Text>
                  <View style={styles.gameBottom}><Text style={styles.gameMinutes}>{item.minutes}</Text><Ionicons name="add-circle" size={20} color={COLORS.primary} /></View>
                </BloomCard>
              );
            })}
          </View>

          <BloomSectionHeader
            title="Ván của nhà mình"
            subtitle={demoCount ? `Đang xem ${demoCount} ván mẫu · hoàn toàn tách khỏi dữ liệu gia đình` : "Những ván gần đây của nhà được giữ gọn ở đây"}
          />
          <View style={styles.demoRow}>
            <Text style={styles.demoLabel}>Dữ liệu thử:</Text>
            {([0, 10, 50, 100] as const).map(count => (
              <Pressable key={count} onPress={() => setDemoCount(count)} style={[styles.demoChip, demoCount === count && styles.demoChipActive]}>
                <Text style={[styles.demoChipText, demoCount === count && styles.demoChipTextActive]}>{count === 0 ? "Tắt" : count}</Text>
              </Pressable>
            ))}
          </View>

          {visibleSessions.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sessionRail} snapToInterval={236} decelerationRate="fast">
              {visibleSessions.slice(0, demoCount ? demoCount : 20).map(item => {
                const meta = GAME_COPY[item.gameType];
                return (
                  <Pressable key={item.id} disabled={item.id.startsWith("sim-")} onPress={() => open(item.id)} style={({ pressed }) => [styles.sessionCard, pressed && styles.pressed]}>
                    <View style={[styles.sessionIcon, { backgroundColor: meta.tone }]}><Ionicons name={meta.icon as any} size={22} color={COLORS.primaryText} /></View>
                    <Text style={styles.sessionStatus}>{homeGameStatusLabel(item, clockNow)}</Text>
                    <Text style={styles.sessionTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.sessionMeta}>{item.participantUids.length} người · {item.submittedUids.length} đã tham gia</Text>
                    <Text style={styles.sessionTime}>{item.endsAtMs ? `Khép lại ${formatHomeGameDeadline(item.endsAtMs)}` : new Date(item.updatedAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <BloomEmptyState icon="game-controller-outline" title="Chưa có ván nào" description="Chọn một trò phía trên. Mọi người có thể tham gia vào thời điểm thuận tiện của mình." />
          )}

          <BloomCard tone="soft" style={styles.noteCard}>
            <Ionicons name="leaf-outline" size={20} color={COLORS.primary} />
            <Text style={styles.noteText}>Phòng game chỉ mở lượt mới từ 06:00 đến trước 22:00 để nhà mình có khoảng nghỉ buổi tối. Sáu trò gia đình tự lấy toàn bộ membership thật; Cờ vua chỉ cho thách đấu khi hai người đang ở sảnh và còn trong khung giờ chơi.</Text>
          </BloomCard>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  body: { paddingHorizontal: 16, paddingTop: 18, gap: 18 },
  todayCard: { padding: 17, gap: 14, backgroundColor: "#FFF9FC" },
  todayTop: { flexDirection: "row", gap: 13, alignItems: "center" },
  todayIcon: { width: 62, height: 62, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  todayCopy: { flex: 1 },
  kicker: { color: COLORS.primary, fontSize: 9.5, letterSpacing: 0.8, fontWeight: "900" },
  todayTitle: { marginTop: 4, color: COLORS.primaryText, fontSize: 18, lineHeight: 23, fontWeight: "900" },
  todayText: { marginTop: 5, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  todayAction: { minHeight: 46, borderRadius: 18, backgroundColor: COLORS.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  todayActionText: { color: COLORS.white, fontSize: 13.5, fontWeight: "900" },
  todayActionSleeping: { opacity: 0.72 },
  chessCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: "#FFF9FC" },
  chessIcon: { width: 56, height: 56, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#F4DDE7", overflow: "visible" },
  chessPieceIcon: { width: 47, height: 47 },
  xiangqiIcon: { width: 56, height: 56, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF1E1", overflow: "visible" },
  chessCopy: { flex: 1, gap: 5 },
  chessTitle: { color: COLORS.primaryText, fontSize: 14.5, fontWeight: "900" },
  chessText: { color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15.5 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gameCard: { width: "48.5%", minHeight: 196, padding: 14 },
  gameIcon: { width: 46, height: 46, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  gameTitle: { marginTop: 11, color: COLORS.primaryText, fontSize: 13.5, lineHeight: 18, fontWeight: "900" },
  gameText: { marginTop: 5, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15.5 },
  gameBottom: { marginTop: "auto", paddingTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  gameMinutes: { color: COLORS.primary, fontSize: 9.5, fontWeight: "900" },
  demoRow: { flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap" },
  demoLabel: { color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "800" },
  demoChip: { minWidth: 42, height: 32, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.white },
  demoChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  demoChipText: { color: COLORS.primaryText, fontSize: 10.5, fontWeight: "900" },
  demoChipTextActive: { color: COLORS.white },
  sessionRail: { gap: 10, paddingRight: 20 },
  sessionCard: { width: 226, minHeight: 156, borderRadius: 24, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, padding: 14, shadowColor: "#7E4D61", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2 },
  sessionIcon: { width: 40, height: 40, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  sessionStatus: { position: "absolute", top: 16, right: 14, color: COLORS.primary, fontSize: 9, fontWeight: "900" },
  sessionTitle: { marginTop: 10, color: COLORS.primaryText, fontSize: 14, lineHeight: 19, fontWeight: "900" },
  sessionMeta: { marginTop: 5, color: COLORS.secondaryText, fontSize: 10.5 },
  sessionTime: { marginTop: "auto", paddingTop: 8, color: COLORS.secondaryText, fontSize: 9.5 },
  noteCard: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  noteText: { flex: 1, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17 },
  pressed: { opacity: 0.7 },
});
