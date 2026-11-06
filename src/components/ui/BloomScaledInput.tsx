import React, { forwardRef } from 'react';
import { StyleSheet, TextInput as NativeTextInput, type TextInputProps, type TextStyle } from 'react-native';
import { useA3OptionalTheme, useA3Typography, type A3Tokens } from '../../appearance3/useAppearance3';
import { bloomFinalStyleField } from '../../theme/bloomTypographyRegistry';

export type BloomScaledInputProps = TextInputProps & {
  appearanceRole?: keyof A3Tokens['sizes'];
  appearanceTone?: 'primaryText' | 'secondaryText' | 'primary';
};
const sizes = { tiny: 11, caption: 13, body: 16, title: 20, headline: 26 } as const;
/** Preserves the native TextInput instance, cursor, focus and draft on theme edits. */
export const BloomScaledInput = forwardRef<NativeTextInput, BloomScaledInputProps>(
  function BloomScaledInput({ style, appearanceRole, appearanceTone, ...props }, ref) {
    const typography = useA3Typography();
    const resolved = StyleSheet.flatten(style) as TextStyle | undefined;
    const theme = useA3OptionalTheme(!!appearanceTone || !resolved?.color);
    const last = bloomFinalStyleField(style, 'fontSize');
    const base = typeof last?.sourceValue === 'number' ? last.sourceValue
      : typeof last?.value === 'number' ? last.value : undefined;
    const multiplier = 1.15 * typography.scale / 100;
    const requestedSize = appearanceRole ? Math.round(sizes[appearanceRole] * typography.scale / 10) / 10
      : base !== undefined ? Math.max(10, Math.round(base * (base < 13 ? Math.min(multiplier,1.32) : multiplier) * 10) / 10)
      : undefined;
    // Hard layout ceiling for single-line Android inputs; explicit theme scale
    // remains reactive, while very large labels cannot break the input box.
    const fontSize = requestedSize === undefined ? undefined : Math.min(props.multiline ? 26 : 23, requestedSize);
    const fontSource = bloomFinalStyleField(style, 'fontFamily');
    const explicitFamily = fontSource?.processed ? fontSource.sourceValue : fontSource?.value;
    const color = appearanceTone ? theme?.colors[appearanceTone]
      : resolved?.color ? undefined : theme?.colors.primaryText;
    return <NativeTextInput ref={ref} {...props} style={[style, {
      fontFamily: typeof explicitFamily === 'string' ? explicitFamily : typography.family,
      ...(color ? { color } : {}),
      ...(fontSize === undefined ? {} : { fontSize }),
      ...(resolved?.letterSpacing !== undefined ? {} : { letterSpacing: typography.letterSpacing }),
    }]} />;
  },
);
BloomScaledInput.displayName = 'BloomScaledInput';
