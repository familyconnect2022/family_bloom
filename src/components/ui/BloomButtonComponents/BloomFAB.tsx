import React from "react";
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  TextStyle,
  ViewStyle,
} from "react-native";
import { BloomIconProp, COLORS, renderIcon, useBloomTouchAnimation } from "./shared";

export interface BloomFABProps extends Omit<PressableProps, "disabled"> {
  icon?: BloomIconProp;
  onPress: () => void;
  customStyle?: StyleProp<ViewStyle>;
  iconStyle?: StyleProp<ViewStyle | TextStyle>;
  disabled?: boolean | null;
}

export const BloomFAB: React.FC<BloomFABProps> = ({
  icon = "add",
  onPress,
  customStyle,
  iconStyle,
  disabled,
  ...rest
}) => {
  const { scaleAnim, handlePressIn, handlePressOut } = useBloomTouchAnimation(disabled);
  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!!disabled}
        style={[styles.fabBase, styles.primaryShadow, customStyle]}
        {...rest}
      >
        {renderIcon(icon, 28, COLORS.white, iconStyle)}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fabBase: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryShadow: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
