import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { BloomIconProp, COLORS, renderIcon, sharedInputStyles } from "./shared";

export interface BloomRatingInputProps {
  label?: string;
  maxStars?: number;
  rating: number;
  onRatingChange: (rating: number) => void;
  filledIcon?: BloomIconProp;
  emptyIcon?: BloomIconProp;
  containerStyle?: StyleProp<ViewStyle>;
}

export const BloomRatingInput: React.FC<BloomRatingInputProps> = ({
  label,
  maxStars = 5,
  rating,
  onRatingChange,
  filledIcon = "heart",
  emptyIcon = "heart-outline",
  containerStyle,
}) => {
  return (
    <View style={[sharedInputStyles.inputWrapper, containerStyle]}>
      {label && <Text style={sharedInputStyles.inputLabel}>{label}</Text>}
      <View style={styles.ratingRow}>
        {Array.from({ length: maxStars }).map((_, index) => {
          const starValue = index + 1;
          const isFilled = starValue <= rating;
          return (
            <Pressable
              key={index}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                onRatingChange(starValue);
              }}
              style={styles.ratingHeart}
            >
              {renderIcon(
                isFilled ? filledIcon : emptyIcon,
                30,
                isFilled ? COLORS.primary : COLORS.border,
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  ratingRow: { flexDirection: "row", alignItems: "center" },
  ratingHeart: { marginRight: 8 },
});
