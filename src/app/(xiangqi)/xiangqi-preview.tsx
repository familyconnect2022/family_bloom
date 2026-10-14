import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useChessRealtime } from "../../context/ChessRealtimeContext";
import { getActiveBoardGameSession, useActiveBoardGameSession } from "../../services/games/activeBoardGameSessionStore";
import { useBoardGameTerminalResult } from "../../services/games/boardGameTerminalResultStore";
import { usePendingBoardGameReservation } from "../../services/games/pendingBoardGameReservationStore";
import { cancelPendingBoardGameReservation } from "../../services/games/pendingBoardGameReservationActions";
import {
  acquireRouteBoardGamePresentation,
  claimAndPresentBoardGame,
  releaseRouteBoardGamePresentation,
} from "../../services/presentation/boardGamePresentationCoordinator";
import { resolveOrCreateXiangqiSession } from "../../services/xiangqi/xiangqiSessionBootstrap";
import { cacheXiangqiBootstrapState } from "../../services/xiangqi/xiangqiSurfaceStore";

/**
 * P2.17 command-only route.
 *
 * Merely mounting this route never wakes Xiangqi. First we prove/create one
 * concrete server session. Only then can ActiveBoardGameSession + the root rail
 * move the parked Xiangqi surface onto the physical screen.
 */
export default function XiangqiRouteController() {
  const router = useRouter();
  const { activeFamilyId } = useAuth();
  const chess = useChessRealtime();
  const activeBoardSession = useActiveBoardGameSession();
  const terminalResult = useBoardGameTerminalResult();
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const pendingBoardGame = usePendingBoardGameReservation();
  const [cancellingPending, setCancellingPending] = useState(false);
  const bootRef = useRef(false);
  const mountedRef = useRef(true);
  // The route may blur after a newer Xiangqi session/rematch has already become
  // authoritative. Keep the exact game this route presented so stale cleanup
  // can never park the newer session.
  const ownedGameIdRef = useRef<string | null>(null);
  const routeOwnerTokenRef = useRef(`xiangqi-route:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    if (terminalResult?.kind !== "xiangqi") return;
    const ownedGameId = ownedGameIdRef.current;
    if (ownedGameId && ownedGameId !== terminalResult.gameId) return;
    // P2.21 terminal-first invariant: a finished Xiangqi result is presentation
    // only. Move the command route back to Hub immediately so its fallback
    // resolver can never create/recover another session behind the Result Host.
    ownedGameIdRef.current = null;
    router.replace("/home-games" as never);
  }, [router, terminalResult]);

  const returnToChess = useCallback((gameId: string) => {
    if (!gameId) return;
    claimAndPresentBoardGame({
      kind: "chess",
      gameId,
      familyId: activeFamilyId,
      source: "server",
      presentation: "full",
      reason: "active_game",
    });
    router.replace({ pathname: "/(chess)/chess-game/[gameId]", params: { gameId } } as never);
  }, [activeFamilyId, router]);

  const openResolvedSession = useCallback((gameId: string) => {
    if (!gameId) return false;
    const presented = claimAndPresentBoardGame({
      kind: "xiangqi",
      gameId,
      familyId: activeFamilyId,
      source: "server",
      presentation: "full",
      reason: "active_game",
    });
    if (presented) {
      ownedGameIdRef.current = gameId;
    } else {
      const current = getActiveBoardGameSession();
      if (current?.kind === "chess") returnToChess(current.gameId);
    }
    return presented;
  }, [activeFamilyId, returnToChess]);

  const resolveSession = useCallback(async () => {
    if (!activeFamilyId || bootRef.current) return;
    if (terminalResult?.kind === "xiangqi") return;

    const existing = getActiveBoardGameSession();
    if (pendingBoardGame?.gameKind === "chess") {
      setError("Bạn đang chờ một ván Cờ vua. Hãy hủy lời chờ đó trước khi bắt đầu Cờ tướng.");
      return;
    }
    if (pendingBoardGame?.gameKind === "xiangqi" && pendingBoardGame.source === "server") {
      setError("Một phiên Cờ tướng đang chờ xác nhận. Bạn có thể tiếp tục chờ hoặc hủy phiên này.");
      return;
    }
    if (existing?.kind === "chess") {
      returnToChess(existing.gameId);
      return;
    }
    if (chess.activeGameId) {
      returnToChess(chess.activeGameId);
      return;
    }
    if (existing?.kind === "xiangqi") {
      ownedGameIdRef.current = existing.gameId;
      acquireRouteBoardGamePresentation("xiangqi", existing.gameId, routeOwnerTokenRef.current);
      return;
    }

    bootRef.current = true;
    setError(null);
    try {
      const result = await resolveOrCreateXiangqiSession(activeFamilyId);
      if (!mountedRef.current) return;
      if (result.kind === "busy_chess") {
        returnToChess(result.gameId);
        return;
      }
      if (result.kind === "pending") {
        setError(result.gameKind === "chess"
          ? "Bạn đang chờ một ván Cờ vua. Hãy hủy lời chờ đó trước khi bắt đầu Cờ tướng."
          : "Một phiên Cờ tướng đang chờ xác nhận. Bạn có thể tiếp tục chờ hoặc hủy phiên này.");
        return;
      }
      if (result.kind === "error") {
        setError(result.message);
        return;
      }

      cacheXiangqiBootstrapState(result.state);
      openResolvedSession(result.state.gameId);
    } finally {
      bootRef.current = false;
    }
  }, [activeFamilyId, chess.activeGameId, openResolvedSession, pendingBoardGame?.gameKind, pendingBoardGame?.inviteId, returnToChess, terminalResult?.gameId, terminalResult?.kind]);

  useEffect(() => { void resolveSession(); }, [resolveSession, retryNonce]);

  useFocusEffect(useCallback(() => {
    const session = getActiveBoardGameSession();
    const ownerToken = routeOwnerTokenRef.current;
    if (session?.kind === "xiangqi") {
      ownedGameIdRef.current = session.gameId;
      acquireRouteBoardGamePresentation("xiangqi", session.gameId, ownerToken);
    } else if (terminalResult?.kind !== "xiangqi") {
      void resolveSession();
    }

    return () => {
      const ownedGameId = ownedGameIdRef.current;
      if (!ownedGameId) return;
      // Token + exact id prevent an older command route from parking a newer
      // route instance, including the same-gameId duplicate-route case.
      releaseRouteBoardGamePresentation("xiangqi", ownedGameId, ownerToken, "hidden");
    };
  }, [activeBoardSession?.gameId, activeBoardSession?.kind, resolveSession, terminalResult?.gameId, terminalResult?.kind]));

  return (
    <View style={styles.route} testID="xiangqi-presentation-command-route">
      <ActivityIndicator size="small" color={COLORS.primary} />
      <Text style={styles.title}>Đang mở ván Cờ tướng…</Text>
      <Text style={styles.text}>Bloom đang kết nối đúng ván đang hoạt động.</Text>
      {!error && pendingBoardGame?.gameKind === "xiangqi" && pendingBoardGame.source === "local" ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{pendingBoardGame.phase === "connecting" ? "Bloom đang kết nối Cờ tướng…" : "Bloom đang gửi yêu cầu bắt đầu ván Cờ tướng…"}</Text>
          <Pressable
            disabled={cancellingPending}
            onPress={async () => {
              if (cancellingPending) return;
              setCancellingPending(true);
              const cancelled = await cancelPendingBoardGameReservation("xiangqi");
              setCancellingPending(false);
              if (cancelled.ok) setError("Phiên Cờ tướng đã được hủy.");
              else setError(cancelled.message ?? "Bloom chưa hủy được phiên Cờ tướng.");
            }}
            style={[styles.retryButton, cancellingPending && styles.retryButtonDisabled]}
          >
            <Text style={styles.retryText}>{cancellingPending ? "Đang hủy…" : "Hủy"}</Text>
          </Pressable>
        </View>
      ) : null}
      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          {pendingBoardGame ? (
            <Pressable
              disabled={cancellingPending}
              onPress={async () => {
                if (cancellingPending) return;
                setCancellingPending(true);
                const cancelled = await cancelPendingBoardGameReservation(pendingBoardGame.gameKind);
                setCancellingPending(false);
                if (cancelled.ok) {
                  setError(null);
                  setRetryNonce((value) => value + 1);
                } else {
                  setError(cancelled.message ?? "Bloom chưa hủy được phiên đang chờ. Bạn thử lại nhé.");
                }
              }}
              style={[styles.retryButton, cancellingPending && styles.retryButtonDisabled]}
            >
              <Text style={styles.retryText}>{cancellingPending ? "Đang hủy…" : `Hủy ${pendingBoardGame.gameKind === "chess" ? "Cờ vua" : "Cờ tướng"}`}</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => setRetryNonce((value) => value + 1)} style={styles.retryButton}>
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  route: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 28,
    backgroundColor: "#FFF8FB",
  },
  title: { color: COLORS.primaryText, fontSize: 15, fontWeight: "900" },
  text: { maxWidth: 320, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17, textAlign: "center", fontWeight: "700" },
  errorCard: { marginTop: 8, width: "100%", maxWidth: 340, padding: 14, borderRadius: 18, backgroundColor: "#FFF0F4", gap: 10 },
  errorText: { color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17, textAlign: "center", fontWeight: "700" },
  retryButton: { alignSelf: "center", minHeight: 40, paddingHorizontal: 18, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.primary },
  retryText: { color: "#FFFFFF", fontSize: 12.5, fontWeight: "900" },
  retryButtonDisabled: { opacity: 0.65 },
});
