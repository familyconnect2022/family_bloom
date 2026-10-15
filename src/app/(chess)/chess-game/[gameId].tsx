import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

import { ChessSurfaceHost } from "../../../components/chess/ChessSurfaceHost";
import { useChessRealtime } from "../../../context/ChessRealtimeContext";
import {
  activateChessSurface,
  minimizeChessSurface,
  showChessSurfaceFull,
} from "../../../services/chess/chessSurfaceStore";

/**
 * Chess owns its full board inside its own route.
 *
 * There is no shared Chess/Xiangqi board host or presentation rail here. The
 * server-confirmed Chess game id is copied only into ChessSurfaceStore. When
 * this route yields, Chess alone decides whether its lightweight mini remains.
 */
export default function ChessGameRoute() {
  const { gameId: rawGameId } = useLocalSearchParams<{ gameId: string }>();
  const requestedGameId = typeof rawGameId === "string" ? rawGameId.trim() : "";
  const router = useRouter();
  const chess = useChessRealtime();
  const ownerRef = useRef(`chess-route:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    const authoritativeGameId = chess.activeGameId;
    if (!authoritativeGameId) {
      router.replace("/home-games" as never);
      return;
    }
    if (requestedGameId && requestedGameId !== authoritativeGameId) {
      router.replace({ pathname: "/(chess)/chess-game/[gameId]", params: { gameId: authoritativeGameId } } as never);
      return;
    }
    activateChessSurface(authoritativeGameId, "full", ownerRef.current);
  }, [chess.activeGameId, requestedGameId, router]);

  useFocusEffect(useCallback(() => {
    const gameId = chess.activeGameId;
    if (!gameId) return undefined;
    const ownerId = ownerRef.current;
    showChessSurfaceFull(gameId, ownerId);
    return () => {
      // Yield presentation only. Socket/game identity remains alive and the
      // global mini may represent this same Chess game while this route is away.
      minimizeChessSurface(ownerId);
    };
  }, [chess.activeGameId]));

  return (
    <View style={styles.root} testID="chess-owned-game-route">
      <ChessSurfaceHost />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFF8FB" },
});
