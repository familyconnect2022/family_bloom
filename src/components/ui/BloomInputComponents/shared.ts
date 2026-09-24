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

// ==========================================
// 🎨 BẢNG MÀU CHUẨN DỰ ÁN BLOOM
// ==========================================
export const COLORS = {
  primary: "#F08EAA", // Hồng chính
  softSurface: "#FFF0F4", // Hồng mềm
  accentBg: "#FFE9F0", // Hồng nhạt
  primaryText: "#8E5368", // Mận
  secondaryText: "#878394", // Hồng trầm
  border: "#F6E1E7", // Viền
  positive: "#509871", // Mint
  attention: "#D99A2B", // Honey
  destructive: "#D75572", // Lỗi
  white: "#FFFFFF",
  transparent: "transparent",
};

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
export const sharedInputStyles = StyleSheet.create({
  inputWrapper: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primaryText,
    marginBottom: 6,
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
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
});
