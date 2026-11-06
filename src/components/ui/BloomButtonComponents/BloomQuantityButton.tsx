import { useBloomThemeRevision } from '../../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../../theme/createBloomStyles';
import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import { BloomText as Text } from '../BloomText';
import { BloomIconProp, COLORS, renderIcon } from "./shared";
import { useA3Theme } from '../../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';


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
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
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
    <View style={[__a3_styles.stepperContainer, customStyle]}>
      <Pressable
        onPress={handleDecrement}
        disabled={value <= min}
        style={[__a3_styles.stepperBtn, value <= min && __a3_styles.stepperDisabled, actionButtonStyle]}
      >
        {renderIcon(decrementIcon, 16, __a3Colors.primaryText, iconStyle)}
      </Pressable>
      <Text style={[__a3_styles.stepperValue, textStyle]}>{value}</Text>
      <Pressable
        onPress={handleIncrement}
        disabled={value >= max}
        style={[__a3_styles.stepperBtn, value >= max && __a3_styles.stepperDisabled, actionButtonStyle]}
      >
        {renderIcon(incrementIcon, 16, __a3Colors.primaryText, iconStyle)}
      </Pressable>
    </View>
  );
};

const styles = createBloomStyles(() => StyleSheet.create({
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
    backgroundColor: COLORS.surface,
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
}));
