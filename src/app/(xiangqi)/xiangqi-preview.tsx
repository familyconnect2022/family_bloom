import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

import { XiangqiSurfaceHost } from "../../components/xiangqi/XiangqiSurfaceHost";
import { useXiangqiRealtime } from "../../context/XiangqiRealtimeContext";
import {
  activateXiangqiSurface,
  minimizeXiangqiSurface,
  showXiangqiSurfaceFull,
} from "../../services/xiangqi/xiangqiSurfaceStore";

/**
 * Xiangqi owns its full board inside its own route.
 *
 * This route never reads Chess state and never claims a shared board host. The
 * authoritative game id comes only from XiangqiRealtimeContext. Yielding this
 * route changes Xiangqi presentation to MINI; it does not end the server game.
 */
export default function XiangqiGameRoute() {
  const realtime = useXiangqiRealtime();
  const retainedGameIdRef = useRef<string | null>(null);
  const ownerRef = useRef(`xiangqi-route:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    const gameId = realtime.activeGameId;
    // A short null during invite -> game handoff/recovery is not terminal proof.
    // Xiangqi keeps its own last concrete game id until its surface receives an
    // authoritative terminal teardown. Never park the board because of one null frame.
    if (!gameId) return;
    retainedGameIdRef.current = gameId;
    activateXiangqiSurface(gameId, "full", "active_game", ownerRef.current);
  }, [realtime.activeGameId]);

  useFocusEffect(useCallback(() => {
    const gameId = realtime.activeGameId ?? retainedGameIdRef.current;
    if (!gameId) return undefined;
    const ownerId = ownerRef.current;
    showXiangqiSurfaceFull(gameId, ownerId);
    return () => {
      // Yield presentation only. Xiangqi socket/game lifetime remains owned by
      // XiangqiRealtimeContext and the root mini can represent the same game.
      minimizeXiangqiSurface(ownerId);
    };
  }, [realtime.activeGameId]));

  return (
    <View style={styles.root} testID="xiangqi-owned-game-route">
      <XiangqiSurfaceHost />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFF8FB" },
});
