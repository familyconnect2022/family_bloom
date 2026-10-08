import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../constants/theme";
import type { ChessCaptureCounts, ChessCapturedPiece, ChessColor } from "../../types/chess";

const VALUES: Record<ChessCapturedPiece, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const ORDER: ChessCapturedPiece[] = ["p", "n", "b", "r", "q"];

const PIECE_IMAGES = {
  wp: require("../../../assets/images/chess/pieces-png-default/wp.png"),
  wn: require("../../../assets/images/chess/pieces-png-default/wn.png"),
  wb: require("../../../assets/images/chess/pieces-png-default/wb.png"),
  wr: require("../../../assets/images/chess/pieces-png-default/wr.png"),
  wq: require("../../../assets/images/chess/pieces-png-default/wq.png"),
  bp: require("../../../assets/images/chess/pieces-png-default/bp.png"),
  bn: require("../../../assets/images/chess/pieces-png-default/bn.png"),
  bb: require("../../../assets/images/chess/pieces-png-default/bb.png"),
  br: require("../../../assets/images/chess/pieces-png-default/br.png"),
  bq: require("../../../assets/images/chess/pieces-png-default/bq.png"),
} as const;

export const capturePoints = (counts: ChessCaptureCounts) => ORDER.reduce((sum, piece) => sum + counts[piece] * VALUES[piece], 0);

function sameCounts(a: ChessCaptureCounts, b: ChessCaptureCounts) {
  return ORDER.every((piece) => a[piece] === b[piece]);
}

export const ChessMaterialStrip = React.memo(function ChessMaterialStrip({
  captures,
  playerColor,
  advantage,
}: {
  captures: ChessCaptureCounts;
  playerColor: ChessColor;
  advantage: number;
}) {
  const capturedColor = playerColor === "w" ? "b" : "w";
  const total = ORDER.reduce((sum, piece) => sum + captures[piece], 0);
  const pieceSize = total >= 14 ? 11 : total >= 11 ? 12 : total >= 8 ? 13 : 14;
  const overlap = total >= 14 ? -2 : total >= 11 ? -2.5 : -3;

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.pieces}>
        {ORDER.flatMap((piece) => Array.from({ length: captures[piece] }, (_, index) => (
          <Image
            key={`${piece}-${index}`}
            source={PIECE_IMAGES[`${capturedColor}${piece}` as keyof typeof PIECE_IMAGES]}
            resizeMode="contain"
            fadeDuration={0}
            style={[
              styles.piece,
              { width: pieceSize, height: pieceSize },
              index > 0 && { marginLeft: overlap },
            ]}
          />
        )))}
      </View>
      {advantage > 0 ? <Text style={styles.advantage}>Lợi thế +{advantage}</Text> : null}
    </View>
  );
}, (prev, next) => prev.playerColor === next.playerColor && prev.advantage === next.advantage && sameCounts(prev.captures, next.captures));

const styles = StyleSheet.create({
  container: { minHeight: 18, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 6 },
  pieces: { minHeight: 16, flexDirection: "row", alignItems: "center", flexShrink: 1, overflow: "hidden" },
  piece: { flexShrink: 0 },
  advantage: { fontSize: 10, lineHeight: 13, fontWeight: "900", color: COLORS.primary },
});
