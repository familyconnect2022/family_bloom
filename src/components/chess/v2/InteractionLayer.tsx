import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { indexToSquare } from "./moveMask";
import { squareToPosition, type BoardOrientation } from "./coordinateMapper";

/**
 * Static 64-square hit surface for tap-to-move.
 *
 * It intentionally lives ABOVE Highlight/Hint layers and BELOW PieceLayer.
 * This avoids relying on Android pointer-event pass-through across multiple
 * absolute overlays while still allowing pieces to own tap/drag gestures.
 * The 64 slots are mounted once and never depend on selection/legal-move state.
 */
export const InteractionLayer = React.memo(function InteractionLayer({
  squareSize,
  orientation,
  onPressSquare,
}: {
  squareSize: number;
  orientation: BoardOrientation;
  onPressSquare: (square: string) => void;
}) {
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: 64 }, (_, index) => {
        const square = indexToSquare(index)!;
        const position = squareToPosition(square, squareSize, orientation);
        return (
          <Pressable
            key={`hit-${square}`}
            accessibilityRole="button"
            accessibilityLabel={`Ô ${square}`}
            onPress={() => onPressSquare(square)}
            style={{
              position: "absolute",
              left: position.x,
              top: position.y,
              width: squareSize,
              height: squareSize,
            }}
          />
        );
      })}
    </View>
  );
});
