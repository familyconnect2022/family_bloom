import React, { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { BloomIconProp, COLORS, renderIcon } from "./shared";

export interface BloomProgressButtonProps {
  progress: number;
  title?: string;
  completedTitle?: string;
  completedIcon?: BloomIconProp;
  onPress?: () => void;
  customStyle?: StyleProp<ViewStyle>;
  progressFillStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  iconStyle?: StyleProp<ViewStyle | TextStyle>;
}

export const BloomProgressButton: React.FC<BloomProgressButtonProps> = ({
  progress,
  title = "Tải xuống",
  completedTitle = "Đã hoàn thành",
  completedIcon = "checkmark-circle",
  onPress,
  customStyle,
  progressFillStyle,
  textStyle,
  iconStyle,
}) => {
  const animatedProgress = useRef(new Animated.Value(progress)).current;
  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: Math.min(Math.max(progress, 0), 100),
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const widthInterpolate = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });
  const isCompleted = progress >= 100;

  return (
    <Pressable
      onPress={onPress}
      disabled={progress > 0 && !isCompleted}
      style={[styles.progressBase, customStyle]}
    >
      <Animated.View
        style={[
          styles.progressFill,
          {
            width: widthInterpolate,
            backgroundColor: isCompleted ? COLORS.positive : COLORS.primary,
          },
          progressFillStyle,
        ]}
      />
      <View style={styles.progressContentRow}>
        {isCompleted ? (
          <>
            {renderIcon(completedIcon, 18, COLORS.white, [{ marginRight: 6 }, iconStyle])}
            <Text style={[styles.progressText, textStyle]}>{completedTitle}</Text>
          </>
        ) : progress > 0 ? (
          <Text
            style={[styles.progressText, textStyle]}
          >{`Đang xử lý... ${Math.round(progress)}%`}</Text>
        ) : (
          <Text style={[styles.progressTextInitial, textStyle]}>{title}</Text>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  progressBase: {
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.softSurface,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    justifyContent: "center",
  },
  progressFill: { position: "absolute", top: 0, bottom: 0, left: 0, borderRadius: 25 },
  progressContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    paddingHorizontal: 22,
    width: "100%",
  },
  progressText: { color: COLORS.white, fontSize: 15, fontWeight: "700" },
  progressTextInitial: { color: COLORS.primaryText, fontSize: 15, fontWeight: "700" },
});
