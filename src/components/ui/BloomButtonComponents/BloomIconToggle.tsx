import * as Haptics from "expo-haptics";
import React, { useRef } from "react";
import { Animated, Pressable, StyleProp, StyleSheet, TextStyle, ViewStyle } from "react-native";
import { BloomIconProp, COLORS, renderIcon } from "./shared";

export interface BloomIconToggleProps {
  value: boolean;
  onValueChange: (newValue: boolean) => void;
  activeIcon: BloomIconProp;
  inactiveIcon: BloomIconProp;
  activeColor?: string;
  inactiveColor?: string;
  size?: number;
  customStyle?: StyleProp<ViewStyle>;
  iconStyle?: StyleProp<ViewStyle | TextStyle>;
}

export const BloomIconToggle: React.FC<BloomIconToggleProps> = ({
  value,
  onValueChange,
  activeIcon,
  inactiveIcon,
  activeColor = COLORS.primary,
  inactiveColor = COLORS.secondaryText,
  size = 24,
  customStyle,
  iconStyle,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.7, duration: 100, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, bounciness: 12, useNativeDriver: true }),
    ]).start();
    onValueChange(!value);
  };
  return (
    <Pressable onPress={handlePress}>
      <Animated.View
        style={[
          styles.iconToggleBase,
          {
            backgroundColor: value ? COLORS.softSurface : COLORS.accentBg,
            borderColor: value ? activeColor : COLORS.border,
          },
          { transform: [{ scale: scaleAnim }] },
          customStyle,
        ]}
      >
        {renderIcon(
          value ? activeIcon : inactiveIcon,
          size,
          value ? activeColor : inactiveColor,
          iconStyle,
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  iconToggleBase: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
  },
});
