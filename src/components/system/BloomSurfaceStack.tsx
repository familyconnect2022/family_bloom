import React, { memo } from "react";
import { StyleSheet, View } from "react-native";

import { ChessGlobalUiHost } from "../chess/ChessGlobalUiHost";
import { ChessMiniHost } from "../chess/ChessMiniHost";
import { BoardGameSessionBridge } from "./BoardGameSessionBridge";
import { BoardGameTerminalResultHost } from "./BoardGameTerminalResultHost";
import { GameBoardHost } from "./GameBoardHost";
import { useActiveBoardGameSession } from "../../services/games/activeBoardGameSessionStore";
import { useBloomSurfaceRailState } from "../../services/presentation/bloomSurfaceRailStore";

/**
 * P2.18 app-root game presentation shell.
 *
 * Focus View no longer belongs here: it is route-local inside Phả hệ. The only
 * heavy root pixels are board-game layers, both owned by one lazy GameBoardHost.
 */
export const BloomSurfaceStack = memo(function BloomSurfaceStack({
  backgroundWarmReady: _backgroundWarmReady,
}: {
  backgroundWarmReady: boolean;
}) {
  const session = useActiveBoardGameSession();
  const rail = useBloomSurfaceRailState();

  const chessMiniVisible = session?.kind === "chess"
    && rail.gameKind === "chess"
    && rail.gameId === session.gameId
    && rail.gamePresentation === "mini";
  const xiangqiFullVisible = session?.kind === "xiangqi"
    && rail.gameKind === "xiangqi"
    && rail.gameId === session.gameId
    && rail.gamePresentation === "full"
    && rail.visibleSurface === "xiangqi";

  return (
    <View pointerEvents="box-none" style={styles.root} testID="bloom-presentation-rail">
      <BoardGameSessionBridge />
      <GameBoardHost />
      <BoardGameTerminalResultHost />

      <View
        pointerEvents={chessMiniVisible ? "box-none" : "none"}
        accessibilityElementsHidden={!chessMiniVisible}
        importantForAccessibility={chessMiniVisible ? "auto" : "no-hide-descendants"}
        style={[styles.fullLayer, styles.miniLayer, !chessMiniVisible && styles.parkedLayer]}
        testID="bloom-rail-mini-slot"
      >
        {session?.kind === "chess" ? (
          <ChessMiniHost occludedByHigherSurface={!chessMiniVisible} />
        ) : null}
      </View>

      <View pointerEvents="box-none" style={[styles.fullLayer, styles.globalSystemLayer]}>
        <ChessGlobalUiHost suspendedByHigherSurface={xiangqiFullVisible} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9000,
    elevation: 80,
    pointerEvents: "box-none",
  },
  fullLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  parkedLayer: {
    opacity: 0,
  },
  miniLayer: {
    zIndex: 120,
    elevation: 26,
  },
  globalSystemLayer: {
    zIndex: 300,
    elevation: 60,
  },
});
