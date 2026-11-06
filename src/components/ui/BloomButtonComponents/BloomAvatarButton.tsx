import { useBloomThemeRevision } from '../../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../../theme/createBloomStyles';
import React from "react";
import { Image as ExpoImage } from "expo-image";
import { Animated, Image, ImageSourcePropType, ImageStyle, Pressable, PressableProps, StyleProp, StyleSheet, View, ViewStyle,  } from 'react-native';
import { BloomText as Text } from '../BloomText';
import { COLORS, useBloomTouchAnimation } from "./shared";
import { getInitials } from "./utils";
import { useA3Theme } from '../../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';


export interface BloomAvatarButtonProps extends Omit<PressableProps, "disabled"> {
  source?: ImageSourcePropType | undefined | null;
  text?: string;
  size?: number;
  showOnlineIndicator?: boolean;
  onPress: () => void;
  customStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  /** Changes for every accepted crop, even when Android reuses the same file URI. */
  previewRevision?: number;
  /** Individual avatars and CV use a rounded square; legacy game avatars stay round. */
  shape?: "circle" | "square";
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
  previewRevision,
  shape = "circle",
  indicatorStyle,
  disabled,
  text = "khách",
  ...rest
}) => {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const { scaleAnim, handlePressIn, handlePressOut } = useBloomTouchAnimation(disabled);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!!disabled}
        style={[
          __a3_styles.avatarWrapper,
          { width: size, height: size, borderRadius: shape === "square" ? Math.min(24, Math.round(size * 0.22)) : size / 2 },
          customStyle,
        ]}
        {...rest}
      >
        {source && previewRevision !== undefined && typeof source === "object" && !Array.isArray(source) && "uri" in source && !!source.uri ? (
          <ExpoImage
            key={`avatar-preview-${previewRevision}`}
            source={{ uri: source.uri }}
            cachePolicy="none"
            transition={0}
            recyclingKey={`avatar-preview-${previewRevision}`}
            style={[__a3_styles.avatarImage, imageStyle]}
            contentFit="cover"
          />
        ) : source ? <Image source={source} style={[__a3_styles.avatarImage, imageStyle]} /> : null}
        {!source && text ? (
          <View
            style={{
              width: "100%",
              height: "100%",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: __a3Colors.iconBackground,
            }}
          >
            <Text style={[{ color: __a3Colors.primaryText, fontWeight: "700" }, { fontSize: size * 0.3 }]}>
              {getInitials(text || "Khách")}
            </Text>
          </View>
        ) : null}
        {showOnlineIndicator && <View style={[__a3_styles.onlineDot, indicatorStyle]} />}
      </Pressable>
    </Animated.View>
  );
};

const styles = createBloomStyles(() => StyleSheet.create({
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
}));
