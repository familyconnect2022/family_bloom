import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef } from "react";
import { Animated, StyleProp, TextStyle, View, ViewStyle } from "react-native";

// ==========================================
// 🎨 BẢNG MÀU CHUẨN DỰ ÁN BLOOM
// ==========================================
export const COLORS = {
  // 1. Màu chủ đạo (Tone Hồng Pastel)
  primary: "#F48FB1", // Hồng pastel ngọt ngào, tạo điểm nhấn chính
  softSurface: "#FFF0F4", // Hồng cực nhạt, dùng cho nền các button hoặc ô chứa
  accentBg: "#FFE4EC", // Hồng nhạt (đậm hơn softSurface), dùng cho trạng thái disabled/pressed

  // 2. Màu văn bản (Sử dụng tone nâu hồng thay vì đen tuyền để giữ sự mềm mại)
  primaryText: "#7E5260", // Nâu hồng đậm, dễ đọc nhưng không bị gắt
  secondaryText: "#B398A0", // Xám hồng, dành cho các đoạn text phụ hoặc icon inactive

  // 3. Viền và Nền tảng
  border: "#F9D2DE", // Viền hồng nhạt
  white: "#FFFFFF", // Trắng tinh khiết
  transparent: "transparent",

  // 4. Màu trạng thái (Được làm dịu sang hệ pastel)
  positive: "#81C784", // Xanh mint mềm mại (Thành công/Hoàn thành)
  attention: "#FFB74D", // Cam pastel (Cảnh báo/Chờ)
  destructive: "#E57373", // Đỏ hồng dưa hấu (Lỗi/Xóa) - Tránh dùng đỏ tươi gây chói
};

// ==========================================
// ✨ TYPES & HELPERS
// ==========================================

export type IoniconsName = keyof typeof Ionicons.glyphMap;

export type BloomIconProp = IoniconsName | React.ReactElement;

export const renderIcon = (
  icon: BloomIconProp | undefined,
  size: number,
  color: string,
  style?: StyleProp<ViewStyle | TextStyle>,
) => {
  if (!icon) return null;

  if (typeof icon === "string") {
    return React.createElement(Ionicons, {
      name: icon,
      size,
      color,
      style: style as StyleProp<TextStyle>,
    });
  }

  if (React.isValidElement(icon)) {
    return React.createElement(View, { style: style as StyleProp<ViewStyle> }, icon);
  }
};

export const useBloomTouchAnimation = (disabled?: boolean | null, isLoading?: boolean) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isDisabled = !!disabled || !!isLoading;

  const handlePressIn = () => {
    if (!isDisabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
        speed: 34,
        bounciness: 1,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (!isDisabled) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 2,
        speed: 30,
      }).start();
    }
  };

  return { scaleAnim, handlePressIn, handlePressOut };
};
