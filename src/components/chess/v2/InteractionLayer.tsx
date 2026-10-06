import React, { createContext, type ReactNode, useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { positionToSquare, type BoardOrientation } from "./coordinateMapper";

/**
 * The parent tap recognizer is exposed to child piece gestures so RNGH can
 * explicitly allow Tap + Pan to coexist. Android otherwise has a tendency to
 * let the outer tap recognizer cancel a child pan before the pan reaches its
 * activation threshold, which made drag/drop feel random even though the move
 * pipeline itself was correct.
 *
 * `any` is deliberate here: RNGH's concrete gesture builder type is internal
 * and varies between minor releases, while simultaneousWithExternalGesture()
 * accepts the builder object at runtime.
 */
export const ChessBoardTapGestureContext = createContext<any>(null);

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
    .enabled(enabled)
    .maxDuration(350)
    .maxDistance(14)
    .onEnd((event, success) => {
      if (success) runOnJS(onTapAt)(event.x, event.y);
    }), [enabled, onTapAt]);

  return (
    <ChessBoardTapGestureContext.Provider value={gesture}>
      <GestureDetector gesture={gesture}>
        <View collapsable={false} style={styles.fill}>
          {children}
        </View>
      </GestureDetector>
    </ChessBoardTapGestureContext.Provider>
  );
});

const styles = StyleSheet.create({ fill: { flex: 1 } });
