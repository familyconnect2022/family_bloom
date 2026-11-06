import { createBloomStyles } from '../../../theme/createBloomStyles';
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  ImageSourcePropType,
  ImageStyle,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

// Inputs follow the same palette as the app, even across Rose/Garden/
// Heritage/Midnight and Android light/dark changes.
import { COLORS } from '../../../constants/theme';
export { COLORS };

// ==========================================
// ✨ HELPER RENDER ICON ĐA NĂNG
// ==========================================
export type BloomIconProp = string | ImageSourcePropType | React.ReactElement;

export const renderIcon = (
  icon: BloomIconProp | undefined,
  size: number,
  color: string,
  style?: StyleProp<ViewStyle | ImageStyle>,
) => {
  if (!icon) return null;
  if (typeof icon === "string") {
    return React.createElement(Ionicons, {
      name: icon as keyof typeof Ionicons.glyphMap,
      size,
      color,
      style: style as StyleProp<TextStyle>,
    });
  }
  if (typeof icon === "number" || (typeof icon === "object" && "uri" in icon)) {
    return React.createElement(Image, {
      source: icon as ImageSourcePropType,
      style: [{ width: size, height: size, tintColor: color }, style as StyleProp<ImageStyle>],
      resizeMode: "contain",
    });
  }
  if (React.isValidElement(icon)) {
    return React.createElement(View, { style: style as StyleProp<ViewStyle> }, icon);
  }
};

// ==========================================
// 🎨 STYLES DÙNG CHUNG CHO NHÃN & CONTAINER
// ==========================================
export const sharedInputStyles = createBloomStyles(() => StyleSheet.create({
  inputWrapper: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primaryText,
    marginBottom: 8,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.destructive,
    fontWeight: "600",
    marginTop: 6,
    marginLeft: 4,
  },
  focusShadow: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 4,
  },
}));
