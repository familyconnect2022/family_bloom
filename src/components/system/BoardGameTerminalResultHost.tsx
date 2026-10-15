import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useChessRealtime, useChessRealtimeActions } from "../../context/ChessRealtimeContext";
import {
  clearBoardGameTerminalResult,
  useBoardGameTerminalResult,
} from "../../services/games/boardGameTerminalResultStore";
import { getHomeGamePlayWindow } from "../../services/games/gameRoomPolicy";
import { activateChessSurface } from "../../services/chess/chessSurfaceStore";
import { activateXiangqiSurface, cacheXiangqiBootstrapState } from "../../services/xiangqi/xiangqiSurfaceStore";
import { xiangqiSocketService } from "../../services/xiangqi/xiangqiSocketService";
import type { ChessGameState } from "../../types/chess";
import { XIANGQI_EVENTS, type XiangqiRealtimeState } from "../../types/xiangqiRealtime";
import { ChessVictoryConfetti } from "../chess/ChessVictoryConfetti";
import { useBoardGameSoundscape } from "../games/useBoardGameSoundscape";
import { useBloomToast } from "../ui/BloomToast";

const requestId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function chessReason(state: ChessGameState) {
  if (state.finishReason === "away_timeout") return "Rời bàn quá lâu";
  if (state.finishReason === "timeout") return "Hết giờ";
  if (state.finishReason === "checkmate") return "Chiếu bí";
  if (state.finishReason === "resignation") return "Đã đầu hàng";
  if (state.result === "draw") return "Ván cờ hòa";
  return "Ván đã khép lại";
}

function xiangqiReason(state: XiangqiRealtimeState) {
  if (state.finishReason === "away_timeout") return "Rời bàn quá lâu";
  if (state.finishReason === "timeout") return "Hết giờ";
  if (state.finishReason === "checkmate") return "Chiếu bí";
  if (state.finishReason === "stalemate") return "Không còn nước hợp lệ";
  if (state.finishReason === "resignation") return "Đã đầu hàng";
  return "Ván đã khép lại";
}

/**
 * Terminal presentation is independent from both game-owned board surfaces.
 * A result can stay visible while the realtime lease, rail identity and board
 * surface have already been destroyed/reset. Result UI therefore cannot keep a
 * dead game alive or block the other board game.
 */
export const BoardGameTerminalResultHost = memo(function BoardGameTerminalResultHost() {
  const result = useBoardGameTerminalResult();
  const { user, activeFamilyId } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useBloomToast();
  const chessRealtime = useChessRealtime();
  const chessActions = useChessRealtimeActions();
  const { playGameEnd } = useBoardGameSoundscape();
  const [rematching, setRematching] = useState(false);
  const [rematchWaitingUntil, setRematchWaitingUntil] = useState<number | null>(null);
  const rematchRequestIdRef = useRef<string | null>(null);
  const playedResultSoundRef = useRef<string | null>(null);
  const closingRef = useRef(false);

  useEffect(() => {
    const key = result ? `${result.kind}:${result.gameId}` : null;
    if (!key || playedResultSoundRef.current === key) return;
    playedResultSoundRef.current = key;
    playGameEnd();
  }, [playGameEnd, result]);

  useEffect(() => {
    setRematching(false);
    setRematchWaitingUntil(null);
    rematchRequestIdRef.current = null;
    closingRef.current = false;
  }, [result?.gameId, result?.kind]);

  useEffect(() => {
    if (!result || result.kind !== "chess" || !rematchWaitingUntil) return;
    const nextGameId = chessRealtime.activeGameId;
    if (!nextGameId || nextGameId === result.gameId) return;
    // The other player accepted the rematch asynchronously. The realtime
    // provider already owns the new id; retire only the old result card.
    setRematchWaitingUntil(null);
    rematchRequestIdRef.current = null;
    clearBoardGameTerminalResult({ kind: "chess", gameId: result.gameId });
  }, [chessRealtime.activeGameId, rematchWaitingUntil, result]);

  useEffect(() => {
    if (!rematchWaitingUntil) return undefined;
    const delay = Math.max(0, rematchWaitingUntil - Date.now());
    const timer = setTimeout(() => {
      setRematchWaitingUntil(null);
      rematchRequestIdRef.current = null;
    }, delay + 80);
    return () => clearTimeout(timer);
  }, [rematchWaitingUntil]);

  const presentation = useMemo(() => {
    if (!result) return null;
    if (result.kind === "chess") {
      const state = result.state;
      const myColor = state.whiteUid === user?.uid ? "white" : state.blackUid === user?.uid ? "black" : null;
      const didWin = (state.result === "white" && myColor === "white") || (state.result === "black" && myColor === "black");
      const draw = state.result === "draw";
      return {
        didWin,
        draw,
        title: state.status === "cancelled" ? "Ván đã khép lại" : draw ? "Ván cờ hòa" : didWin ? "Bạn thắng!" : "Bạn thua",
        reason: chessReason(state),
        message: state.finishReason === "away_timeout"
          ? didWin
            ? "Đối thủ đã rời bàn quá thời gian cho phép. Ván cũ đã được đóng hoàn toàn."
            : "Bạn đã rời bàn quá thời gian cho phép. Ván cũ đã được đóng hoàn toàn."
          : "Kết quả đã được lưu. Phiên cũ đã kết thúc và bàn cờ đã sẵn sàng cho một ván mới.",
      };
    }
    const state = result.state;
    const mySide = state.redUid === user?.uid ? "red" : state.blackUid === user?.uid ? "black" : null;
    const draw = state.result === "draw";
    const didWin = (state.result === "red" && mySide === "red") || (state.result === "black" && mySide === "black");
    return {
      didWin,
      draw,
      title: draw ? "Ván cờ hòa" : didWin ? "Bạn thắng!" : "Bạn thua",
      reason: xiangqiReason(state),
      message: "Kết quả đã được lưu. Phiên Cờ tướng cũ đã đóng hoàn toàn và không còn giữ khóa trò chơi.",
    };
  }, [result, user?.uid]);

  const closeResult = useCallback(() => {
    if (!result || closingRef.current) return;
    closingRef.current = true;
    const closing = result;
    void (async () => {
      if (closing.kind === "chess" && rematchWaitingUntil) {
        await chessActions.cancelRematch(closing.gameId).catch(() => undefined);
      }
      setRematchWaitingUntil(null);
      rematchRequestIdRef.current = null;
      clearBoardGameTerminalResult({ kind: closing.kind, gameId: closing.gameId });
      const onChessCommandRoute = pathname.includes("chess-game") || pathname.includes("chess-lobby");
      const onXiangqiCommandRoute = pathname.includes("xiangqi-preview");
      if ((closing.kind === "chess" && onChessCommandRoute) || (closing.kind === "xiangqi" && onXiangqiCommandRoute)) {
        requestAnimationFrame(() => router.back());
      }
      closingRef.current = false;
    })();
  }, [chessActions, pathname, rematchWaitingUntil, result, router]);

  const cancelRematch = useCallback(async () => {
    if (!result || result.kind !== "chess" || !rematchWaitingUntil) return;
    const response = await chessActions.cancelRematch(result.gameId);
    setRematchWaitingUntil(null);
    rematchRequestIdRef.current = null;
    showToast({
      type: response.ok ? "info" : "warning",
      message: response.ok ? "Đã hủy lời chơi lại." : "Bloom chưa hủy được lời chơi lại. Lời mời sẽ tự hết hạn.",
    });
  }, [chessActions, rematchWaitingUntil, result, showToast]);


  const rematch = useCallback(async () => {
    if (!result || rematching) return;
    const familyId = result.familyId || activeFamilyId;
    if (!familyId) {
      showToast({ type: "warning", message: "Bloom chưa xác định được Nhà đang hoạt động." });
      return;
    }

    const playWindow = getHomeGamePlayWindow();
    const isBot = result.kind === "chess" ? !!result.state.testBotUid : !!result.state.testBotUid;
    if (!isBot && !playWindow.canCreate) {
      showToast({ type: "info", title: "Nhà mình nghỉ ngơi nhé 🌙", message: "Mình hẹn nhau chơi tiếp từ 6:00 sáng." });
      return;
    }

    setRematching(true);
    try {
      if (result.kind === "chess") {
        if (result.state.status !== "finished") {
          showToast({ type: "info", message: "Ván này đã khép lại. Bạn có thể trở về sảnh để bắt đầu ván mới." });
          return;
        }
        const stableRequestId = rematchRequestIdRef.current ?? requestId("terminal-rematch");
        rematchRequestIdRef.current = stableRequestId;
        const ack = await chessActions.rematchGame(result.gameId, stableRequestId);
        if (!ack.ok) {
          if (ack.errorCode !== "CHESS_SERVER_RECOVERING") rematchRequestIdRef.current = null;
          showToast({ type: "warning", message: ack.message ?? "Bloom chưa chuẩn bị được ván mới." });
          return;
        }
        if (ack.data.waiting && !ack.data.gameId) {
          setRematchWaitingUntil(ack.data.expiresAt ?? Date.now() + 45_000);
          showToast({ type: "info", title: "Đã gửi lời chơi lại", message: "Bloom đang chờ người thân xác nhận." });
          return;
        }
        if (!ack.data.state || !ack.data.gameId) {
          rematchRequestIdRef.current = null;
          showToast({ type: "warning", message: "Bloom chưa nhận được trạng thái ván mới." });
          return;
        }
        rematchRequestIdRef.current = null;
        // Chess owns its presentation directly; no shared cross-game
        // coordinator is allowed to claim or lock the Xiangqi runtime.
        activateChessSurface(ack.data.gameId, "full");
        clearBoardGameTerminalResult({ kind: "chess", gameId: result.gameId });
        requestAnimationFrame(() => router.replace({ pathname: "/(chess)/chess-game/[gameId]", params: { gameId: ack.data.gameId! } } as never));
        return;
      }

      const ack = await xiangqiSocketService.emitAck<{ waiting: boolean; gameId: string; state: XiangqiRealtimeState }>(
        XIANGQI_EVENTS.gameRematch,
        { gameId: result.gameId, requestId: requestId("xq-terminal-rematch") },
      );
      if (!ack.ok) {
        showToast({ type: "warning", message: ack.message ?? "Bloom chưa chuẩn bị được ván Cờ tướng mới." });
        return;
      }
      cacheXiangqiBootstrapState(ack.data.state);
      // Xiangqi owns its own board lifecycle and never claims a shared board
      // session/presentation identity.
      activateXiangqiSurface(ack.data.gameId, "full", "rematch");
      clearBoardGameTerminalResult({ kind: "xiangqi", gameId: result.gameId });
      requestAnimationFrame(() => router.replace("/xiangqi-preview" as never));
    } finally {
      setRematching(false);
    }
  }, [activeFamilyId, chessActions, rematching, result, router, showToast]);

  if (!result || !presentation) return null;
  const canRematch = result.kind !== "chess" || result.state.status === "finished";

  const palette = presentation.didWin
    ? { backdrop: "rgba(78,31,51,0.50)", hero: "#D56591", border: "#F2CDDC", primary: "#C94F7D", secondaryBg: "#FFF3F7", secondaryText: "#A9486D" }
    : { backdrop: "rgba(38,30,35,0.58)", hero: "#6E5361", border: "#DCCCD4", primary: "#795668", secondaryBg: "#F5EDF1", secondaryText: "#654B58" };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={closeResult}
    >
      <View style={[styles.backdrop, { backgroundColor: palette.backdrop }]}>
        <View style={[styles.card, { borderColor: palette.border }]}>
          <View style={[styles.hero, { backgroundColor: palette.hero }]}>
            <ChessVictoryConfetti active={presentation.didWin} />
            <View style={styles.iconWrap}>
              <Ionicons name={presentation.didWin ? "trophy" : presentation.draw ? "sparkles" : "heart"} size={34} color="#FFFFFF" />
            </View>
            <Text style={styles.badge}>{presentation.didWin ? "CHIẾN THẮNG" : presentation.draw ? "HÒA" : "VÁN ĐẤU KHÉP LẠI"}</Text>
            <Text style={styles.title}>{presentation.title}</Text>
            <Text style={styles.reason}>{presentation.reason}</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.message}>{presentation.message}</Text>
            {canRematch ? (
              <Pressable disabled={rematching || !!rematchWaitingUntil} onPress={() => void rematch()} style={[styles.primary, { backgroundColor: palette.primary }, (rematching || !!rematchWaitingUntil) && styles.disabled]}>
                {rematching ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name={rematchWaitingUntil ? "checkmark-circle-outline" : "refresh-outline"} size={20} color="#FFFFFF" />}
                <Text style={styles.primaryText}>{rematching ? "Đang chuẩn bị…" : rematchWaitingUntil ? "Đã gửi lời chơi lại" : "Chơi lại"}</Text>
              </Pressable>
            ) : null}
            {result.kind === "chess" && rematchWaitingUntil ? (
              <Pressable onPress={() => void cancelRematch()} style={styles.cancelRematch}>
                <Text style={styles.cancelRematchText}>Hủy lời chơi lại</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={closeResult} style={[styles.secondary, { backgroundColor: palette.secondaryBg }]}>
              <Text style={[styles.secondaryText, { color: palette.secondaryText }]}>Về Nhà Mình</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 42 },
  card: { width: "100%", maxWidth: 400, borderRadius: 34, overflow: "hidden", backgroundColor: "#FFFDFE", borderWidth: 1, shadowColor: "#321D25", shadowOpacity: 0.24, shadowRadius: 26, shadowOffset: { width: 0, height: 13 }, elevation: 18 },
  hero: { minHeight: 228, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 22, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  iconWrap: { width: 68, height: 68, borderRadius: 25, backgroundColor: "rgba(255,255,255,0.17)", borderWidth: 1, borderColor: "rgba(255,255,255,0.28)", alignItems: "center", justifyContent: "center" },
  badge: { marginTop: 13, color: "#FFFFFF", fontSize: 9.5, lineHeight: 12, fontWeight: "900", letterSpacing: 1.1 },
  title: { marginTop: 7, color: "#FFFFFF", fontSize: 34, lineHeight: 39, fontWeight: "900", textAlign: "center" },
  reason: { marginTop: 6, color: "rgba(255,255,255,0.88)", fontSize: 13, fontWeight: "800", textAlign: "center" },
  body: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 22 },
  message: { color: COLORS.primaryText, fontSize: 13.2, lineHeight: 20, fontWeight: "700", textAlign: "center" },
  primary: { marginTop: 20, width: "100%", height: 54, borderRadius: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  cancelRematch: { marginTop: 8, minHeight: 42, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E9C9D6", backgroundColor: "#FFF9FC" },
  cancelRematchText: { color: "#9B5673", fontSize: 12, fontWeight: "900" },
  secondary: { marginTop: 9, minHeight: 46, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  secondaryText: { fontSize: 12.5, fontWeight: "900" },
  disabled: { opacity: 0.58 },
});
