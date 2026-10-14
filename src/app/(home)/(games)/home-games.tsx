import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { BloomHeroHeader } from "../../../components/ui/BloomHeroHeader";
import { BloomCard, BloomEmptyState, BloomPill, BloomSectionHeader } from "../../../components/ui/BloomPageComponents";
import { useBloomToast } from "../../../components/ui/BloomToast";
import { COLORS } from "../../../constants/theme";
import { GAME_COPY } from "../../../data/games/homeGameQuestionBank";
import { useAuth } from "../../../context/AuthContext";
import { useChessRealtime } from "../../../context/ChessRealtimeContext";
import { useActiveBoardGameSession } from "../../../services/games/activeBoardGameSessionStore";
import { claimAndPresentBoardGame } from "../../../services/presentation/boardGamePresentationCoordinator";
import { beginLocalBoardGameReservation, usePendingBoardGameReservation } from "../../../services/games/pendingBoardGameReservationStore";
import { cancelPendingBoardGameReservation } from "../../../services/games/pendingBoardGameReservationActions";
import { homeGameService } from "../../../services/home/homeGameService";
import { formatHomeGameDeadline, getHomeGamePlayWindow, homeGameStatusLabel } from "../../../services/home/homeGamePolicy";
import { subscribeSharedRealtime } from "../../../services/realtime/sharedRealtimeRegistry";
import { resolveOrCreateXiangqiSession } from "../../../services/xiangqi/xiangqiSessionBootstrap";
import { cacheXiangqiBootstrapState } from "../../../services/xiangqi/xiangqiSurfaceStore";
import type { HomeGameSession, HomeGameType } from "../../../types/homeLiving";

const TYPES: HomeGameType[] = ["know_each_other", "guess_person", "memory_owner", "truth_lie", "story_chain", "family_bingo"];


export default function HomeGamesScreen() {
  const router = useRouter();
  const { user, userProfile, activeFamilyId } = useAuth();
  const { showToast } = useBloomToast();
  const chessRealtime = useChessRealtime();
  const activeBoardGame = useActiveBoardGameSession();
  const pendingBoardGame = usePendingBoardGameReservation();
  const [cancellingPending, setCancellingPending] = useState(false);
  const [sessions, setSessions] = useState<HomeGameSession[]>([]);
  const [clockNow, setClockNow] = useState(Date.now());
  const [screenFocused, setScreenFocused] = useState(true);
  useFocusEffect(useCallback(() => {
    setScreenFocused(true);
    setClockNow(Date.now());
    return () => setScreenFocused(false);
  }, []));
  const uid = user?.uid ?? "";
  const displayName = userProfile?.shortName || userProfile?.displayName || "Bạn";
  const playWindow = useMemo(() => getHomeGamePlayWindow(clockNow), [clockNow]);

  useEffect(() => {
    if (!screenFocused) return undefined;
    const timer = setInterval(() => setClockNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [screenFocused]);

  useEffect(() => {
    if (!screenFocused) return undefined;
    if (!activeFamilyId || !uid) {
      setSessions([]);
      return undefined;
    }
    return subscribeSharedRealtime<HomeGameSession[]>({
      key: `home.games.visible:${activeFamilyId}:${uid}`,
      listenerName: "home.games.visible",
      start: (onData, onError) => homeGameService.watchVisible(activeFamilyId, uid, onData, onError),
      onData: setSessions,
      onError: () => undefined,
    });
  }, [activeFamilyId, screenFocused, uid]);

  const visibleSessions = sessions;

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
  const pendingLabel = pendingBoardGame?.gameKind === "chess" ? "Cờ vua" : "Cờ tướng";
  const cancelPending = async () => {
    if (!pendingBoardGame || cancellingPending) return;
    setCancellingPending(true);
    const result = await cancelPendingBoardGameReservation(pendingBoardGame.gameKind);
    setCancellingPending(false);
    if (result.ok) {
      showToast({ type: "success", title: `Đã hủy phiên ${pendingLabel}`, message: "Bạn có thể chọn một ván khác ngay bây giờ." });
    } else {
      showToast({ type: "warning", title: "Chưa hủy được phiên đang chờ", message: result.message || "Bloom sẽ giữ khóa để tránh tạo hai ván cùng lúc. Bạn thử lại nhé." });
    }
  };
  const blockByPending = (wanted: "chess" | "xiangqi") => {
    if (!pendingBoardGame || pendingBoardGame.gameKind === wanted) return false;
    showToast({
      type: "info",
      title: `Bạn đang chờ một ván ${pendingLabel}`,
      message: `Hãy tiếp tục chờ hoặc hủy phiên ${pendingLabel} bên dưới trước khi bắt đầu ${wanted === "chess" ? "Cờ vua" : "Cờ tướng"}.`,
      duration: 5200,
    });
    return true;
  };
  const openChess = () => {
    if (blockByPending("chess")) return;
    if (activeBoardGame?.kind === "xiangqi" || chessRealtime.busyOtherGame?.gameKind === "xiangqi") {
      router.push("/xiangqi-preview" as never);
      return;
    }
    const gameId = activeBoardGame?.kind === "chess"
      ? activeBoardGame.gameId
      : chessRealtime.activeGameId;
    if (gameId) {
      router.navigate({ pathname: "/(chess)/chess-game/[gameId]", params: { gameId } } as never);
      return;
    }
    beginLocalBoardGameReservation("chess", activeFamilyId, "connecting");
    router.push("/chess-lobby" as never);
  };
  const openXiangqi = async () => {
    if (blockByPending("xiangqi")) return;
    if (activeBoardGame?.kind === "xiangqi") {
      router.push("/xiangqi-preview" as never);
      return;
    }
    // P2.21: only a live authoritative Chess id may block Xiangqi. Finished
    // results live in the independent root result store and never participate in
    // Game Hub arbitration.
    const activeChessGameId = activeBoardGame?.kind === "chess"
      ? activeBoardGame.gameId
      : chessRealtime.activeGameId;
    if (activeChessGameId) {
      showToast({
        type: "info",
        title: "Cờ vua vẫn đang tiếp tục",
        message: "Bloom giữ đúng ván Cờ vua hiện tại. Hãy kết thúc ván đó trước khi mở Cờ tướng.",
        duration: 4200,
      });
      return;
    }
    if (!activeFamilyId) {
      showToast({ type: "warning", title: "Chưa mở được Cờ tướng", message: "Bloom chưa xác định được Nhà đang hoạt động. Bạn thử lại ngay nhé." });
      return;
    }

    // P2.19: normal Game Hub entry never navigates to a blank command route and
    // then asks the server which session exists. Resolve/create while the user
    // remains on the Hub (the pending card + Cancel path are already visible),
    // then mount the board only after a concrete authoritative gameId exists.
    const result = await resolveOrCreateXiangqiSession(activeFamilyId);
    if (result.kind === "busy_chess") {
      showToast({
        type: "info",
        title: "Cờ vua vẫn đang tiếp tục",
        message: "Bloom vừa xác nhận máy chủ vẫn giữ ván Cờ vua hiện tại.",
        duration: 4200,
      });
      return;
    }
    if (result.kind === "pending") {
      // Stay on Game Hub. The shared pending card is the explicit waiting/cancel
      // surface; do not replace the whole phone with a session-check screen.
      return;
    }
    if (result.kind === "error") {
      showToast({ type: "warning", title: "Chưa mở được Cờ tướng", message: result.message });
      return;
    }

    cacheXiangqiBootstrapState(result.state);
    const claimed = claimAndPresentBoardGame({
      kind: "xiangqi",
      gameId: result.state.gameId,
      familyId: activeFamilyId,
      source: "server",
      presentation: "hidden",
      reason: "active_game",
    });
    if (!claimed) {
      showToast({ type: "warning", title: "Bloom đang giữ một ván khác", message: "Phiên Cờ tướng đã được xác nhận nhưng chưa thể chiếm màn hình. Bạn thử lại nhé." });
      return;
    }

    // Give the root GameBoardHost one frame to lazy-mount the now-authoritative
    // Xiangqi layer while it is still parked. The route then only raises it.
    requestAnimationFrame(() => router.push("/xiangqi-preview" as never));
  };

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
          <BloomCard style={styles.chessCard} onPress={openChess}>
            <View style={styles.chessIcon}><Image accessibilityLabel="Quân Mã cờ vua" source={require("../../../../assets/images/chess/pieces-png-default/bn.png")} resizeMode="contain" fadeDuration={0} style={styles.chessPieceIcon} /></View>
            <View style={styles.chessCopy}>
              <Text style={styles.chessTitle}>Cờ vua Nhà Mình</Text>
              <Text style={styles.chessText}>Thách đấu trực tiếp · Bloom giữ nhịp ván cờ và giúp bạn trở lại nếu kết nối chập chờn.</Text>
              <View style={styles.pills}><BloomPill icon="flash-outline" label="Realtime 1v1" /><BloomPill icon="shield-checkmark-outline" label="Server authoritative" /></View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
          </BloomCard>

          <BloomSectionHeader title="Cờ tướng Nhà Mình" subtitle="Bộ quân đã chốt · luật nền đã chạy · chơi một ván cùng Bloom Bot." />
          <BloomCard style={styles.chessCard} onPress={() => { void openXiangqi(); }}>
            <View style={styles.xiangqiIcon}><Image accessibilityLabel="Quân Tướng cờ tướng" source={require("../../../../assets/images/games/xiangqi-general-icon.png")} resizeMode="contain" fadeDuration={0} style={styles.xiangqiPieceIcon} /></View>
            <View style={styles.chessCopy}>
              <Text style={styles.chessTitle}>Cờ tướng Nhà Mình</Text>
              <Text style={styles.chessText}>Chạm để chơi trọn ván với Bloom Bot: chọn quân, xem nước hợp lệ, bắt quân và chiếu Tướng.</Text>
              <View style={styles.pills}><BloomPill icon="game-controller-outline" label="Chơi được ngay" /><BloomPill icon="shield-checkmark-outline" label="Luật nền V1" /></View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
          </BloomCard>

          {pendingBoardGame ? (
            <BloomCard tone="soft" style={styles.pendingGameCard}>
              <View style={styles.pendingGameIcon}><Ionicons name="hourglass-outline" size={20} color={COLORS.primary} /></View>
              <View style={styles.pendingGameCopy}>
                <Text style={styles.pendingGameTitle}>Đang chờ một ván {pendingLabel}</Text>
                <Text style={styles.pendingGameText}>Bloom đang giữ phiên này để không tạo trùng Cờ vua/Cờ tướng. Muốn đổi game, hãy hủy phiên đang chờ trước.</Text>
              </View>
              <Pressable disabled={cancellingPending} onPress={() => void cancelPending()} style={[styles.pendingGameCancel, cancellingPending && styles.pendingGameCancelDisabled]}>
                <Text style={styles.pendingGameCancelText}>{cancellingPending ? "Đang hủy…" : "Hủy"}</Text>
              </Pressable>
            </BloomCard>
          ) : null}

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
            subtitle="Những ván gần đây của nhà được giữ gọn ở đây"
          />

          {visibleSessions.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sessionRail} snapToInterval={236} decelerationRate="fast">
              {visibleSessions.slice(0, 20).map(item => {
                const meta = GAME_COPY[item.gameType];
                return (
                  <Pressable key={item.id} onPress={() => open(item.id)} style={({ pressed }) => [styles.sessionCard, pressed && styles.pressed]}>
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
  xiangqiIcon: { width: 56, height: 56, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF1E1", overflow: "hidden" },
  xiangqiPieceIcon: { width: 50, height: 50 },
  chessCopy: { flex: 1, gap: 5 },
  chessTitle: { color: COLORS.primaryText, fontSize: 14.5, fontWeight: "900" },
  chessText: { color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15.5 },
  pendingGameCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFF4F8" },
  pendingGameIcon: { width: 40, height: 40, borderRadius: 15, backgroundColor: "#F7E1EA", alignItems: "center", justifyContent: "center" },
  pendingGameCopy: { flex: 1, minWidth: 0 },
  pendingGameTitle: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },
  pendingGameText: { marginTop: 3, color: COLORS.secondaryText, fontSize: 9.8, lineHeight: 14 },
  pendingGameCancel: { minHeight: 38, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  pendingGameCancelDisabled: { opacity: 0.5 },
  pendingGameCancelText: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gameCard: { width: "48.5%", minHeight: 196, padding: 14 },
  gameIcon: { width: 46, height: 46, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  gameTitle: { marginTop: 11, color: COLORS.primaryText, fontSize: 13.5, lineHeight: 18, fontWeight: "900" },
  gameText: { marginTop: 5, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15.5 },
  gameBottom: { marginTop: "auto", paddingTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  gameMinutes: { color: COLORS.primary, fontSize: 9.5, fontWeight: "900" },
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
