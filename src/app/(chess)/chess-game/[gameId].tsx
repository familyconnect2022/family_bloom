import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";

import { ChessBattleEffects, deriveChessBattleEvent, type ChessBattleEvent } from "../../../components/chess/ChessBattleEffects";
import { BloomGameBottomModal } from "../../../components/chess/BloomGameBottomModal";
import { ChessBoard } from "../../../components/chess/ChessBoard";
import { capturePoints } from "../../../components/chess/ChessMaterialStrip";
import { ChessPlayerRail } from "../../../components/chess/ChessPlayerRail";
import { ChessVictoryConfetti } from "../../../components/chess/ChessVictoryConfetti";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { BloomHeroHeader } from "../../../components/ui/BloomHeroHeader";
import { useBloomDialog } from "../../../components/ui/BloomDialogProvider";
import { useBloomToast } from "../../../components/ui/BloomToast";
import { COLORS } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { useFamilyMembersRealtime } from "../../../context/FamilyRealtimeContext";
import { useChessRealtime } from "../../../context/ChessRealtimeContext";
import { useChessGame } from "../../../hooks/chess/useChessGame";
import { useDeferredGameSurface } from "../../../hooks/games/useDeferredGameSurface";
import { getHomeGamePlayWindow } from "../../../services/games/gameRoomPolicy";
import { getCachedChessGameSnapshot } from "../../../services/chess/chessGameSnapshotCache";
import { gameRuntimePerf } from "../../../services/games/gameRuntimePerf";
import { CHESS_ERROR_COPY, emptyChessCaptureSummary, type ChessColor, type ChessGameState, type ChessGameStatus } from "../../../types/chess";
import { safeRouterBack } from "../../../utils/safeRouterBack";

const HINTS_ENABLED = true;
const MOTION_ENABLED = true;
const FX_ENABLED = true;

type ChessEntryPhase = "preparing" | "ready" | "playing";

const PROMOTION_IMAGES = {
  w: {
    q: require("../../../../assets/images/chess/pieces-webp-default/wq.webp"),
    r: require("../../../../assets/images/chess/pieces-webp-default/wr.webp"),
    b: require("../../../../assets/images/chess/pieces-webp-default/wb.webp"),
    n: require("../../../../assets/images/chess/pieces-webp-default/wn.webp"),
  },
  b: {
    q: require("../../../../assets/images/chess/pieces-webp-default/bq.webp"),
    r: require("../../../../assets/images/chess/pieces-webp-default/br.webp"),
    b: require("../../../../assets/images/chess/pieces-webp-default/bb.webp"),
    n: require("../../../../assets/images/chess/pieces-webp-default/bn.webp"),
  },
} as const;

const finishCopy = (reason: string | null) => ({
  checkmate: "Chiếu hết",
  resignation: "Đầu hàng",
  timeout: "Hết giờ",
  away_timeout: "Hết thời gian rời bàn",
  stalemate: "Hòa do hết nước",
  draw: "Hai bên đồng ý hòa",
  insufficient_material: "Không đủ quân chiếu hết",
  threefold_repetition: "Lặp lại thế cờ",
  fifty_move_rule: "Luật 50 nước",
  abandoned: "Ván kết thúc",
}[reason || ""] || "Ván kết thúc");

export default function ChessGameScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const router = useRouter();
  const { user, activeFamilyId } = useAuth();
  const members = useFamilyMembersRealtime();
  const chessRealtime = useChessRealtime();
  const { confirm } = useBloomDialog();
  const { showToast } = useBloomToast();
  const [screenFocused, setScreenFocused] = useState(true);
  useFocusEffect(React.useCallback(() => {
    setScreenFocused(true);
    return () => setScreenFocused(false);
  }, []));
  const heavySurfaceMounted = useDeferredGameSurface(screenFocused);
  const seedState = getCachedChessGameSnapshot(gameId || null);
  const game = useChessGame(activeFamilyId, gameId || null, screenFocused, seedState);

  const [promotion, setPromotion] = useState<{
    from: string;
    to: string;
    resolve?: (piece: "q" | "r" | "b" | "n" | null) => void;
  } | null>(null);
  const [clockNow, setClockNow] = useState(Date.now());
  const [battleEvent, setBattleEvent] = useState<ChessBattleEvent | null>(null);
  const [rematchLoading, setRematchLoading] = useState(false);
  const [resultDismissed, setResultDismissed] = useState(false);
  const [entryPhase, setEntryPhase] = useState<ChessEntryPhase>("preparing");
  const [boardReady, setBoardReady] = useState(false);
  const whiteTurnActive = useSharedValue(0);
  const blackTurnActive = useSharedValue(0);

  const playWindow = useMemo(() => getHomeGamePlayWindow(clockNow), [clockNow]);
  const state = game.state;
  const me = user?.uid || "";
  const myColor: ChessColor | null = state
    ? state.whiteUid === me ? "w" : state.blackUid === me ? "b" : null
    : null;
  const opponentUid = state ? (state.whiteUid === me ? state.blackUid : state.whiteUid) : "";
  const opponent = members?.memberByUid.get(opponentUid);
  const isTestBotOpponent = !!state?.testBotUid && state.testBotUid === opponentUid;
  const opponentDisplayName = isTestBotOpponent
    ? "Bloom Bot"
    : (opponent?.shortName || opponent?.displayName || "Người thân");
  const canRematchNow = isTestBotOpponent || playWindow.canCreate;
  const myMember = members?.memberByUid.get(me);
  const captureSummary = state?.captureSummary ?? emptyChessCaptureSummary();
  const whiteCapturePoints = useMemo(() => capturePoints(captureSummary.byWhite), [captureSummary.byWhite]);
  const blackCapturePoints = useMemo(() => capturePoints(captureSummary.byBlack), [captureSummary.byBlack]);
  const whiteAdvantage = Math.max(0, whiteCapturePoints - blackCapturePoints);
  const blackAdvantage = Math.max(0, blackCapturePoints - whiteCapturePoints);

  const handleBoardReady = React.useCallback(() => {
    setBoardReady(true);
  }, []);

  const handleVisualTurnChange = React.useCallback((turn: ChessColor, status: ChessGameStatus) => {
    const active = status === "active";
    whiteTurnActive.value = active && turn === "w" ? 1 : 0;
    blackTurnActive.value = active && turn === "b" ? 1 : 0;
  }, [blackTurnActive, whiteTurnActive]);

  useEffect(() => {
    if (!screenFocused) return undefined;
    const timer = setInterval(() => setClockNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [screenFocused]);

  useEffect(() => {
    setRematchLoading(false);
    setResultDismissed(false);
    setPromotion(null);
    setBattleEvent(null);
    setBoardReady(false);
    setEntryPhase("preparing");
  }, [gameId]);

  useEffect(() => {
    if (screenFocused) return;
    setBattleEvent(null);
    whiteTurnActive.value = 0;
    blackTurnActive.value = 0;
    setPromotion((current) => {
      current?.resolve?.(null);
      return null;
    });
  }, [blackTurnActive, screenFocused, whiteTurnActive]);

  useEffect(() => {
    if (!screenFocused || !state) return;
    if (rematchLoading) {
      setEntryPhase("preparing");
      return;
    }
    if (state.status === "finished" || state.status === "cancelled") {
      setEntryPhase("playing");
      return;
    }
    if (state.status === "waiting" || state.status === "paused") {
      setEntryPhase("preparing");
      return;
    }
    if (state.status !== "active" || state.ply > 0) {
      setEntryPhase("playing");
      return;
    }

    // No synthetic timer may dismiss the shield before the board itself has
    // reported: layout measured + every initial piece controller mounted +
    // every piece image loaded + two painted frames.
    if (!boardReady) {
      setEntryPhase("preparing");
      return;
    }

    setEntryPhase("ready");
    const playingTimer = setTimeout(() => setEntryPhase("playing"), 620);
    return () => clearTimeout(playingTimer);
  }, [boardReady, rematchLoading, screenFocused, state?.gameId, state?.ply, state?.status]);

  const handleVisualCommit = React.useCallback((previous: ChessGameState, current: ChessGameState) => {
    if (!myColor) return;
    setBattleEvent(deriveChessBattleEvent(previous, current, myColor));
  }, [myColor]);

  useEffect(() => {
    gameRuntimePerf.markSurface("chess", heavySurfaceMounted);
    if (!heavySurfaceMounted) setBoardReady(false);
  }, [heavySurfaceMounted]);

  useEffect(() => {
    if (!screenFocused) return;
    if (state?.drawOfferByUid && state.drawOfferByUid !== me && state.status === "active") {
      void confirm({
        eyebrow: "ĐỀ NGHỊ HÒA",
        title: "Người thân muốn hòa ván này",
        message: "Bạn có thể đồng ý hoặc tiếp tục chơi.",
        confirmLabel: "Đồng ý hòa",
        cancelLabel: "Tiếp tục chơi",
        icon: "hand-left-outline",
      }).then(async (ok) => {
        const response = ok ? await game.acceptDraw() : await game.rejectDraw();
        if (!response.ok) showToast({ type: "warning", message: CHESS_ERROR_COPY[response.errorCode] });
      });
    }
  }, [confirm, game.acceptDraw, game.rejectDraw, state?.drawOfferByUid, state?.status, me, screenFocused, showToast]);

  const requestPromotion = React.useCallback((from: string, to: string) => new Promise<"q" | "r" | "b" | "n" | null>((resolve) => {
    setPromotion({ from, to, resolve });
  }), []);

  const runMove = React.useCallback(async (
    from: string,
    to: string,
    piece: "q" | "r" | "b" | "n" | undefined,
    clientMoveId: string,
    expectedVersion: number,
  ) => {
    const response = await game.move(from, to, piece, clientMoveId, expectedVersion);
    if (!response.ok) showToast({ type: "warning", message: CHESS_ERROR_COPY[response.errorCode] });
    return response;
  }, [game.move, showToast]);

  const handleRematch = React.useCallback(async () => {
    if (rematchLoading) return;
    if (!isTestBotOpponent) {
      const latest = getHomeGamePlayWindow();
      if (!latest.canCreate) {
        showToast({
          type: "info",
          title: "Ván này khép lại rồi 🌙",
          message: "Mình hẹn nhau chơi tiếp từ 6:00 sáng nhé.",
        });
        return;
      }
    }

    setRematchLoading(true);
    try {
      const response = await game.rematch();
      if (response.ok && response.data.gameId) {
        router.replace({
          pathname: "/chess-game/[gameId]" as never,
          params: { gameId: response.data.gameId },
        } as never);
        return;
      }
      if (response.ok) {
        showToast({ type: "info", message: "Đang chờ người thân đồng ý chơi lại." });
      } else {
        showToast({ type: "warning", message: CHESS_ERROR_COPY[response.errorCode] });
        setResultDismissed(false);
      }
      setRematchLoading(false);
    } catch {
      setRematchLoading(false);
      setResultDismissed(false);
      showToast({ type: "warning", message: "Bloom chưa chuẩn bị được ván mới. Thử lại giúp mình nhé." });
    }
  }, [game.rematch, isTestBotOpponent, rematchLoading, router, showToast]);

  if (game.loading || !state || !myColor) {
    return (
      <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
        <StatusBar translucent backgroundColor="transparent" style="dark" />
        <BloomHeroHeader
          eyebrow="CỜ VUA NHÀ MÌNH"
          title="Bàn cờ đang về đúng vị trí"
          subtitle="Bloom giữ nguyên màn chơi trong lúc nhận snapshot mới nhất từ máy chủ."
          variant="game"
          onBack={() => safeRouterBack(router, "/chess-lobby" as never)}
          roundedBottom
          compact
        />
        <View style={styles.center}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loading}>{game.error ? "Không thể khôi phục ván cờ." : "Đang nhận trạng thái ván cờ…"}</Text>
            {game.error ? (
              <Pressable onPress={() => void game.resync()}><Text style={styles.retry}>Thử lại</Text></Pressable>
            ) : null}
          </View>
        </View>
      </ScreenContainer>
    );
  }

  const didWin = (state.result === "white" && myColor === "w") || (state.result === "black" && myColor === "b");
  const didDraw = state.result === "draw";
  const resultText = didDraw ? "Hòa" : didWin ? "Bạn thắng" : "Bạn thua";
  const resultEyebrow = didDraw ? "MỘT VÁN CỜ THẬT ĐẸP" : didWin ? "BLOOM CHÚC MỪNG" : "MÌNH CHƠI TIẾP NHÉ";
  const awayTimeout = state.finishReason === "away_timeout";
  const dismissResult = () => {
    setResultDismissed(true);
    if (awayTimeout) chessRealtime.acknowledgeAwayResult(state.gameId);
  };
  const resultMessage = didDraw
    ? "Hai bên đã tạo nên một ván cờ cân bằng và đáng nhớ."
    : awayTimeout
      ? didWin
        ? "Đối thủ đã rời bàn quá nửa quỹ thời gian còn lại. Máy chủ khép ván và ghi nhận chiến thắng cho bạn."
        : "Bạn đã rời bàn quá nửa quỹ thời gian còn lại. Ván đấu được máy chủ khép lại vì hết thời gian rời bàn."
      : didWin
        ? "Một chiến thắng thật ngọt ngào. Bloom đã giữ lại khoảnh khắc này cho Nhà Mình."
        : "Một ván đấu đáng nhớ. Nghỉ một chút rồi mình trở lại bàn cờ nhé.";
  const resultIcon = didDraw ? "sparkles" : didWin ? "trophy" : "heart";
  const resultBadge = didDraw ? "HÒA" : didWin ? "CHIẾN THẮNG" : "VÁN ĐẤU KHÉP LẠI";
  const resultPalette = didDraw
    ? {
        backdrop: "rgba(48,34,43,0.50)",
        hero: "#8B667A",
        icon: "#FFF7FB",
        cardBorder: "#E5CCD8",
        primary: "#8E5B74",
        secondaryBg: "#F8EFF4",
        secondaryText: "#765266",
      }
    : didWin
      ? {
          backdrop: "rgba(78,31,51,0.52)",
          hero: "#D56591",
          icon: "#FFF9FC",
          cardBorder: "#F3CFDD",
          primary: "#C94F7D",
          secondaryBg: "#FFF3F7",
          secondaryText: "#A9486D",
        }
      : {
          backdrop: "rgba(37,29,34,0.58)",
          hero: "#6D5361",
          icon: "#FFF7FA",
          cardBorder: "#DCCCD4",
          primary: "#795668",
          secondaryBg: "#F5EDF1",
          secondaryText: "#654B58",
        };

  const readyPhase = state.status === "active" && state.ply === 0 && entryPhase === "ready" && !rematchLoading;
  const gameFlowVisible = rematchLoading
    || state.status === "waiting"
    || (state.status === "paused" && state.ply === 0)
    || (state.status === "active" && state.ply === 0 && entryPhase !== "playing");
  const gameFlowTitle = readyPhase
    ? "Sẵn sàng • Trắng đi trước"
    : state.status === "paused"
      ? "Đang khôi phục ván…"
      : rematchLoading
        ? "Đang chuẩn bị ván mới…"
        : "Đang chuẩn bị bàn cờ…";
  const gameFlowSubtitle = readyPhase
    ? `Bạn cầm quân ${myColor === "w" ? "Trắng" : "Đen"}. Bloom sẽ mở bàn cờ ngay bây giờ.`
    : state.status === "paused"
      ? "Bloom đang nối lại trạng thái an toàn từ máy chủ. Thao tác được khóa trong lúc đồng bộ."
      : "Bloom đang xếp bàn cờ, đồng bộ đồng hồ và khóa thao tác để tránh chạm nhầm.";

  // Never make board mount depend on a modal animation callback. The board gets
  // its own deferred-after-navigation lifecycle with a bounded fallback.
  const boardSurfaceVisible = heavySurfaceMounted;

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BloomHeroHeader
          eyebrow="CỜ VUA NHÀ MÌNH"
          title={state.status === "finished" ? resultText : state.status === "paused" ? "Đang khôi phục ván…" : "Bàn cờ Nhà Mình"}
          subtitle={state.status === "paused"
            ? "Máy chủ vừa khởi động lại. Ván sẽ tiếp tục khi trạng thái được khôi phục."
            : "Đồng hồ trên máy chỉ là hiển thị; máy chủ mới là thời gian thật."}
          variant="game"
          onBack={() => safeRouterBack(router, "/chess-lobby" as never)}
          roundedBottom
          compact
        />

        <View style={styles.body}>
          <ChessPlayerRail
            state={state}
            color={myColor === "w" ? "b" : "w"}
            displayName={opponentDisplayName}
            avatarUrl={opponent?.avatarUrl}
            avatarFallback={opponentDisplayName.slice(0, 1)}
            isBot={isTestBotOpponent}
            activeSignal={myColor === "w" ? blackTurnActive : whiteTurnActive}
            captures={myColor === "w" ? captureSummary.byBlack : captureSummary.byWhite}
            advantage={myColor === "w" ? blackAdvantage : whiteAdvantage}
            runtimeActive={screenFocused && boardSurfaceVisible && entryPhase === "playing" && state.status === "active"}
          />

          <View style={styles.boardStage}>
            {boardSurfaceVisible ? (
              <>
                <ChessBoard
                  key={state.gameId}
                  state={state}
                  myColor={myColor}
                  moveDeltas={game.moveDeltas}
                  snapshotEpoch={game.snapshotEpoch}
                  onMove={runMove}
                  onResync={game.resync}
                  onPromotion={requestPromotion}
                  onVisualTurnChange={handleVisualTurnChange}
                  onVisualCommit={handleVisualCommit}
                  onBoardReady={handleBoardReady}
                  hintsEnabled={HINTS_ENABLED}
                  motionFxEnabled={MOTION_ENABLED}
                  interactionBlocked={game.connectionPhase !== "connected" || state.status === "paused" || !screenFocused || !boardReady || entryPhase !== "playing"}
                  runtimeActive={screenFocused && boardSurfaceVisible}
                />
                {FX_ENABLED && screenFocused ? <ChessBattleEffects event={battleEvent} mode="full" /> : null}
              </>
            ) : (
              <View pointerEvents="none" style={styles.boardWarmPlaceholder}>
                <Ionicons name="sparkles" size={24} color={COLORS.primary} />
                <Text style={styles.boardWarmText}>Bloom đang dành riêng nhịp đầu để mở thẻ chuẩn bị mượt mà…</Text>
              </View>
            )}
            {screenFocused && game.connectionPhase === "reconnecting" ? (
              <View pointerEvents="none" style={styles.reconnectPill}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.reconnectText}>Đang kết nối lại… bàn cờ được giữ nguyên</Text>
              </View>
            ) : null}

          </View>

          <ChessPlayerRail
            state={state}
            color={myColor}
            displayName={myMember?.shortName || myMember?.displayName || "Bạn"}
            avatarUrl={myMember?.avatarUrl}
            avatarFallback={(myMember?.shortName || myMember?.displayName || "B").slice(0, 1)}
            activeSignal={myColor === "w" ? whiteTurnActive : blackTurnActive}
            captures={myColor === "w" ? captureSummary.byWhite : captureSummary.byBlack}
            advantage={myColor === "w" ? whiteAdvantage : blackAdvantage}
            runtimeActive={screenFocused && boardSurfaceVisible && entryPhase === "playing" && state.status === "active"}
          />

          {state.status !== "finished" ? (
            <View style={styles.actions}>
              <Pressable
                style={styles.secondary}
                onPress={async () => {
                  const ok = await confirm({
                    title: "Đề nghị hòa?",
                    message: "Người thân sẽ được quyền đồng ý hoặc tiếp tục ván.",
                    confirmLabel: "Gửi đề nghị",
                    cancelLabel: "Chưa gửi",
                    icon: "hand-left-outline",
                  });
                  if (ok) {
                    const response = await game.offerDraw();
                    if (!response.ok) showToast({ type: "warning", message: CHESS_ERROR_COPY[response.errorCode] });
                  }
                }}
              >
                <Ionicons name="hand-left-outline" size={18} color={COLORS.primary} />
                <Text style={styles.secondaryText}>Xin hòa</Text>
              </Pressable>
              <Pressable
                style={styles.secondary}
                onPress={async () => {
                  const ok = await confirm({
                    title: "Đầu hàng ván này?",
                    message: "Kết quả sẽ được lưu vào lịch sử và không thể hoàn tác.",
                    confirmLabel: "Đầu hàng",
                    cancelLabel: "Chơi tiếp",
                    destructive: true,
                    icon: "flag-outline",
                  });
                  if (ok) {
                    const response = await game.resign();
                    if (!response.ok) showToast({ type: "warning", message: CHESS_ERROR_COPY[response.errorCode] });
                  }
                }}
              >
                <Ionicons name="flag-outline" size={18} color={COLORS.primary} />
                <Text style={styles.secondaryText}>Đầu hàng</Text>
              </Pressable>
            </View>
          ) : resultDismissed ? (
            <Pressable style={styles.reopenResult} onPress={() => setResultDismissed(false)}>
              <Ionicons name="sparkles-outline" size={17} color={COLORS.primary} />
              <Text style={styles.reopenResultText}>Xem lại kết quả</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>


      <BloomGameBottomModal
        visible={screenFocused && gameFlowVisible && !promotion}
        keepMounted
        staticFirstPresentation
        suspended={!screenFocused}
        eyebrow={readyPhase ? "BLOOM READY" : "BLOOM ĐANG CHUẨN BỊ"}
        title={gameFlowTitle}
        subtitle={gameFlowSubtitle}
        icon={readyPhase ? "play" : state.status === "paused" ? "cloud-done-outline" : "sparkles"}
        accent={readyPhase ? "pink" : "soft"}
      >
        <View style={styles.flowStatusRow}>
          <View style={[styles.flowStatusDot, readyPhase && styles.flowStatusDotReady]} />
          <View style={styles.flowStatusCopy}>
            <Text style={styles.flowStatusTitle}>{readyPhase ? "Đã kết nối • Bàn cờ sẵn sàng" : "Đang khóa thao tác trên bàn cờ"}</Text>
            <Text style={styles.flowStatusText}>{readyPhase ? "Thẻ này sẽ tự thu xuống để bạn bắt đầu nước đi." : "Không cần chạm gì thêm — Bloom sẽ tự mở khi mọi thứ ổn định."}</Text>
          </View>
          {!readyPhase ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="checkmark-circle" size={24} color="#4E9B72" />}
        </View>
      </BloomGameBottomModal>

      <BloomGameBottomModal
        visible={screenFocused && !!promotion}
        keepMounted
        suspended={!screenFocused}
        eyebrow="PHONG QUÂN"
        title="Chọn quân mới"
        subtitle="Một bước nữa để hoàn tất nước đi. Bàn cờ phía sau đã được khóa để tránh chọn nhầm."
        icon="sparkles"
      >
        <View style={styles.promotionRow}>
          {([['q', 'Hậu'], ['r', 'Xe'], ['b', 'Tượng'], ['n', 'Mã']] as const).map(([piece, label]) => (
            <Pressable
              key={piece}
              accessibilityRole="button"
              accessibilityLabel={`Phong thành ${label}`}
              style={({ pressed }) => [styles.promotionButton, pressed && styles.promotionButtonPressed]}
              onPress={() => {
                const next = promotion;
                setPromotion(null);
                next?.resolve?.(piece);
              }}
            >
              <Image source={PROMOTION_IMAGES[myColor][piece]} contentFit="contain" style={styles.promotionPiece} />
              <Text style={styles.promotionLabel}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </BloomGameBottomModal>

      <Modal
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        presentationStyle="overFullScreen"
        visible={screenFocused && state.status === "finished" && !resultDismissed && !rematchLoading}
        animationType="fade"
        onRequestClose={dismissResult}
      >
        <View style={[styles.resultScreen, { backgroundColor: resultPalette.backdrop }]}>
          <View style={styles.resultGlowOne} />
          <View style={styles.resultGlowTwo} />
          <View style={styles.resultPetalOne} />
          <View style={styles.resultPetalTwo} />
          <View style={[styles.resultCard, { borderColor: resultPalette.cardBorder }]}>
            <View style={[styles.resultHero, { backgroundColor: resultPalette.hero }]}>
              <View style={styles.resultHeroBubbleLarge} />
              <View style={styles.resultHeroBubbleSmall} />
              <ChessVictoryConfetti active={screenFocused && didWin && !resultDismissed && !rematchLoading} />
              <View style={styles.resultIconWrap}>
                <Ionicons name={resultIcon as any} size={30} color={resultPalette.icon} />
              </View>
              <View style={styles.resultBadge}>
                <Text style={styles.resultBadgeText}>{resultBadge}</Text>
              </View>
              <Text style={styles.resultEyebrow}>{resultEyebrow}</Text>
              <Text style={styles.resultTitle}>{resultText}</Text>
              <Text style={styles.resultReason}>{finishCopy(state.finishReason)}</Text>
            </View>
            <View style={styles.resultBody}>
              <Text style={styles.resultMessage}>{resultMessage}</Text>
              <View style={styles.resultDivider} />
              <Text style={styles.resultMeta}>Một khoảnh khắc nhỏ của Nhà Mình ♡</Text>
              <Pressable
                disabled={!canRematchNow || rematchLoading}
                style={[styles.resultPrimary, { backgroundColor: resultPalette.primary }, (!canRematchNow || rematchLoading) && styles.resultPrimaryDisabled]}
                onPress={() => {
                  dismissResult();
                  void handleRematch();
                }}
              >
                <Ionicons name="refresh" size={18} color="#FFFFFF" />
                <Text style={styles.resultPrimaryText}>{canRematchNow ? "Chơi ván mới" : "Hẹn từ 06:00"}</Text>
              </Pressable>
              <Pressable style={[styles.resultSecondary, { backgroundColor: resultPalette.secondaryBg }]} onPress={dismissResult}>
                <Text style={[styles.resultSecondaryText, { color: resultPalette.secondaryText }]}>Đồng ý</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 36 },
  body: { paddingHorizontal: 8, paddingTop: 14, gap: 12 },
  boardStage: {
    position: "relative",
    alignSelf: "center",
    padding: 6,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#F0CBD9",
    backgroundColor: "#FFF9FC",
    shadowColor: "#92566D",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  loadingCard: { minWidth: 260, maxWidth: 360, minHeight: 94, paddingHorizontal: 20, paddingVertical: 18, borderRadius: 24, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#FFF9FC", alignItems: "center", justifyContent: "center", gap: 10 },
  loading: { fontSize: 14, color: COLORS.secondaryText, fontWeight: "800", textAlign: "center" },
  retry: { color: COLORS.primary, fontWeight: "900" },
  actions: { flexDirection: "row", gap: 10 },
  secondary: { flex: 1, minHeight: 46, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: COLORS.primary, fontWeight: "900", fontSize: 12 },
  reopenResult: { minHeight: 44, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#FFF9FC", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  reopenResultText: { color: COLORS.primary, fontSize: 12, fontWeight: "900" },
  boardWarmPlaceholder: { width: 330, maxWidth: "92%", aspectRatio: 1, alignSelf: "center", borderRadius: 26, borderWidth: 1, borderColor: "#F0D4DF", backgroundColor: "#FFF9FC", alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 10 },
  boardWarmText: { color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17, fontWeight: "800", textAlign: "center" },
  reconnectPill: { position: "absolute", top: 14, alignSelf: "center", zIndex: 90, minHeight: 36, paddingHorizontal: 13, borderRadius: 18, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,249,252,0.96)", borderWidth: 1, borderColor: "#EFCBDA", elevation: 8 },
  reconnectText: { color: COLORS.primaryText, fontSize: 10.5, fontWeight: "900" },

  flowStatusRow: {
    minHeight: 68,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EFD5DF",
    backgroundColor: "#FFF7FA",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  flowStatusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#E3A65C" },
  flowStatusDotReady: { backgroundColor: "#4E9B72" },
  flowStatusCopy: { flex: 1 },
  flowStatusTitle: { color: COLORS.primaryText, fontSize: 12.5, lineHeight: 17, fontWeight: "900" },
  flowStatusText: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15, fontWeight: "700" },
  promotionRow: { width: "100%", flexDirection: "row", gap: 7 },
  promotionButton: {
    flex: 1,
    minHeight: 88,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EECEDA",
    backgroundColor: "#FFF6F9",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  promotionButtonPressed: { transform: [{ scale: 0.96 }], backgroundColor: "#FFE9F1" },
  promotionPiece: { width: 48, height: 48 },
  promotionLabel: { marginTop: 3, fontSize: 10.5, fontWeight: "900", color: COLORS.primaryText },

  resultScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 42,
    backgroundColor: "rgba(46,18,31,0.48)",
  },
  resultGlowOne: { position: "absolute", width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(255,199,221,0.22)", top: "17%", left: -70 },
  resultGlowTwo: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,235,191,0.16)", bottom: "14%", right: -60 },
  resultPetalOne: { position: "absolute", width: 22, height: 12, borderRadius: 12, backgroundColor: "rgba(244,141,180,0.72)", top: "24%", right: "16%", transform: [{ rotate: "28deg" }] },
  resultPetalTwo: { position: "absolute", width: 16, height: 9, borderRadius: 10, backgroundColor: "rgba(255,207,224,0.88)", bottom: "25%", left: "13%", transform: [{ rotate: "-24deg" }] },
  resultCard: {
    width: "100%",
    maxWidth: 390,
    borderRadius: 34,
    overflow: "hidden",
    backgroundColor: "#FFFDFE",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.74)",
    shadowColor: "#321321",
    shadowOpacity: 0.26,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 18,
  },
  resultHero: { minHeight: 230, paddingHorizontal: 26, paddingTop: 30, paddingBottom: 24, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "#C74375" },
  resultHeroBubbleLarge: { position: "absolute", width: 210, height: 210, borderRadius: 105, backgroundColor: "rgba(255,255,255,0.09)", top: -82, right: -54 },
  resultHeroBubbleSmall: { position: "absolute", width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,219,232,0.16)", bottom: -42, left: -20 },
  resultIconWrap: { width: 64, height: 64, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.17)", borderWidth: 1, borderColor: "rgba(255,255,255,0.28)", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  resultBadge: { minHeight: 25, borderRadius: 13, paddingHorizontal: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: "rgba(255,255,255,0.24)", marginBottom: 9 },
  resultBadgeText: { fontSize: 9.5, lineHeight: 12, fontWeight: "900", letterSpacing: 1.2, color: "#FFFFFF" },
  resultEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.5, color: "rgba(255,255,255,0.82)" },
  resultTitle: { marginTop: 6, fontSize: 34, lineHeight: 39, fontWeight: "900", color: "#FFFFFF", textAlign: "center" },
  resultReason: { marginTop: 8, fontSize: 13, lineHeight: 18, fontWeight: "800", color: "rgba(255,255,255,0.88)", textAlign: "center" },
  resultBody: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 24, alignItems: "stretch" },
  resultMessage: { fontSize: 13.5, lineHeight: 20, fontWeight: "700", color: COLORS.primaryText, textAlign: "center" },
  resultDivider: { height: 1, backgroundColor: "#F1DCE4", marginVertical: 16 },
  resultMeta: { fontSize: 10.5, lineHeight: 16, fontWeight: "800", color: COLORS.secondaryText, textAlign: "center", marginBottom: 16 },
  resultPrimary: { minHeight: 50, borderRadius: 19, backgroundColor: "#B93467", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  resultPrimaryDisabled: { opacity: 0.52 },
  resultPrimaryText: { fontSize: 13, fontWeight: "900", color: "#FFFFFF" },
  resultSecondary: { marginTop: 9, minHeight: 44, borderRadius: 18, backgroundColor: "#FFF0F5", alignItems: "center", justifyContent: "center" },
  resultSecondaryText: { fontSize: 12.5, fontWeight: "900", color: "#A93662" },
});
