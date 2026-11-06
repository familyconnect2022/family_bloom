import { useBloomColorsRevision , useBloomTypographyRevision} from '../../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../../theme/createBloomStyles';
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { COLORS } from "./shared";
import { useA3Theme } from '../../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';


export interface BloomSwitchProps {
  value: boolean;
  onValueChange: (newValue: boolean) => void;
  customStyle?: StyleProp<ViewStyle>;
  thumbStyle?: StyleProp<ViewStyle>;
}

export const BloomSwitch: React.FC<BloomSwitchProps> = ({
  value,
  onValueChange,
  customStyle,
  thumbStyle,
}) => {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  const translateX = useRef(new Animated.Value(value ? 22 : 2)).current;
  useEffect(() => {
    Animated.spring(translateX, {
      toValue: value ? 22 : 2,
      useNativeDriver: true,
      bounciness: 8,
      speed: 16,
    }).start();
  }, [value]);

  const toggleSwitch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(!value);
  };

  return (
    <Pressable onPress={toggleSwitch}>
      <View
        style={[
          __a3_styles.switchTrack,
          { backgroundColor: value ? __a3Colors.primary : __a3Colors.border },
          customStyle,
        ]}
      >
        <Animated.View style={[__a3_styles.switchThumb, { transform: [{ translateX }] }, thumbStyle]} />
      </View>
    </Pressable>
  );
};

const styles = createBloomStyles(() => StyleSheet.create({
  switchTrack: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
}));
