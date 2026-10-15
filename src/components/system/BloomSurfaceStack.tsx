import React, { memo } from "react";
import { StyleSheet, View } from "react-native";

import { ChessGlobalUiHost } from "../chess/ChessGlobalUiHost";
import { ChessChallengeMiniHost } from "../chess/ChessChallengeMiniHost";
import { ChessMiniHost } from "../chess/ChessMiniHost";
import { XiangqiGlobalUiHost } from "../xiangqi/XiangqiGlobalUiHost";
import { XiangqiChallengeMiniHost } from "../xiangqi/XiangqiChallengeMiniHost";
import { XiangqiMiniHost } from "../xiangqi/XiangqiMiniHost";
import { BoardGameTerminalResultHost } from "./BoardGameTerminalResultHost";

/**
 * Root presentation contains only lightweight global projections:
 * invitation UI, pending challenge mini and active-game mini.
 *
 * Full Chess/Xiangqi boards are route-owned and never live in this root stack.
 * There is deliberately no shared board host, shared session bridge, or shared
 * presentation rail between the two games.
 */
export const BloomSurfaceStack = memo(function BloomSurfaceStack({
  backgroundWarmReady: _backgroundWarmReady,
}: {
  backgroundWarmReady: boolean;
}) {
  return (
    <View pointerEvents="box-none" style={styles.root} testID="bloom-global-game-projections">
      <BoardGameTerminalResultHost />

      <View pointerEvents="box-none" style={styles.miniLayer}>
        <ChessChallengeMiniHost />
        <XiangqiChallengeMiniHost />
        <ChessMiniHost />
        <XiangqiMiniHost />
      </View>

      <View pointerEvents="box-none" style={styles.globalSystemLayer}>
        <ChessGlobalUiHost />
        <XiangqiGlobalUiHost />
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
  miniLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 120,
    elevation: 26,
  },
  globalSystemLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 300,
    elevation: 60,
  },
});
