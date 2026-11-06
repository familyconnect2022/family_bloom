/** Appearance 3.0 experiment — compiler-safe snapshots, not global Proxy reads.
 * No Firebase and no persistence inside these hooks. Values are immutable and
 * are used directly in JSX/style dependencies. Experimental Dev Lab only.
 */
import { useMemo, useSyncExternalStore } from 'react';
import { getBloomThemeSnapshot, subscribeBloomTheme, type BloomThemeSnapshot } from '../theme/runtime';
import { getLivingAppearance, subscribeLivingTypography, type BloomFontStyle } from '../theme/livingAppearance';
import { getBloomColors, type BloomColors, type BloomPaletteId, type BloomResolvedMode } from '../theme/palette';

export type A3Typography = Readonly<{ font: BloomFontStyle; scale: number; family: string; letterSpacing: number }>;
const androidFont: Readonly<Record<BloomFontStyle, string>> = {
  modern: 'sans-serif', rounded: 'sans-serif-medium', cute: 'sans-serif-rounded',
  clear: 'sans-serif', classic: 'serif',
};
const tracking: Readonly<Record<BloomFontStyle, number>> = {
  modern: 0, rounded: 0.16, cute: 0.38, clear: 0.44, classic: 0,
};
export function makeA3Typography(font: BloomFontStyle, scale: number): A3Typography {
  return Object.freeze({font, scale, family:androidFont[font], letterSpacing:tracking[font]});
}
let typographyCache: A3Typography | null = null;
function getTypographySnapshot(): A3Typography {
  const current = getLivingAppearance();
  if (typographyCache?.font === current.font && typographyCache.scale === current.fontScale) return typographyCache;
  typographyCache = makeA3Typography(current.font, current.fontScale);
  return typographyCache;
}
export function useA3Typography(): A3Typography {
  return useSyncExternalStore(subscribeLivingTypography, getTypographySnapshot, getTypographySnapshot);
}
const subscribeNone = (_cb: () => void) => () => {};
const getNoTheme = (): null => null;
/** Optional palette subscription for leaf text: explicit artistic colors should
 * not re-render just because another palette was selected. Hook order is fixed. */
export function useA3OptionalTheme(enabled: boolean) {
  const getSnapshot: () => BloomThemeSnapshot | null = enabled ? getBloomThemeSnapshot : getNoTheme;
  return useSyncExternalStore(enabled ? subscribeBloomTheme : subscribeNone, getSnapshot, getSnapshot);
}
export function useA3Theme() {
  return useSyncExternalStore(subscribeBloomTheme, getBloomThemeSnapshot, getBloomThemeSnapshot);
}
export type A3Tokens = Readonly<{ colors: BloomColors; typography: A3Typography; sizes: Readonly<{ tiny:number; caption:number; body:number; title:number; headline:number }> }>;
export function makeA3Tokens(colors: BloomColors, typography: A3Typography): A3Tokens {
  const ratio = typography.scale / 100;
  const round = (value:number) => Math.round(value * ratio * 10) / 10;
  return { colors, typography, sizes: { tiny:round(11), caption:round(13), body:round(16), title:round(20), headline:round(26) } };
}
/** Direct props/snapshots are dependencies that React Compiler can see. */
export function useA3Tokens(): A3Tokens {
  const theme = useA3Theme();
  const typography = useA3Typography();
  return useMemo(() => makeA3Tokens(theme.colors, typography), [theme.colors, typography]);
}
export function makeA3SandboxColors(palette: BloomPaletteId, mode: BloomResolvedMode): BloomColors {
  return getBloomColors(palette, mode);
}
