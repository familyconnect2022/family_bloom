import { useBloomColorsRevision , useBloomTypographyRevision} from '../../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../../theme/createBloomStyles';
import React from "react";
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  TextStyle,
  ViewStyle,
} from "react-native";
import { BloomIconProp, COLORS, renderIcon, useBloomTouchAnimation } from "./shared";
import { useA3Theme } from '../../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';


export interface BloomFABProps extends Omit<PressableProps, "disabled"> {
  icon?: BloomIconProp;
  onPress: () => void;
  customStyle?: StyleProp<ViewStyle>;
  iconStyle?: StyleProp<ViewStyle | TextStyle>;
  disabled?: boolean | null;
}

export const BloomFAB: React.FC<BloomFABProps> = ({
  icon = "add",
  onPress,
  customStyle,
  iconStyle,
  disabled,
  ...rest
}) => {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  const { scaleAnim, handlePressIn, handlePressOut } = useBloomTouchAnimation(disabled);
  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!!disabled}
        style={[__a3_styles.fabBase, __a3_styles.primaryShadow, customStyle]}
        {...rest}
      >
        {renderIcon(icon, 28, __a3Colors.onPrimary, iconStyle)}
      </Pressable>
    </Animated.View>
  );
};

const styles = createBloomStyles(() => StyleSheet.create({
  fabBase: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryShadow: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
}));
