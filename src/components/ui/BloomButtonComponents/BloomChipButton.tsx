import React from "react";
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from "react-native";
import { BloomIconProp, COLORS, renderIcon, useBloomTouchAnimation } from "./shared";

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
  const { scaleAnim, handlePressIn, handlePressOut } = useBloomTouchAnimation(disabled);
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!!disabled}
        style={[
          styles.chipBase,
          selected ? styles.chipSelected : styles.chipUnselected,
          customStyle,
        ]}
        {...rest}
      >
        {renderIcon(icon, 14, selected ? COLORS.white : COLORS.primaryText, [
          { marginRight: 4 },
          iconStyle,
        ])}
        <Text
          style={[
            styles.chipText,
            selected ? styles.chipTextSelected : styles.chipTextUnselected,
            textStyle,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
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
  chipTextSelected: { color: COLORS.white },
  chipTextUnselected: { color: COLORS.primaryText },
});
