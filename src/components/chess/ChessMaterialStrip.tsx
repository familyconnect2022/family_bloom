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

  return (
    <View style={styles.row} pointerEvents="none">
      <View style={styles.pieces}>
        {total === 0 ? <Text style={styles.empty}>Chưa ăn quân</Text> : null}
        {ORDER.flatMap((piece) => Array.from({ length: captures[piece] }, (_, index) => (
          <Image
            key={`${piece}-${index}`}
            source={PIECE_IMAGES[`${capturedColor}${piece}` as keyof typeof PIECE_IMAGES]}
            resizeMode="contain"
            fadeDuration={0}
            style={[styles.piece, index > 0 && styles.overlap]}
          />
        )))}
      </View>
      {advantage > 0 ? <Text style={styles.advantage}>Lợi thế +{advantage}</Text> : null}
    </View>
  );
}, (prev, next) => prev.playerColor === next.playerColor && prev.advantage === next.advantage && sameCounts(prev.captures, next.captures));

const styles = StyleSheet.create({
  row: { minHeight: 20, flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  pieces: { minHeight: 20, flexDirection: "row", alignItems: "center", flexShrink: 1 },
  piece: { width: 19, height: 19 },
  overlap: { marginLeft: -5 },
  empty: { fontSize: 9.5, fontWeight: "700", color: "#B999A6" },
  advantage: { fontSize: 10.5, fontWeight: "900", color: COLORS.primary },
});
