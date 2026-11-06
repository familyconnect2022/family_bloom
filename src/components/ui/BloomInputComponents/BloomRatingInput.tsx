import { useBloomColorsRevision , useBloomTypographyRevision} from '../../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../../theme/createBloomStyles';
import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BloomText as Text } from '../BloomText';
import { BloomIconProp, COLORS, renderIcon, sharedInputStyles } from "./shared";
import { useA3Theme } from '../../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';


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
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return (
    <View style={[sharedInputStyles.inputWrapper, containerStyle]}>
      {label && <Text style={sharedInputStyles.inputLabel}>{label}</Text>}
      <View style={__a3_styles.ratingRow}>
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
              style={__a3_styles.ratingHeart}
            >
              {renderIcon(
                isFilled ? filledIcon : emptyIcon,
                30,
                isFilled ? __a3Colors.primary : __a3Colors.border,
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = createBloomStyles(() => StyleSheet.create({
  ratingRow: { flexDirection: "row", alignItems: "center" },
  ratingHeart: { marginRight: 8 },
}));
