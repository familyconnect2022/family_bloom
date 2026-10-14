import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { useChessRealtime } from "../../../context/ChessRealtimeContext";
import { getActiveBoardGameSession, useActiveBoardGameSession } from "../../../services/games/activeBoardGameSessionStore";
import {
  acquireRouteBoardGamePresentation,
  claimAndPresentBoardGame,
  releaseRouteBoardGamePresentation,
} from "../../../services/presentation/boardGamePresentationCoordinator";

/**
 * P2.17 command-only route.
 *
 * The route owns zero Chess pixels and never manipulates Xiangqi. It submits one
 * presentation request to the root coordinator. Blurring the route changes the
 * same active Chess session from full -> mini; no board/session is recreated.
 */
export default function ChessGameRouteController() {
  const { gameId: rawGameId } = useLocalSearchParams<{ gameId: string }>();
  const gameId = typeof rawGameId === "string" ? rawGameId.trim() : "";
  const router = useRouter();
  const { activeFamilyId } = useAuth();
  const chess = useChessRealtime();
  const activeBoardSession = useActiveBoardGameSession();
  // Route cleanup must only release the exact game this route presented. Using
  // "whatever game is active now" lets an old route blur minimize a newer
  // rematch/session after navigation has already advanced.
  const ownedGameIdRef = useRef<string | null>(null);
  const routeOwnerTokenRef = useRef(`chess-route:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    if (!gameId) return;

    if (chess.busyOtherGame?.gameKind === "xiangqi") {
      router.replace("/xiangqi-preview" as never);
      return;
    }

    const authoritativeChessId = chess.activeGameId;
    const current = getActiveBoardGameSession();

    // P2.21: a terminal result never owns a command route. Once the realtime
    // provider clears activeGameId, this stale route leaves immediately while
    // the independent root Result Host may remain visible above Game Hub.
    if (!authoritativeChessId) {
      if (current?.kind === "xiangqi") router.replace("/xiangqi-preview" as never);
      else router.replace("/home-games" as never);
      return;
    }

    const presented = claimAndPresentBoardGame({
      kind: "chess",
      gameId: authoritativeChessId,
      familyId: activeFamilyId,
      source: "server",
      presentation: "full",
      reason: "route",
    });

    if (presented) {
      ownedGameIdRef.current = authoritativeChessId;
    } else if (current?.kind === "xiangqi") {
      router.replace("/xiangqi-preview" as never);
    }
  }, [activeFamilyId, chess.activeGameId, chess.busyOtherGame, gameId, router]);

  useFocusEffect(useCallback(() => {
    if (!gameId) return undefined;
    const session = getActiveBoardGameSession();
    if (session?.kind !== "chess") return undefined;

    const ownedGameId = session.gameId;
    ownedGameIdRef.current = ownedGameId;
    const ownerToken = routeOwnerTokenRef.current;
    acquireRouteBoardGamePresentation("chess", ownedGameId, ownerToken);
    return () => {
      // Token + exact id are both required. This also protects the same-gameId
      // duplicate-route race: an older route cannot minimize a newer owner.
      releaseRouteBoardGamePresentation("chess", ownedGameId, ownerToken, "mini");
    };
  }, [activeBoardSession?.gameId, activeBoardSession?.kind, chess.activeGameId, gameId]));

  return (
    <View pointerEvents="none" style={styles.route} testID="chess-presentation-command-route">
      <ActivityIndicator size="small" color={COLORS.primary} />
      <Text style={styles.title}>Đang mở ván Cờ vua…</Text>
      <Text style={styles.text}>Bloom đang kết nối đúng ván đang hoạt động.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  route: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 28,
    backgroundColor: "#FFF8FB",
  },
  title: { color: COLORS.primaryText, fontSize: 15, fontWeight: "900" },
  text: { maxWidth: 310, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17, textAlign: "center", fontWeight: "700" },
});
