import React from "react";
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { BloomIconProp, COLORS, renderIcon, useBloomTouchAnimation } from "./shared";

export interface BloomIconButtonProps extends Omit<PressableProps, "disabled"> {
  icon: BloomIconProp;
  size?: number;
  badgeCount?: number;
  color?: string;
  onPress: () => void;
  customStyle?: StyleProp<ViewStyle>;
  iconStyle?: StyleProp<ViewStyle | TextStyle>;
  badgeContainerStyle?: StyleProp<ViewStyle>;
  badgeTextStyle?: StyleProp<TextStyle>;
  disabled?: boolean | null;
}

export const BloomIconButton: React.FC<BloomIconButtonProps> = ({
  icon,
  size = 22,
  badgeCount,
  color = COLORS.primaryText,
  onPress,
  customStyle,
  iconStyle,
  badgeContainerStyle,
  badgeTextStyle,
  disabled,
  ...rest
}) => {
  const { scaleAnim, handlePressIn, handlePressOut } = useBloomTouchAnimation(disabled);
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!!disabled}
        style={[styles.iconButton, !!disabled && styles.disabledButton, customStyle]}
        {...rest}
      >
        {renderIcon(icon, size, color, iconStyle)}
        {badgeCount !== undefined && badgeCount > 0 && (
          <View style={[styles.badgeContainer, badgeContainerStyle]}>
            <Text style={[styles.badgeText, badgeTextStyle]}>
              {badgeCount > 99 ? "99+" : badgeCount}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.softSurface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgeContainer: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: COLORS.destructive,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: COLORS.white, fontSize: 10, fontWeight: "800" },
  disabledButton: {
    backgroundColor: COLORS.accentBg,
    borderColor: COLORS.border,
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 0,
  },
});
