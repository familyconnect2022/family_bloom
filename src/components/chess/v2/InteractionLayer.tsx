import React, { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { positionToSquare, type BoardOrientation } from "./coordinateMapper";

/**
 * V4I: one native tap surface instead of 64 React Native Pressables.
 * Piece gestures remain above this layer; this layer receives empty-square taps.
 * Using RNGH also avoids the JS Pressable/ScrollView responder path on Android.
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
  const onTapAt = useCallback((x: number, y: number) => {
    const square = positionToSquare(x, y, squareSize, orientation);
    if (square) onPressSquare(square);
  }, [onPressSquare, orientation, squareSize]);

  const gesture = useMemo(() => Gesture.Tap()
    .maxDuration(350)
    .maxDistance(14)
    .onEnd((event, success) => {
      if (success) runOnJS(onTapAt)(event.x, event.y);
    }), [onTapAt]);

  return (
    <GestureDetector gesture={gesture}>
      <View collapsable={false} style={StyleSheet.absoluteFill} />
    </GestureDetector>
  );
});
