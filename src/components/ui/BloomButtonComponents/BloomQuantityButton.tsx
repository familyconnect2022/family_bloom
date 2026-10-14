import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import { BloomIconProp, COLORS, renderIcon } from "./shared";

export interface BloomQuantityButtonProps {
  value: number;
  onChange: (newValue: number) => void;
  min?: number;
  max?: number;
  decrementIcon?: BloomIconProp;
  incrementIcon?: BloomIconProp;
  customStyle?: StyleProp<ViewStyle>;
  actionButtonStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  iconStyle?: StyleProp<ViewStyle | TextStyle>;
}

export const BloomQuantityButton: React.FC<BloomQuantityButtonProps> = ({
  value,
  onChange,
  min = 1,
  max = 99,
  decrementIcon = "remove",
  incrementIcon = "add",
  customStyle,
  actionButtonStyle,
  textStyle,
  iconStyle,
}) => {
  const handleDecrement = () => {
    if (value > min) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(value - 1);
    }
  };
  const handleIncrement = () => {
    if (value < max) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(value + 1);
    }
  };
  return (
    <View style={[styles.stepperContainer, customStyle]}>
      <Pressable
        onPress={handleDecrement}
        disabled={value <= min}
        style={[styles.stepperBtn, value <= min && styles.stepperDisabled, actionButtonStyle]}
      >
        {renderIcon(decrementIcon, 16, COLORS.primaryText, iconStyle)}
      </Pressable>
      <Text style={[styles.stepperValue, textStyle]}>{value}</Text>
      <Pressable
        onPress={handleIncrement}
        disabled={value >= max}
        style={[styles.stepperBtn, value >= max && styles.stepperDisabled, actionButtonStyle]}
      >
        {renderIcon(incrementIcon, 16, COLORS.primaryText, iconStyle)}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.softSurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 4,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
  },
  stepperDisabled: { opacity: 0.4 },
  stepperValue: {
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primaryText,
  },
});
