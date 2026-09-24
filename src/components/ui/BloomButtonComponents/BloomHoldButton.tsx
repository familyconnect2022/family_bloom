import * as Haptics from "expo-haptics";
import React, { useRef } from "react";
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from "react-native";
import { COLORS } from "./shared";

export interface BloomHoldButtonProps {
  title: string;
  onConfirm: () => void;
  durationMs?: number;
  customStyle?: StyleProp<ViewStyle>;
  fillStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const BloomHoldButton: React.FC<BloomHoldButtonProps> = ({
  title,
  onConfirm,
  durationMs = 2000,
  customStyle,
  fillStyle,
  textStyle,
}) => {
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const isHolding = useRef(false);

  const handlePressIn = () => {
    isHolding.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.timing(animatedWidth, {
      toValue: 100,
      duration: durationMs,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && isHolding.current) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onConfirm();
        animatedWidth.setValue(0);
      }
    });
  };

  const handlePressOut = () => {
    isHolding.current = false;
    Animated.timing(animatedWidth, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const fillWidth = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.holdBase, customStyle]}
    >
      <Animated.View style={[styles.holdFill, { width: fillWidth }, fillStyle]} />
      <Text style={[styles.holdText, textStyle]}>
        {title} (Giữ {(durationMs / 1000).toFixed(0)}s)
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  holdBase: {
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.softSurface,
    borderWidth: 1.5,
    borderColor: COLORS.destructive,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
  },
  holdFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: COLORS.destructive,
  },
  holdText: { color: COLORS.destructive, fontSize: 15, fontWeight: "700", zIndex: 1 },
});
