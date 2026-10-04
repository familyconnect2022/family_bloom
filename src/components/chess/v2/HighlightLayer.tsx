import React from "react";
import { StyleSheet } from "react-native";
import Animated, { type SharedValue, useAnimatedStyle } from "react-native-reanimated";
import type { BoardOrientation } from "./coordinateMapper";

type VisualIndices = {
  selectedSquareIndex: SharedValue<number>;
  lastMoveFromIndex: SharedValue<number>;
  lastMoveToIndex: SharedValue<number>;
  checkedKingIndex: SharedValue<number>;
  premoveFromIndex: SharedValue<number>;
  premoveToIndex: SharedValue<number>;
};

type MarkerProps = {
  index: SharedValue<number>;
  squareSize: number;
  orientation: BoardOrientation;
  kind: "last" | "selected" | "check" | "premove";
};

/**
 * V4I: render only the highlights that can actually be visible.
 * Previous renderer mounted 64 slots × 4 Animated.View = 256 animated styles.
 * A chess position needs at most 6 highlight rectangles at once:
 * last move 2 + selected 1 + check 1 + premove 2.
 */
const HighlightMarker = React.memo(function HighlightMarker({ index, squareSize, orientation, kind }: MarkerProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const current = index.value;
    if (current < 0 || current > 63) return { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }] };
    let row = Math.floor(current / 8);
    let col = current % 8;
    if (orientation === "black") {
      row = 7 - row;
      col = 7 - col;
    }
    return {
      opacity: 1,
      transform: [{ translateX: col * squareSize }, { translateY: row * squareSize }],
    };
  }, [orientation, squareSize]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.marker,
        { width: squareSize, height: squareSize },
        kind === "last" ? styles.lastMove : kind === "selected" ? styles.selected : kind === "check" ? styles.check : styles.premove,
        animatedStyle,
      ]}
    />
  );
});

export const HighlightLayer = React.memo(function HighlightLayer({
  squareSize,
  orientation,
  selectedSquareIndex,
  lastMoveFromIndex,
  lastMoveToIndex,
  checkedKingIndex,
  premoveFromIndex,
  premoveToIndex,
}: VisualIndices & { squareSize: number; orientation: BoardOrientation }) {
  return (
    <>
      <HighlightMarker index={lastMoveFromIndex} squareSize={squareSize} orientation={orientation} kind="last" />
      <HighlightMarker index={lastMoveToIndex} squareSize={squareSize} orientation={orientation} kind="last" />
      <HighlightMarker index={premoveFromIndex} squareSize={squareSize} orientation={orientation} kind="premove" />
      <HighlightMarker index={premoveToIndex} squareSize={squareSize} orientation={orientation} kind="premove" />
      <HighlightMarker index={selectedSquareIndex} squareSize={squareSize} orientation={orientation} kind="selected" />
      <HighlightMarker index={checkedKingIndex} squareSize={squareSize} orientation={orientation} kind="check" />
    </>
  );
});

const styles = StyleSheet.create({
  marker: { position: "absolute", left: 0, top: 0 },
  lastMove: { backgroundColor: "rgba(255, 214, 112, 0.34)" },
  selected: { backgroundColor: "rgba(255,255,255,0.34)", borderWidth: 2, borderColor: "rgba(255,255,255,.88)" },
  check: { backgroundColor: "rgba(208,66,91,.36)" },
  premove: { backgroundColor: "rgba(132,146,215,.28)", borderWidth: 1.5, borderColor: "rgba(111,123,198,.72)" },
});
