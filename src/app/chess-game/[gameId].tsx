import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";

import { ChessBattleEffects, deriveChessBattleEvent, type ChessBattleEvent } from "../../components/chess/ChessBattleEffects";
import { ChessBoard } from "../../components/chess/ChessBoard";
import { capturePoints } from "../../components/chess/ChessMaterialStrip";
import { ChessPlayerRail } from "../../components/chess/ChessPlayerRail";
import { ChessPromotionOverlay } from "../../components/chess/ChessPromotionOverlay";
import { ChessResultToast, type ChessResultOutcome } from "../../components/chess/ChessResultToast";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { BloomHeroHeader } from "../../components/ui/BloomHeroHeader";
import { useBloomDialog } from "../../components/ui/BloomDialogProvider";
import { useBloomToast } from "../../components/ui/BloomToast";
import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useFamilyMembersRealtime } from "../../context/FamilyRealtimeContext";
import { useChessGame } from "../../hooks/chess/useChessGame";
import { getHomeGamePlayWindow } from "../../services/gameRoomPolicy";
import { CHESS_ERROR_COPY, emptyChessCaptureSummary, type ChessColor, type ChessGameState, type ChessGameStatus } from "../../types/chess";
import { safeRouterBack } from "../../utils/safeRouterBack";

const finishCopy = (reason: string | null) => ({
  checkmate: "Chiếu hết",
  resignation: "Đầu hàng",
  timeout: "Hết giờ",
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
  const { confirm } = useBloomDialog();
  const { showToast } = useBloomToast();
  const game = useChessGame(activeFamilyId, gameId || null);

  const [promotion, setPromotion] = useState<{
    from: string;
    to: string;
    resolve?: (piece: "q" | "r" | "b" | "n" | null) => void;
  } | null>(null);
  const [clockNow, setClockNow] = useState(Date.now());
  const [battleEvent, setBattleEvent] = useState<ChessBattleEvent | null>(null);
  const [rematchLoading, setRematchLoading] = useState(false);
  const [resultDismissed, setResultDismissed] = useState(false);
  const [resultReady, setResultReady] = useState(false);
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

  const handleVisualTurnChange = React.useCallback((turn: ChessColor, status: ChessGameStatus) => {
    const active = status === "active";
    whiteTurnActive.value = active && turn === "w" ? 1 : 0;
    blackTurnActive.value = active && turn === "b" ? 1 : 0;
  }, [blackTurnActive, whiteTurnActive]);

  useEffect(() => {
    const timer = setInterval(() => setClockNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Expo Router may reuse this screen instance when replacing only gameId.
    // Never let the previous rematch overlay leak into the new game.
    setRematchLoading(false);
    setResultDismissed(false);
    setResultReady(false);
    setPromotion(null);
    setBattleEvent(null);
  }, [gameId]);

  useEffect(() => {
    if (state?.status !== "finished") {
      setResultReady(false);
      return;
    }
    // Let the final 80–110 ms board motion visually land before the centered
    // result toast enters. Non-move endings (timeout/resign/draw) use the same
    // short beat so the finish never feels abrupt.
    const timer = setTimeout(() => setResultReady(true), 180);
    return () => clearTimeout(timer);
  }, [state?.gameId, state?.revision, state?.status]);

  const handleVisualCommit = React.useCallback((previous: ChessGameState, current: ChessGameState) => {
    if (!myColor) return;
    // V4J: derive FX from the exact position that has just become visible,
    // not from network state that may be one animation ahead of the board.
    setBattleEvent(deriveChessBattleEvent(previous, current, myColor));
  }, [myColor]);

  useEffect(() => {
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
  }, [confirm, game.acceptDraw, game.rejectDraw, state?.drawOfferByUid, state?.status, me, showToast]);

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
      }
      setRematchLoading(false);
    } catch {
      setRematchLoading(false);
      showToast({ type: "warning", message: "Bloom chưa chuẩn bị được ván mới. Thử lại giúp mình nhé." });
    }
  }, [game.rematch, isTestBotOpponent, rematchLoading, router, showToast]);

  if (game.loading || !state || !myColor) {
    return (
      <ScreenContainer backgroundColor={COLORS.background}>
        <View style={styles.center}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loading}>{game.error ? "Không thể khôi phục ván cờ." : "Đang đồng bộ bàn cờ…"}</Text>
          {game.error ? (
            <Pressable onPress={() => void game.resync()}><Text style={styles.retry}>Thử lại</Text></Pressable>
          ) : null}
        </View>
      </ScreenContainer>
    );
  }

  const didWin = (state.result === "white" && myColor === "w") || (state.result === "black" && myColor === "b");
  const resultOutcome: ChessResultOutcome = state.result === "draw" ? "draw" : didWin ? "win" : "loss";
  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BloomHeroHeader
          eyebrow="CỜ VUA NHÀ MÌNH"
          title={state.status === "finished" ? "Ván cờ đã khép lại" : state.status === "paused" ? "Đang khôi phục ván…" : "Đến lượt ai, Bloom giữ giúp"}
          subtitle={state.status === "finished"
            ? "Kết quả đã được lưu. Bạn có thể xem lại bàn cờ hoặc chơi một ván mới."
            : state.status === "paused"
              ? "Máy chủ vừa khởi động lại. Ván sẽ tiếp tục khi cả hai người quay lại."
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
          />

          <View style={styles.boardStage}>
            <ChessBoard
              state={state}
              myColor={myColor}
              moveDeltas={game.moveDeltas}
              snapshotEpoch={game.snapshotEpoch}
              onMove={runMove}
              onResync={game.resync}
              onPromotion={requestPromotion}
              onVisualTurnChange={handleVisualTurnChange}
              onVisualCommit={handleVisualCommit}
              hintsEnabled
              motionFxEnabled
            />
            {state.status !== "finished" ? <ChessBattleEffects event={battleEvent} mode="full" /> : null}
            <ChessResultToast
              visible={state.status === "finished" && resultReady && !resultDismissed}
              outcome={resultOutcome}
              reason={finishCopy(state.finishReason)}
              primaryLabel={canRematchNow ? "Chơi ván mới" : "Hẹn từ 06:00"}
              primaryDisabled={!canRematchNow}
              primaryLoading={rematchLoading}
              onPrimary={() => void handleRematch()}
              onDismiss={() => setResultDismissed(true)}
            />
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
          ) : null}

        </View>
      </ScrollView>


      <ChessPromotionOverlay
        visible={!!promotion}
        color={myColor}
        onSelect={(piece) => {
          const next = promotion;
          setPromotion(null);
          next?.resolve?.(piece);
        }}
      />

      {rematchLoading ? (
        <View style={styles.rematchOverlay} pointerEvents="auto">
          <View style={styles.rematchCard}>
            <View style={styles.rematchIcon}>
              <Ionicons name="sparkles" size={24} color={COLORS.primary} />
            </View>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.rematchTitle}>Đang chuẩn bị ván mới…</Text>
            <Text style={styles.rematchText}>Bloom đang xếp lại bàn cờ và kết nối đối thủ.</Text>
          </View>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 36 },
  body: { paddingHorizontal: 12, paddingTop: 14, gap: 12 },
  boardStage: {
    position: "relative",
    alignSelf: "center",
    padding: 6,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F0CBD9",
    backgroundColor: "#FFF9FC",
    shadowColor: "#92566D",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    overflow: "visible",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  loading: { fontSize: 14, color: COLORS.secondaryText, fontWeight: "800" },
  retry: { color: COLORS.primary, fontWeight: "900" },
  actions: { flexDirection: "row", gap: 10 },
  secondary: { flex: 1, minHeight: 46, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: COLORS.primary, fontWeight: "900", fontSize: 12 },
  rematchOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    elevation: 20,
    backgroundColor: "rgba(255,243,247,0.84)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  rematchCard: {
    width: "100%",
    maxWidth: 330,
    paddingHorizontal: 24,
    paddingVertical: 26,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#EEC9D7",
    backgroundColor: "#FFFDFE",
    alignItems: "center",
    gap: 10,
    shadowColor: "#8B5267",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  rematchIcon: { width: 48, height: 48, borderRadius: 18, backgroundColor: "#FFEAF1", alignItems: "center", justifyContent: "center", marginBottom: 2 },
  rematchTitle: { fontSize: 17, fontWeight: "900", color: COLORS.primaryText, textAlign: "center" },
  rematchText: { fontSize: 12, lineHeight: 18, fontWeight: "700", color: COLORS.secondaryText, textAlign: "center" },
});
