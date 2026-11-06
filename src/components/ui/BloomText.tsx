import React, { forwardRef } from 'react';
import { StyleSheet, Text as NativeText, type TextProps, type TextStyle } from 'react-native';
import { useA3OptionalTheme, useA3Typography, type A3Tokens } from '../../appearance3/useAppearance3';
import { bloomFinalStyleField } from '../../theme/bloomTypographyRegistry';

/**
 * Compatible typography boundary: legacy createBloomStyles may provide an
 * already-scaled style. The last declaration's ORIGINAL value is used so a
 * retained style from before hydration can never freeze the font size.
 * New UI uses appearanceRole + appearanceTone and therefore does not depend
 * on the legacy Proxy or the global store inside render.
 */
export type BloomTextProps = TextProps & {
  appearanceRole?: keyof A3Tokens['sizes'];
  appearanceTone?: 'primaryText' | 'secondaryText' | 'primary' | 'onPrimary' | 'destructive' | 'positive' | 'attention';
};
const sizeForRole: Record<NonNullable<BloomTextProps['appearanceRole']>, number> = {
  tiny: 11, caption: 13, body: 16, title: 20, headline: 26,
};
const baseline = (base: number, scale: number) => {
  const ratio = 1.15 * scale / 100;
  return Math.max(10, Math.round(base * (base < 13 ? Math.min(ratio, 1.32) : ratio) * 10) / 10);
};
export const BloomText = forwardRef<NativeText, BloomTextProps>(function BloomText(
  { style, appearanceRole, appearanceTone, ...props }, ref,
) {
  const typography = useA3Typography();
  const resolved = StyleSheet.flatten(style) as TextStyle | undefined;
  const needsTheme = !!appearanceTone || typeof resolved?.color !== 'string';
  const theme = useA3OptionalTheme(needsTheme);
  const lastSize = bloomFinalStyleField(style, 'fontSize');
  const baseSize = typeof lastSize?.sourceValue === 'number' ? lastSize.sourceValue
    : typeof lastSize?.value === 'number' ? lastSize.value : undefined;
  const fontSize = appearanceRole ? Math.round(sizeForRole[appearanceRole] * typography.scale / 100 * 10) / 10
    : baseSize === undefined ? undefined : baseline(baseSize, typography.scale);
  const originalLine = bloomFinalStyleField(style, 'lineHeight');
  const baseLine = typeof originalLine?.sourceValue === 'number' ? originalLine.sourceValue
    : typeof originalLine?.value === 'number' ? originalLine.value : undefined;
  const lineHeight = appearanceRole && fontSize !== undefined ? Math.ceil(fontSize * 1.4)
    : fontSize !== undefined && baseLine !== undefined
      ? Math.max(Math.ceil(fontSize * 1.17), Math.round(baseLine * fontSize / (baseSize || fontSize) * 10) / 10)
    : undefined;
  const familySource = bloomFinalStyleField(style, 'fontFamily');
  // A style factory may have inserted an obsolete system font. Only an
  // explicitly authored font family is preserved (letter / formula / logo).
  const explicitFamily = familySource?.processed ? familySource.sourceValue : familySource?.value;
  const color = appearanceTone ? theme?.colors[appearanceTone]
    : typeof resolved?.color === 'string' ? undefined : theme?.colors.primaryText;
  return <NativeText ref={ref} {...props} style={[style, {
    fontFamily: typeof explicitFamily === 'string' ? explicitFamily : typography.family,
    ...(color ? { color } : {}),
    ...(fontSize === undefined ? {} : { fontSize }),
    ...(lineHeight === undefined ? {} : { lineHeight }),
    ...(resolved?.letterSpacing === undefined ? { letterSpacing: typography.letterSpacing } : {}),
  }]} />;
});
BloomText.displayName = 'BloomText';
