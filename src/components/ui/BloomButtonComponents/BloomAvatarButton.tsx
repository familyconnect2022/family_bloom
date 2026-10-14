import React from "react";
import {
  Animated,
  Image,
  ImageSourcePropType,
  ImageStyle,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { COLORS, useBloomTouchAnimation } from "./shared";
import { getColorByName, getInitials } from "./utils";

export interface BloomAvatarButtonProps extends Omit<PressableProps, "disabled"> {
  source?: ImageSourcePropType | undefined | null;
  text?: string;
  size?: number;
  showOnlineIndicator?: boolean;
  onPress: () => void;
  customStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  indicatorStyle?: StyleProp<ViewStyle>;
  disabled?: boolean | null;
}

export const BloomAvatarButton: React.FC<BloomAvatarButtonProps> = ({
  source,
  size = 48,
  showOnlineIndicator = false,
  onPress,
  customStyle,
  imageStyle,
  indicatorStyle,
  disabled,
  text = "khách",
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
        style={[
          styles.avatarWrapper,
          { width: size, height: size, borderRadius: size / 2 },
          customStyle,
        ]}
        {...rest}
      >
        {source && <Image source={source} style={[styles.avatarImage, imageStyle]} />}
        {!source && text ? (
          <View
            style={{
              width: "100%",
              height: "100%",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: getColorByName(text),
            }}
          >
            <Text style={[{ color: "white", fontWeight: "700" }, { fontSize: size * 0.3 }]}>
              {getInitials(text || "Khách")}
            </Text>
          </View>
        ) : null}
        {showOnlineIndicator && <View style={[styles.onlineDot, indicatorStyle]} />}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  avatarWrapper: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    overflow: "hidden",
    position: "relative",
  },
  avatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.positive,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
});
