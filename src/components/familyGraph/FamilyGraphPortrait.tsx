import { useEffect, useState } from "react";
import { Image, type ImageStyle, type StyleProp, type TextStyle } from 'react-native';
import { BloomText as Text } from '../ui/BloomText';

/** Graph node portrait: only mounted viewport nodes request images.
 * Prefer the person's own photograph; the caller may provide linked-member fallback.
 * Never log, fetch or publish private image URLs from here.
 */
export function FamilyGraphPortrait({ uri, initials, imageStyle, textStyle }: {
  uri?: string | null;
  initials: string;
  imageStyle?: StyleProp<ImageStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const valid = typeof uri === "string" && /^https:\/\//i.test(uri.trim()) ? uri.trim() : null;
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => { setFailed(null); }, [valid]);
  if (valid && failed !== valid) {
    return <Image
      source={{ uri: valid }}
      resizeMode="cover"
      onError={() => setFailed(valid)}
      style={[{ width: "100%", height: "100%", borderRadius: 10 }, imageStyle]}
      accessibilityLabel={`Ảnh chân dung ${initials}`}
    />;
  }
  return <Text allowFontScaling={false} style={textStyle}>{initials}</Text>;
}
