import React, { memo, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { ChessSurfaceHost } from "../chess/ChessSurfaceHost";
import { XiangqiSurfaceHost } from "../xiangqi/XiangqiSurfaceHost";
import { useActiveBoardGameSession } from "../../services/games/activeBoardGameSessionStore";
import { useBloomSurfaceRailState } from "../../services/presentation/bloomSurfaceRailStore";

/**
 * P2.18 shared lazy-retained board host.
 *
 * The host itself is cheap and exists at app root, but neither board layer is
 * created at startup. A layer is mounted only after the server has produced a
 * concrete session of that kind. Once mounted it survives later matches for the
 * lifetime of the JS process; the inactive layer stays parked, non-interactive
 * and its game runtime observes presentation=hidden.
 */
export const GameBoardHost = memo(function GameBoardHost() {
  const session = useActiveBoardGameSession();
  const rail = useBloomSurfaceRailState();
  const [chessEverMounted, setChessEverMounted] = useState(false);
  const [xiangqiEverMounted, setXiangqiEverMounted] = useState(false);

  useEffect(() => {
    if (session?.kind === "chess") setChessEverMounted(true);
    if (session?.kind === "xiangqi") setXiangqiEverMounted(true);
  }, [session?.kind]);

  // Mount the active kind in the same render that receives the authoritative
  // session. The latch only keeps it alive afterwards; it must not add an extra
  // blank frame before the first board can cover the command route.
  const mountChess = chessEverMounted || session?.kind === "chess";
  const mountXiangqi = xiangqiEverMounted || session?.kind === "xiangqi";

  const chessVisible = session?.kind === "chess"
    && rail.gameKind === "chess"
    && rail.gameId === session.gameId
    && rail.gamePresentation === "full"
    && rail.visibleSurface === "chess";
  const xiangqiVisible = session?.kind === "xiangqi"
    && rail.gameKind === "xiangqi"
    && rail.gameId === session.gameId
    && rail.gamePresentation === "full"
    && rail.visibleSurface === "xiangqi";

  return (
    <View pointerEvents="box-none" style={styles.host} testID="shared-game-board-host">
      {mountChess ? (
        <View
          pointerEvents={chessVisible ? "auto" : "none"}
          accessibilityElementsHidden={!chessVisible}
          importantForAccessibility={chessVisible ? "auto" : "no-hide-descendants"}
          style={[styles.layer, chessVisible ? styles.raisedLayer : styles.parkedLayer]}
          testID="shared-game-board-chess-layer"
        >
          <ChessSurfaceHost occludedByHigherSurface={!chessVisible} />
        </View>
      ) : null}

      {mountXiangqi ? (
        <View
          pointerEvents={xiangqiVisible ? "auto" : "none"}
          accessibilityElementsHidden={!xiangqiVisible}
          importantForAccessibility={xiangqiVisible ? "auto" : "no-hide-descendants"}
          style={[styles.layer, xiangqiVisible ? styles.raisedLayer : styles.parkedLayer]}
          testID="shared-game-board-xiangqi-layer"
        >
          <XiangqiSurfaceHost occludedByHigherSurface={!xiangqiVisible} />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  raisedLayer: {
    zIndex: 2,
    elevation: 20,
    opacity: 1,
  },
  parkedLayer: {
    zIndex: 1,
    elevation: 0,
    opacity: 0,
  },
});
