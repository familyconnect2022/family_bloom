import React from "react";
import {
  ActivityIndicator,
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

export type ButtonVariant =
  | "primary"
  | "outline"
  | "transparent"
  | "link"
  | "destructive"
  | "positive";
export type IconPosition = "left" | "right";

export interface BloomButtonProps extends Omit<PressableProps, "disabled"> {
  title: string;
  variant?: ButtonVariant;
  isLoading?: boolean;
  icon?: BloomIconProp;
  iconPosition?: IconPosition;
  customStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  iconStyle?: StyleProp<ViewStyle | TextStyle>;
  disabled?: boolean | null;
  onPress: () => void;
}

export const BloomButton: React.FC<BloomButtonProps> = ({
  title,
  variant = "primary",
  isLoading = false,
  icon,
  iconPosition = "left",
  customStyle,
  textStyle,
  iconStyle,
  disabled,
  onPress,
  ...rest
}) => {
  const { scaleAnim, handlePressIn, handlePressOut } = useBloomTouchAnimation(disabled, isLoading);
  const isDisabled = !!disabled || isLoading;
  const flattenedCustomStyle = StyleSheet.flatten(customStyle);
  const hasPercentageWidth =
    typeof flattenedCustomStyle?.width === "string" && flattenedCustomStyle.width.endsWith("%");
  const wrapperLayoutStyle: StyleProp<ViewStyle> = [
    hasPercentageWidth && styles.percentageWidthWrapper,
    typeof flattenedCustomStyle?.flex === "number" ? { flex: flattenedCustomStyle.flex } : undefined,
    flattenedCustomStyle?.zIndex != null ? { zIndex: flattenedCustomStyle.zIndex } : undefined,
  ];

  const getVariantStyles = () => {
    switch (variant) {
      case "outline":
        return {
          view: styles.outlineView,
          text: styles.outlineText,
          iconColor: COLORS.primaryText,
        };
      case "transparent":
        return {
          view: styles.transparentView,
          text: styles.transparentText,
          iconColor: COLORS.primaryText,
        };
      case "link":
        return { view: styles.linkView, text: styles.linkText, iconColor: COLORS.primary };
      case "destructive":
        return { view: styles.destructiveView, text: styles.solidText, iconColor: COLORS.white };
      case "positive":
        return { view: styles.positiveView, text: styles.solidText, iconColor: COLORS.white };
      case "primary":
      default:
        return { view: styles.primaryView, text: styles.solidText, iconColor: COLORS.white };
    }
  };
  const vStyles = getVariantStyles();

  return (
    <Animated.View style={[wrapperLayoutStyle, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: isLoading }}
        style={({ pressed }) => [
          styles.baseButton,
          vStyles.view,
          variant === "primary" && !isDisabled && styles.primaryShadow,
          isDisabled && !isLoading && styles.disabledButton,
          isLoading && variant === "primary" && styles.loadingPrimaryButton,
          pressed && variant !== "primary" && { opacity: 0.7 },
          customStyle,
        ]}
        {...rest}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={vStyles.text.color} />
        ) : icon ? (
          <View style={styles.contentRow}>
            {iconPosition === "left" &&
              renderIcon(icon, 18, vStyles.iconColor, [styles.iconLeft, iconStyle])}
            <Text style={[styles.baseText, vStyles.text, isDisabled && styles.disabledText, textStyle]}>
              {title}
            </Text>
            {iconPosition === "right" &&
              renderIcon(icon, 18, vStyles.iconColor, [styles.iconRight, iconStyle])}
          </View>
        ) : (
          <Text style={[styles.baseText, vStyles.text, styles.noIconText, isDisabled && styles.disabledText, textStyle]}>
            {title}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  percentageWidthWrapper: { width: "100%" },
  baseButton: {
    minHeight: 50,
    borderRadius: 25,
    paddingHorizontal: 22,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  baseText: { fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },
  noIconText: { width: "100%", textAlign: "center", alignSelf: "stretch", includeFontPadding: false },
  solidText: { color: COLORS.white },
  primaryView: { backgroundColor: COLORS.primary },
  outlineView: { backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.primary },
  outlineText: { color: COLORS.primaryText },
  transparentView: { backgroundColor: COLORS.transparent },
  transparentText: { color: COLORS.primaryText },
  linkView: { backgroundColor: "transparent", paddingHorizontal: 0, paddingVertical: 4 },
  linkText: { color: COLORS.primary, textDecorationLine: "underline" },
  destructiveView: { backgroundColor: COLORS.destructive },
  positiveView: { backgroundColor: COLORS.positive },
  primaryShadow: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  loadingPrimaryButton: {
    backgroundColor: "#D66F8E",
    borderWidth: 0,
    shadowOpacity: 0.18,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: COLORS.accentBg,
    borderColor: COLORS.border,
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 0,
  },
  disabledText: { color: COLORS.secondaryText },
  iconLeft: { marginRight: 8 },
  iconRight: { marginLeft: 8 },
});
