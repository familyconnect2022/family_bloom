import { useBloomThemeRevision } from '../../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../../theme/createBloomStyles';
import React from "react";
import { Animated, Pressable, PressableProps, StyleProp, StyleSheet, TextStyle, ViewStyle,  } from 'react-native';
import { BloomText as Text } from '../BloomText';
import { BloomIconProp, COLORS, renderIcon, useBloomTouchAnimation } from "./shared";
import { useA3Theme } from '../../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';


export interface BloomChipProps extends Omit<PressableProps, "disabled"> {
  label: string;
  selected?: boolean;
  icon?: BloomIconProp;
  onPress: () => void;
  customStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  iconStyle?: StyleProp<ViewStyle | TextStyle>;
  disabled?: boolean | null;
}

export const BloomChipButton: React.FC<BloomChipProps> = ({
  label,
  selected = false,
  icon,
  onPress,
  customStyle,
  textStyle,
  iconStyle,
  disabled,
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
          __a3_styles.chipBase,
          selected ? __a3_styles.chipSelected : __a3_styles.chipUnselected,
          customStyle,
        ]}
        {...rest}
      >
        {renderIcon(icon, 14, selected ? __a3Colors.onPrimary : __a3Colors.primaryText, [
          { marginRight: 4 },
          iconStyle,
        ])}
        <Text
          style={[
            __a3_styles.chipText,
            selected ? __a3_styles.chipTextSelected : __a3_styles.chipTextUnselected,
            textStyle,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = createBloomStyles(() => StyleSheet.create({
  chipBase: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipUnselected: { backgroundColor: COLORS.softSurface, borderColor: COLORS.border },
  chipText: { fontSize: 13, fontWeight: "600" },
  chipTextSelected: { color: COLORS.onPrimary },
  chipTextUnselected: { color: COLORS.primaryText },
}));
