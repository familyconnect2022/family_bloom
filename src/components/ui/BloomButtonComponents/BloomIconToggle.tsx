import { useBloomColorsRevision , useBloomTypographyRevision} from '../../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../../theme/createBloomStyles';
import * as Haptics from "expo-haptics";
import React, { useRef } from "react";
import { Animated, Pressable, StyleProp, StyleSheet, TextStyle, ViewStyle } from "react-native";
import { BloomIconProp, COLORS, renderIcon } from "./shared";
import { useA3Theme } from '../../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';


export interface BloomIconToggleProps {
  value: boolean;
  onValueChange: (newValue: boolean) => void;
  activeIcon: BloomIconProp;
  inactiveIcon: BloomIconProp;
  activeColor?: string;
  inactiveColor?: string;
  size?: number;
  customStyle?: StyleProp<ViewStyle>;
  iconStyle?: StyleProp<ViewStyle | TextStyle>;
}

export const BloomIconToggle: React.FC<BloomIconToggleProps> = ({
  value,
  onValueChange,
  activeIcon,
  inactiveIcon,
  activeColor = COLORS.primary,
  inactiveColor = COLORS.secondaryText,
  size = 24,
  customStyle,
  iconStyle,
}) => {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.7, duration: 100, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, bounciness: 12, useNativeDriver: true }),
    ]).start();
    onValueChange(!value);
  };
  return (
    <Pressable onPress={handlePress}>
      <Animated.View
        style={[
          __a3_styles.iconToggleBase,
          {
            backgroundColor: value ? __a3Colors.softSurface : __a3Colors.accentBg,
            borderColor: value ? activeColor : __a3Colors.border,
          },
          { transform: [{ scale: scaleAnim }] },
          customStyle,
        ]}
      >
        {renderIcon(
          value ? activeIcon : inactiveIcon,
          size,
          value ? activeColor : inactiveColor,
          iconStyle,
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = createBloomStyles(() => StyleSheet.create({
  iconToggleBase: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
  },
}));
