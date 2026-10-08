import React, { type ReactNode, useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { positionToSquare, type BoardOrientation } from "./coordinateMapper";

export const InteractionLayer = React.memo(function InteractionLayer({
  squareSize,
  orientation,
  onPressSquare,
  enabled = true,
  children,
}: {
  squareSize: number;
  orientation: BoardOrientation;
  onPressSquare: (square: string) => void;
  enabled?: boolean;
  children: ReactNode;
}) {
  const onTapAt = useCallback((x: number, y: number) => {
    const square = positionToSquare(x, y, squareSize, orientation);
    if (square) onPressSquare(square);
  }, [onPressSquare, orientation, squareSize]);

  const gesture = useMemo(() => Gesture.Tap()
    // Tap-only board input: exactly one JS callback per completed tap. Piece
    // nodes are visual-only, so there is no nested Pan recognizer to arbitrate.
    .runOnJS(true)
    .enabled(enabled)
    .maxDuration(350)
    .maxDistance(14)
    .onEnd((event, success) => {
      if (success) onTapAt(event.x, event.y);
    }), [enabled, onTapAt]);

  return (
    <GestureDetector gesture={gesture}>
      <View collapsable={false} style={styles.fill}>
        {children}
      </View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({ fill: { flex: 1 } });
