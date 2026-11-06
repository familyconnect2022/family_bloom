import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef } from "react";
import { Animated, StyleProp, TextStyle, View, ViewStyle } from "react-native";

// One semantic palette for every button, including outline/disabled/focus.
// Do not copy the historical pink constants into component modules.
import { COLORS } from '../../../constants/theme';
export { COLORS };

// ==========================================
// ✨ TYPES & HELPERS
// ==========================================

export type IoniconsName = keyof typeof Ionicons.glyphMap;

export type BloomIconProp = IoniconsName | React.ReactElement;

export const renderIcon = (
  icon: BloomIconProp | undefined,
  size: number,
  color: string,
  style?: StyleProp<ViewStyle | TextStyle>,
) => {
  if (!icon) return null;

  if (typeof icon === "string") {
    return React.createElement(Ionicons, {
      name: icon,
      size,
      color,
      style: style as StyleProp<TextStyle>,
    });
  }

  if (React.isValidElement(icon)) {
    return React.createElement(View, { style: style as StyleProp<ViewStyle> }, icon);
  }
};

export const useBloomTouchAnimation = (disabled?: boolean | null, isLoading?: boolean) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isDisabled = !!disabled || !!isLoading;

  const handlePressIn = () => {
    if (!isDisabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
        speed: 34,
        bounciness: 1,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (!isDisabled) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 2,
        speed: 30,
      }).start();
    }
  };

  return { scaleAnim, handlePressIn, handlePressOut };
};
