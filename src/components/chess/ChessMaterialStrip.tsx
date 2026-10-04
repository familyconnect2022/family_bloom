import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../constants/theme";
import type { ChessCaptureCounts, ChessCapturedPiece, ChessColor } from "../../types/chess";

const VALUES: Record<ChessCapturedPiece, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const ORDER: ChessCapturedPiece[] = ["p", "n", "b", "r", "q"];

const PIECE_IMAGES = {
  wp: require("../../../assets/images/chess/pieces-webp-default/wp.webp"),
  wn: require("../../../assets/images/chess/pieces-webp-default/wn.webp"),
  wb: require("../../../assets/images/chess/pieces-webp-default/wb.webp"),
  wr: require("../../../assets/images/chess/pieces-webp-default/wr.webp"),
  wq: require("../../../assets/images/chess/pieces-webp-default/wq.webp"),
  bp: require("../../../assets/images/chess/pieces-webp-default/bp.webp"),
  bn: require("../../../assets/images/chess/pieces-webp-default/bn.webp"),
  bb: require("../../../assets/images/chess/pieces-webp-default/bb.webp"),
  br: require("../../../assets/images/chess/pieces-webp-default/br.webp"),
  bq: require("../../../assets/images/chess/pieces-webp-default/bq.webp"),
} as const;

export const capturePoints = (counts: ChessCaptureCounts) => ORDER.reduce((sum, piece) => sum + counts[piece] * VALUES[piece], 0);

function sameCounts(a: ChessCaptureCounts, b: ChessCaptureCounts) {
  return ORDER.every((piece) => a[piece] === b[piece]);
}

/**
 * Material is deliberately two rows: advantage first, captured pieces second.
 * A long capture row can compact/overlap itself, but can never occupy the same
 * vertical band as the advantage copy.
 */
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
  const compact = total >= 8;
  const dense = total >= 11;
  const ultraDense = total >= 14;

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.advantageRow}>
        {advantage > 0 ? <Text numberOfLines={1} style={styles.advantage}>Lợi thế +{advantage}</Text> : null}
      </View>
      <View style={styles.piecesRow}>
        {total === 0 ? <Text style={styles.empty}>Chưa ăn quân</Text> : null}
        {ORDER.flatMap((piece) => Array.from({ length: captures[piece] }, (_, index) => (
          <Image
            key={`${piece}-${index}`}
            source={PIECE_IMAGES[`${capturedColor}${piece}` as keyof typeof PIECE_IMAGES]}
            resizeMode="contain"
            fadeDuration={0}
            style={[
              styles.piece,
              compact && styles.pieceCompact,
              dense && styles.pieceDense,
              ultraDense && styles.pieceUltraDense,
              index > 0 && styles.overlap,
              dense && index > 0 && styles.overlapDense,
              ultraDense && index > 0 && styles.overlapUltraDense,
            ]}
          />
        )))}
      </View>
    </View>
  );
}, (prev, next) => prev.playerColor === next.playerColor && prev.advantage === next.advantage && sameCounts(prev.captures, next.captures));

const styles = StyleSheet.create({
  container: {
    width: "100%",
    minHeight: 36,
    marginTop: 2,
    alignItems: "flex-start",
    justifyContent: "flex-start",
    overflow: "hidden",
  },
  advantageRow: {
    width: "100%",
    height: 14,
    justifyContent: "center",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  advantage: { fontSize: 10, lineHeight: 13, fontWeight: "900", color: COLORS.primary },
  piecesRow: {
    width: "100%",
    height: 19,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    overflow: "hidden",
  },
  piece: { width: 19, height: 19, flexShrink: 0 },
  pieceCompact: { width: 17, height: 17 },
  pieceDense: { width: 15, height: 15 },
  pieceUltraDense: { width: 13.5, height: 13.5 },
  overlap: { marginLeft: -4.5 },
  overlapDense: { marginLeft: -5.8 },
  overlapUltraDense: { marginLeft: -6.5 },
  empty: { fontSize: 9.5, lineHeight: 13, fontWeight: "700", color: "#B999A6" },
});
