import { useEffect, useSyncExternalStore, type ComponentType, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { applyBloomSelection, getBloomActiveColors, getBloomResolvedMode, getBloomSelection, getBloomThemeRevision, getBloomThemeSnapshot, setBloomSystemMode, subscribeBloomTheme, updateBloomMode, updateBloomPalette } from './runtime';
import { DEFAULT_BLOOM_SELECTION, type BloomDisplayMode, type BloomPaletteId } from './palette';
import { applyLivingAppearance, DEFAULT_LIVING_APPEARANCE, getLivingAppearance, getLivingTypographyRevision, getLivingMotionRevision, subscribeLivingAppearance, subscribeLivingTypography, subscribeLivingMotion, type BloomFontStyle, type BloomMotionLevel } from './livingAppearance';
import { appearanceUserEdited } from './appearanceCloudSync';
import { BloomHeroWarmup } from './BloomHeroWarmup';

/** Only the account bridge loads UID-specific storage. Never hydrate unscoped
 * appearance on the login screen or overwrite another account's preference. */
export const BLOOM_THEME_STORAGE_KEY = '@family-bloom/android/theme/v1';
export const BLOOM_EXTRA_STORAGE_KEY = '@family-bloom/android/appearance/extras/v2';
export function appearanceLocalReady(): Promise<void> { return Promise.resolve(); }

/** Subscription hooks select ONLY the appearance dimension they consume. */
export const useBloomColorsRevision = () => useSyncExternalStore(subscribeBloomTheme, getBloomThemeRevision, getBloomThemeRevision);
const noopSubscribe = (_cb: () => void) => () => {};
const noopRevision = () => 0;
/** Explicitly colored leaf text is driven by its parent style; default colored
 * leaf text listens for palette changes. Both always listen to typography. */
export function useBloomConditionalColorRevision(needsTheme: boolean): number {
  return useSyncExternalStore(needsTheme ? subscribeBloomTheme : noopSubscribe,
    needsTheme ? getBloomThemeRevision : noopRevision,
    needsTheme ? getBloomThemeRevision : noopRevision);
}
export const useBloomTypographyRevision = () => useSyncExternalStore(subscribeLivingTypography, getLivingTypographyRevision, getLivingTypographyRevision);
export const useBloomMotionRevision = () => useSyncExternalStore(subscribeLivingMotion, getLivingMotionRevision, getLivingMotionRevision);
/** Compat for legacy screens: a screen with style factories depends on both
 * color and typography; gradually migrate leaf components to narrow hooks. */
export function useBloomThemeRevision(): string {
  const colors = useBloomColorsRevision();
  const typography = useBloomTypographyRevision();
  return `${colors}:${typography}`;
}
export function BloomThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  useEffect(() => { setBloomSystemMode(systemScheme === 'dark' ? 'dark' : 'light'); }, [systemScheme]);
  // Never subscribe at this root: changes must not re-render Auth, uploading
  // media, game sockets or navigation stacks.
  return <>{children}<BloomHeroWarmup /></>;
}
export function useBloomTheme() {
  const state = useSyncExternalStore(subscribeBloomTheme, getBloomThemeSnapshot, getBloomThemeSnapshot);
  return {
    selection: state.selection, colors: state.colors, resolvedMode: state.resolvedMode,
    setPalette: (palette: BloomPaletteId) => { if (updateBloomPalette(palette)) appearanceUserEdited(); },
    setMode: (mode: BloomDisplayMode) => { if (updateBloomMode(mode)) appearanceUserEdited(); },
    reset: () => {
      const c = applyBloomSelection(DEFAULT_BLOOM_SELECTION);
      const t = applyLivingAppearance(DEFAULT_LIVING_APPEARANCE);
      if (c || t) appearanceUserEdited();
    },
  };
}
export function withBloomTheme<P extends object>(Component: ComponentType<P>): ComponentType<P> {
  function BloomThemeAwareScreen(props: P) {
    useBloomThemeRevision();
    return <Component {...props} />;
  }
  BloomThemeAwareScreen.displayName = `BloomTheme(${Component.displayName || Component.name || 'Screen'})`;
  return BloomThemeAwareScreen;
}
export function useBloomLivingAppearance() {
  // The immutable preference OBJECT is the external-store snapshot, not a
  // discarded revision. React Compiler can now trace selected font/scale in JSX.
  const value = useSyncExternalStore(subscribeLivingAppearance, getLivingAppearance, getLivingAppearance);
  return {
    value,
    setFont: (font: BloomFontStyle) => { if (applyLivingAppearance({ ...getLivingAppearance(), font })) appearanceUserEdited(); },
    setFontScale: (fontScale: number) => { if (applyLivingAppearance({ ...getLivingAppearance(), fontScale })) appearanceUserEdited(); },
    setMotion: (motion: BloomMotionLevel) => { if (applyLivingAppearance({ ...getLivingAppearance(), motion })) appearanceUserEdited(); },
  };
}
