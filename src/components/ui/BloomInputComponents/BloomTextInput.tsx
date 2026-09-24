import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputFocusEventData,
  TextInputProps,
  NativeSyntheticEvent,
  View,
  ViewStyle,
} from "react-native";
import { BLOOM_MOTION } from "../../../constants/motion";
import { useBloomKeyboardFocus } from "../../layout/BloomKeyboardScreen";
import { BloomIconProp, COLORS, renderIcon, sharedInputStyles } from "./shared";

export interface BloomTextInputProps extends TextInputProps {
  label?: string;
  leftIcon?: BloomIconProp;
  rightIcon?: BloomIconProp;
  onLeftIconPress?: () => void;
  onRightIconPress?: () => void;
  isPassword?: boolean;
  isSearch?: boolean;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export const BloomTextInput: React.FC<BloomTextInputProps> = ({
  label,
  leftIcon,
  rightIcon,
  onLeftIconPress,
  onRightIconPress,
  isPassword = false,
  isSearch = false,
  error,
  containerStyle,
  value,
  onChangeText,
  multiline,
  onFocus,
  onBlur,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);
  const { revealInput } = useBloomKeyboardFocus();

  const handleFocus = (event: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: BLOOM_MOTION.durations.fast,
      useNativeDriver: false,
    }).start();
    revealInput(inputRef.current, multiline ? 34 : 22);
    onFocus?.(event);
  };

  const handleBlur = (event: NativeSyntheticEvent<TextInputFocusEventData>) => {
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
    outputRange: [COLORS.border, COLORS.primary],
  });
  const borderColor = error ? COLORS.destructive : animatedBorderColor;

  const backgroundColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.softSurface, COLORS.white],
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
      {label && <Text style={sharedInputStyles.inputLabel}>{label}</Text>}
      <Animated.View
        style={[
          styles.inputContainer,
          multiline && { height: "auto", minHeight: 90, alignItems: "flex-start", paddingTop: 12 },
          { borderColor, backgroundColor },
          isFocused && !error && sharedInputStyles.focusShadow,
        ]}
      >
        {actualLeftIcon && (
          <Pressable
            disabled={!onLeftIconPress}
            onPress={() => {
              onLeftIconPress?.();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }}
            style={styles.iconLeft}
          >
            {renderIcon(actualLeftIcon, 20, isFocused ? COLORS.primary : COLORS.secondaryText)}
          </Pressable>
        )}

        <TextInput
          ref={inputRef}
          style={[styles.textInput, multiline && { textAlignVertical: "top" }]}
          placeholderTextColor={COLORS.secondaryText}
          secureTextEntry={isPassword && !showPassword}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          {...rest}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />

        {actualRightIcon && (
          <Pressable
            disabled={!actualOnRightPress}
            onPress={actualOnRightPress}
            style={styles.iconRight}
          >
            {renderIcon(
              actualRightIcon,
              20,
              isFocused || isPassword ? COLORS.primary : COLORS.secondaryText,
            )}
          </Pressable>
        )}
      </Animated.View>
      {error && <Text style={sharedInputStyles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    height: 52,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.primaryText,
    fontWeight: "600",
    height: "100%",
  },
  iconLeft: { marginRight: 10, justifyContent: "center" },
  iconRight: { marginLeft: 8, padding: 4, justifyContent: "center" },
});
