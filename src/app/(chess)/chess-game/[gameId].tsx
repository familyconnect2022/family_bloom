import { useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback } from "react";
import { StyleSheet, View } from "react-native";

import {
  activateChessSurface,
  getChessSurfaceState,
  minimizeChessSurface,
  prepareChessSurface,
} from "../../../services/chess/chessSurfaceStore";

/**
 * Route ownership is intentionally tiny in Phase 17.9A.
 * The expensive board lives once at AppRoot in ChessSurfaceHost; this route only
 * tells that persistent surface which authoritative game should be visible.
 */
export default function ChessGameRouteController() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();

  useFocusEffect(useCallback(() => {
    if (!gameId) return undefined;
    prepareChessSurface("route");
    activateChessSurface(gameId, "full");
    return () => {
      const current = getChessSurfaceState();
      if (current.gameId === gameId && current.mode === "full") minimizeChessSurface();
    };
  }, [gameId]));

  // Keep a stable native route underneath the root surface. It never owns a
  // ChessBoard, listener, clock or gesture node.
  return <View pointerEvents="none" style={styles.routeBackdrop} />;
}

const styles = StyleSheet.create({
  routeBackdrop: { flex: 1, backgroundColor: "#FFF8FB" },
});
