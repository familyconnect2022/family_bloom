import { BloomScaledInput } from '../BloomScaledInput';
import { createBloomStyles } from '../../../theme/createBloomStyles';
import { useA3Tokens } from '../../../appearance3/useAppearance3';
import * as Haptics from "expo-haptics";
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Animated, Pressable, StyleProp, StyleSheet, TextInput, TextInputProps, View, ViewStyle, TextStyle,  } from 'react-native';
import { BloomText as Text } from '../BloomText';
import { BLOOM_MOTION } from "../../../constants/motion";
import { useBloomKeyboardFocus } from "../../layout/BloomKeyboardScreen";
import { BloomIconProp, COLORS, renderIcon, sharedInputStyles } from "./shared";
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';


export interface BloomTextInputProps extends TextInputProps {
  label?: string;
  leftIcon?: BloomIconProp;
  rightIcon?: BloomIconProp;
  onLeftIconPress?: () => void;
  onRightIconPress?: () => void;
  isPassword?: boolean;
  isSearch?: boolean;
  error?: string;
  helperText?: string;
  helperTone?: "warm" | "neutral";
  variant?: "default" | "embedded";
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export const BloomTextInput = forwardRef<TextInput, BloomTextInputProps>(({
  label,
  leftIcon,
  rightIcon,
  onLeftIconPress,
  onRightIconPress,
  isPassword = false,
  isSearch = false,
  error,
  helperText,
  helperTone = "warm",
  variant = "default",
  containerStyle,
  inputStyle,
  value,
  onChangeText,
  multiline,
  onFocus,
  onBlur,
  onContentSizeChange,
  style: nativeInputStyle,
  ...rest
}, forwardedRef) => {
  const __a3_styles = useA3LegacyStyles(styles);

  // Only the input redraws for a theme change; typing does not update the theme store.
  const { colors, sizes } = useA3Tokens();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);
  useImperativeHandle(forwardedRef, () => inputRef.current as TextInput);
  const { revealInput } = useBloomKeyboardFocus();
  const isEmbedded = variant === "embedded";

  const handleFocus = (event: Parameters<NonNullable<TextInputProps["onFocus"]>>[0]) => {
    setIsFocused(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: BLOOM_MOTION.durations.fast,
      useNativeDriver: false,
    }).start();
    const revealGap = multiline ? 58 : 28;
    revealInput(inputRef.current, revealGap);
    // Android OEM keyboards can finish their resize after focus. A second measurement
    // keeps the full Bloom field visible without moving the whole screen.
    setTimeout(() => revealInput(inputRef.current, revealGap), multiline ? 90 : 45);
    onFocus?.(event);
  };

  const handleBlur = (event: Parameters<NonNullable<TextInputProps["onBlur"]>>[0]) => {
    setIsFocused(false);
    Animated.timing(focusAnim, {
      toValue: 0,
      duration: BLOOM_MOTION.durations.fast,
      useNativeDriver: false,
    }).start();
    onBlur?.(event);
  };

  const animatedBorderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.inputBorder, colors.inputBorderFocus],
  });
  const borderColor = error ? colors.destructive : animatedBorderColor;

  const backgroundColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.inputSurface, colors.inputSurfaceFocus],
  });

  const actualLeftIcon = isSearch && !leftIcon ? "search" : leftIcon;
  let actualRightIcon = rightIcon;
  let actualOnRightPress = onRightIconPress;

  if (isSearch && value && value.length > 0) {
    actualRightIcon = "close-circle";
    actualOnRightPress = () => onChangeText && onChangeText("");
  } else if (isPassword) {
    actualRightIcon = showPassword ? "eye-off" : "eye";
    actualOnRightPress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setShowPassword(!showPassword);
    };
  }

  return (
    <View style={[sharedInputStyles.inputWrapper, containerStyle]}>
      {label && <Text appearanceRole="caption" appearanceTone="primaryText" style={sharedInputStyles.inputLabel}>{label}</Text>}
      <Animated.View
        style={[
          __a3_styles.inputContainer,
          { shadowColor: colors.shadow, height: multiline ? undefined : Math.max(52, Math.ceil(sizes.body * 3.25)) },
          multiline && __a3_styles.multilineContainer,
          isEmbedded && __a3_styles.embeddedContainer,
          !isEmbedded && { borderColor, backgroundColor },
          isFocused && !error && !isEmbedded && sharedInputStyles.focusShadow,
          { shadowColor: colors.shadow },
        ]}
      >
        {actualLeftIcon && (
          <Pressable
            disabled={!onLeftIconPress}
            onPress={() => {
              onLeftIconPress?.();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }}
            style={__a3_styles.iconLeft}
          >
            {renderIcon(actualLeftIcon, 20, isFocused ? colors.primary : colors.secondaryText)}
          </Pressable>
        )}

        <BloomScaledInput
          appearanceRole={StyleSheet.flatten([nativeInputStyle, inputStyle])?.fontSize == null ? 'body' : undefined}
          appearanceTone="primaryText"
          ref={inputRef}
          style={[__a3_styles.textInput, multiline && __a3_styles.multilineInput, nativeInputStyle, inputStyle, { color: colors.primaryText }]}
          placeholderTextColor={colors.inputPlaceholder}
          secureTextEntry={isPassword && !showPassword}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          onContentSizeChange={(event) => {
            onContentSizeChange?.(event);
            if (multiline && isFocused) {
              // Multiline fields can grow after focus. Re-measure the full field so BloomKeyboardScreen
              // scrolls by the current bottom edge instead of the first line/top edge.
              const reveal = () => revealInput(inputRef.current, 58);
              requestAnimationFrame(reveal);
              setTimeout(reveal, 90);
            }
          }}
          {...rest}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />

        {actualRightIcon && (
          <Pressable
            disabled={!actualOnRightPress}
            onPress={actualOnRightPress}
            style={__a3_styles.iconRight}
          >
            {renderIcon(
              actualRightIcon,
              20,
              isFocused || isPassword ? colors.primary : colors.secondaryText,
            )}
          </Pressable>
        )}
      </Animated.View>
      {error ? (
        <View style={__a3_styles.errorCallout}><Text appearanceTone="destructive" style={sharedInputStyles.errorText}>{error}</Text></View>
      ) : helperText ? (
        <View style={[__a3_styles.helperCallout, helperTone === "neutral" && __a3_styles.helperCalloutNeutral]}>
          <Text appearanceTone={helperTone === "neutral" ? "secondaryText" : "primary"} style={[__a3_styles.helperText, helperTone === "neutral" && __a3_styles.helperTextNeutral]}>{helperText}</Text>
        </View>
      ) : null}
    </View>
  );
});

BloomTextInput.displayName = "BloomTextInput";

const styles = createBloomStyles(() => StyleSheet.create({
  inputContainer: {
    height: 52,
    borderRadius: 18,
    borderWidth: 1.7,
    paddingHorizontal: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 8,
    fontSize: 15,
    color: COLORS.primaryText,
    fontWeight: "600",
    height: "100%",
  },
  embeddedContainer: {
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    paddingHorizontal: 8,
  },
  multilineContainer: {
    height: "auto",
    minHeight: 96,
    alignItems: "flex-start",
    paddingTop: 12,
    paddingBottom: 12,
  },
  multilineInput: {
    minHeight: 70,
    height: undefined,
    textAlignVertical: "top",
  },
  iconLeft: { marginRight: 10, justifyContent: "center" },
  iconRight: { marginLeft: 8, padding: 4, justifyContent: "center" },
  helperCallout: { marginTop: 7, marginHorizontal: 3, borderRadius: 12, backgroundColor: COLORS.surface, paddingHorizontal: 10, paddingVertical: 7 },
  helperCalloutNeutral: { backgroundColor: COLORS.surface },
  helperText: { color: COLORS.primary, fontSize: 11.5, lineHeight: 16, fontWeight: "700" },
  helperTextNeutral: { color: COLORS.secondaryText, fontWeight: "600" },
  errorCallout: { marginTop: 7, marginHorizontal: 3, borderRadius: 12, backgroundColor: COLORS.surface, paddingHorizontal: 8, paddingVertical: 2 },
}));
