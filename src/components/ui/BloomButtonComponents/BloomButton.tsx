import { createBloomStyles } from '../../../theme/createBloomStyles';
import { useA3Tokens } from '../../../appearance3/useAppearance3';
import React from "react";
import { ActivityIndicator, Animated, Pressable, PressableProps, StyleProp, StyleSheet, TextStyle, View, ViewStyle,  } from 'react-native';
import { BloomText as Text } from '../BloomText';
import { BloomIconProp, COLORS, renderIcon, useBloomTouchAnimation } from "./shared";
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';


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
  const __a3_styles = useA3LegacyStyles(styles);

  const { colors, sizes } = useA3Tokens();
  const { scaleAnim, handlePressIn, handlePressOut } = useBloomTouchAnimation(disabled, isLoading);
  const isDisabled = !!disabled || isLoading;
  const flattenedCustomStyle = StyleSheet.flatten(customStyle);
  const hasPercentageWidth =
    typeof flattenedCustomStyle?.width === "string" && flattenedCustomStyle.width.endsWith("%");
  const wrapperLayoutStyle: StyleProp<ViewStyle> = [
    hasPercentageWidth && __a3_styles.percentageWidthWrapper,
    typeof flattenedCustomStyle?.flex === "number" ? { flex: flattenedCustomStyle.flex } : undefined,
    flattenedCustomStyle?.zIndex != null ? { zIndex: flattenedCustomStyle.zIndex } : undefined,
  ];

  const getVariantStyles = () => {
    switch (variant) {
      case "outline":
        return {
          view: [__a3_styles.outlineView, { backgroundColor: colors.surface, borderColor: colors.primary }],
          text: { color: colors.primaryText },
          iconColor: colors.primaryText,
        };
      case "transparent":
        return {
          view: [__a3_styles.transparentView, { backgroundColor: colors.transparent }],
          text: { color: colors.primaryText },
          iconColor: colors.primaryText,
        };
      case "link":
        return { view: [__a3_styles.linkView, { backgroundColor: 'transparent' }], text: { color: colors.primary, textDecorationLine: 'underline' as const }, iconColor: colors.primary };
      case "destructive":
        return { view: [__a3_styles.destructiveView, { backgroundColor: colors.destructive }], text: { color: colors.onPrimary }, iconColor: colors.onPrimary };
      case "positive":
        return { view: [__a3_styles.positiveView, { backgroundColor: colors.positive }], text: { color: colors.onPrimary }, iconColor: colors.onPrimary };
      case "primary":
      default:
        return { view: [__a3_styles.primaryView, { backgroundColor: colors.primary }], text: { color: colors.onPrimary }, iconColor: colors.onPrimary };
    }
  };
  const vStyles = getVariantStyles();
  const handleMeasuredPress = () => {
    onPress();
  };

  return (
    <Animated.View style={[wrapperLayoutStyle, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={handleMeasuredPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: isLoading }}
        style={({ pressed }) => [
          __a3_styles.baseButton,
          { minHeight: Math.max(50, Math.ceil(sizes.body * 3.1)) },
          vStyles.view,
          variant === "primary" && !isDisabled && [__a3_styles.primaryShadow, { shadowColor: colors.primary }],
          isDisabled && !isLoading && [__a3_styles.disabledButton, { backgroundColor: colors.accentBg, borderColor: colors.border }],
          isLoading && variant === "primary" && [__a3_styles.loadingPrimaryButton, { backgroundColor: colors.selectedBackground }],
          pressed && variant !== "primary" && { opacity: 0.7 },
          customStyle,
        ]}
        {...rest}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={vStyles.text.color} />
        ) : icon ? (
          <View style={__a3_styles.contentRow}>
            {iconPosition === "left" &&
              renderIcon(icon, 18, vStyles.iconColor, [__a3_styles.iconLeft, iconStyle])}
            <Text appearanceRole={StyleSheet.flatten(textStyle)?.fontSize == null ? "body" : undefined} style={[__a3_styles.baseText, vStyles.text, isDisabled && [__a3_styles.disabledText, { color: colors.secondaryText }], textStyle]}>
              {title}
            </Text>
            {iconPosition === "right" &&
              renderIcon(icon, 18, vStyles.iconColor, [__a3_styles.iconRight, iconStyle])}
          </View>
        ) : (
          <Text appearanceRole={StyleSheet.flatten(textStyle)?.fontSize == null ? "body" : undefined} style={[__a3_styles.baseText, vStyles.text, __a3_styles.noIconText, isDisabled && [__a3_styles.disabledText, { color: colors.secondaryText }], textStyle]}>
            {title}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = createBloomStyles(() => StyleSheet.create({
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
  solidText: { color: COLORS.onPrimary },
  primaryView: { backgroundColor: COLORS.primary },
  outlineView: { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.primary },
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
    backgroundColor: COLORS.selectedBackground,
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
}));
