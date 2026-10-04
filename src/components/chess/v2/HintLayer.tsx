import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, { type SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { hasBit, indexToSquare } from "./moveMask";
import { squareToPosition, type BoardOrientation } from "./coordinateMapper";

type MaskProps = {
  legalMoveLow: SharedValue<number>;
  legalMoveHigh: SharedValue<number>;
  captureLow: SharedValue<number>;
  captureHigh: SharedValue<number>;
};

type SlotProps = MaskProps & {
  index: number;
  squareSize: number;
  orientation: BoardOrientation;
};

const HintSlot = React.memo(function HintSlot({
  index,
  squareSize,
  orientation,
  legalMoveLow,
  legalMoveHigh,
  captureLow,
  captureHigh,
}: SlotProps) {
  const square = indexToSquare(index)!;
  const position = squareToPosition(square, squareSize, orientation);
  const dotSize = squareSize * 0.22;
  const ringInset = squareSize * 0.075;
  const ringWidth = Math.max(2, squareSize * 0.065);

  const moveStyle = useAnimatedStyle(() => ({
    opacity: hasBit(legalMoveLow.value, legalMoveHigh.value, index) ? 1 : 0,
  }));
  const captureStyle = useAnimatedStyle(() => ({
    opacity: hasBit(captureLow.value, captureHigh.value, index) ? 1 : 0,
  }));

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: squareSize,
        height: squareSize,
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            left: (squareSize - dotSize) / 2,
            top: (squareSize - dotSize) / 2,
          },
          moveStyle,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.capture,
          {
            left: ringInset,
            top: ringInset,
            right: ringInset,
            bottom: ringInset,
            borderRadius: squareSize / 2,
            borderWidth: ringWidth,
          },
          captureStyle,
        ]}
      />
    </View>
  );
});

export const HintLayer = React.memo(function HintLayer({
  squareSize,
  orientation,
  legalMoveLow,
  legalMoveHigh,
  captureLow,
  captureHigh,
}: MaskProps & { squareSize: number; orientation: BoardOrientation }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: 64 }, (_, index) => (
        <HintSlot
          key={index}
          index={index}
          squareSize={squareSize}
          orientation={orientation}
          legalMoveLow={legalMoveLow}
          legalMoveHigh={legalMoveHigh}
          captureLow={captureLow}
          captureHigh={captureHigh}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  dot: {
    position: "absolute",
    backgroundColor: "rgba(72, 45, 54, 0.38)",
  },
  capture: {
    position: "absolute",
    borderColor: "rgba(91, 53, 66, 0.40)",
  },
});
