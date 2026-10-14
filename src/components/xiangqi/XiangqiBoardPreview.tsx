import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { XiangqiPiece, type XiangqiColor, type XiangqiPieceType } from "./XiangqiPiece";

export type XiangqiPreviewPiece = {
  id: string;
  color: XiangqiColor;
  type: XiangqiPieceType;
  col: number;
  row: number;
};

const INITIAL_POSITION: XiangqiPreviewPiece[] = [
  ...(["chariot", "horse", "elephant", "advisor", "general", "advisor", "elephant", "horse", "chariot"] as XiangqiPieceType[]).map((type, col) => ({ id: `b-back-${col}`, color: "black" as const, type, col, row: 0 })),
  { id: "b-cannon-1", color: "black", type: "cannon", col: 1, row: 2 },
  { id: "b-cannon-7", color: "black", type: "cannon", col: 7, row: 2 },
  ...[0, 2, 4, 6, 8].map((col, index) => ({ id: `b-soldier-${index}`, color: "black" as const, type: "soldier" as const, col, row: 3 })),
  ...[0, 2, 4, 6, 8].map((col, index) => ({ id: `r-soldier-${index}`, color: "red" as const, type: "soldier" as const, col, row: 6 })),
  { id: "r-cannon-1", color: "red", type: "cannon", col: 1, row: 7 },
  { id: "r-cannon-7", color: "red", type: "cannon", col: 7, row: 7 },
  ...(["chariot", "horse", "elephant", "advisor", "general", "advisor", "elephant", "horse", "chariot"] as XiangqiPieceType[]).map((type, col) => ({ id: `r-back-${col}`, color: "red" as const, type, col, row: 9 })),
];

function BoardLine({ left, top, width, height = 1.2, rotate = 0 }: { left: number; top: number; width: number; height?: number; rotate?: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        backgroundColor: "#855A3A",
        transform: rotate ? [{ rotate: `${rotate}deg` }] : undefined,
      }}
    />
  );
}

function diagonal(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const width = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return { left: (x1 + x2) / 2 - width / 2, top: (y1 + y2) / 2 - 0.7, width, rotate: angle };
}

export function XiangqiBoardPreview() {
  const { width: screenWidth } = useWindowDimensions();
  const [selectedId, setSelectedId] = useState<string | null>("r-back-4");
  const frameWidth = Math.min(Math.max(300, screenWidth - 44), 398);
  const padding = 18;
  const gridWidth = frameWidth - padding * 2;
  const step = gridWidth / 8;
  const gridHeight = step * 9;
  const frameHeight = gridHeight + padding * 2;
  const pieceSize = Math.min(56, step * 0.94);

  const diagonals = useMemo(() => {
    const point = (col: number, row: number) => ({ x: padding + col * step, y: padding + row * step });
    const lines = [
      [point(3, 0), point(5, 2)],
      [point(5, 0), point(3, 2)],
      [point(3, 7), point(5, 9)],
      [point(5, 7), point(3, 9)],
    ];
    return lines.map(([a, b]) => diagonal(a.x, a.y, b.x, b.y));
  }, [padding, step]);

  return (
    <View style={[styles.frame, { width: frameWidth, height: frameHeight }]}>
      <View style={styles.woodGlow} pointerEvents="none" />

      {Array.from({ length: 10 }, (_, row) => (
        <BoardLine key={`h-${row}`} left={padding} top={padding + row * step} width={gridWidth} />
      ))}

      {Array.from({ length: 9 }, (_, col) => {
        const x = padding + col * step;
        if (col === 0 || col === 8) {
          return <BoardLine key={`v-${col}`} left={x - 0.6} top={padding} width={1.2} height={gridHeight} />;
        }
        return (
          <React.Fragment key={`v-${col}`}>
            <BoardLine left={x - 0.6} top={padding} width={1.2} height={step * 4} />
            <BoardLine left={x - 0.6} top={padding + step * 5} width={1.2} height={step * 4} />
          </React.Fragment>
        );
      })}

      {diagonals.map((line, index) => <BoardLine key={`d-${index}`} {...line} />)}

      <View pointerEvents="none" style={[styles.riverBand, { left: padding + 2, right: padding + 2, top: padding + step * 4 + 2, height: step - 4 }]}>
        <Text style={styles.riverText}>楚 河</Text>
        <Text style={styles.riverText}>漢 界</Text>
      </View>

      {INITIAL_POSITION.map(piece => {
        const left = padding + piece.col * step - pieceSize / 2;
        const top = padding + piece.row * step - pieceSize / 2;
        const selected = selectedId === piece.id;
        return (
          <Pressable
            key={piece.id}
            onPress={() => setSelectedId(current => current === piece.id ? null : piece.id)}
            style={[styles.pieceSlot, { width: pieceSize, height: pieceSize, left, top }]}
          >
            <XiangqiPiece color={piece.color} type={piece.type} size={pieceSize} state={selected ? "selected" : "normal"} />
          </Pressable>
        );
      })}
    </View>
  );
}

export const XIANGQI_INITIAL_POSITION = INITIAL_POSITION;

const styles = StyleSheet.create({
  frame: {
    position: "relative",
    alignSelf: "center",
    overflow: "visible",
    borderRadius: 24,
    backgroundColor: "#F0C990",
    borderWidth: 2,
    borderColor: "#B77C4E",
    shadowColor: "#6F422C",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  woodGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    backgroundColor: "rgba(255, 243, 217, 0.24)",
  },
  riverBand: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "rgba(255, 237, 202, 0.68)",
  },
  riverText: {
    color: "#8B5B3F",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 5,
  },
  pieceSlot: {
    position: "absolute",
    zIndex: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
