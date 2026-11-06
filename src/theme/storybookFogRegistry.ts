/** Pre-rendered 20%-height asymmetric atmospheric fog. Static PNG on UI thread; no live BlurView or expensive animated mask. */
import type { BloomPaletteId, BloomResolvedMode } from './palette';
export const BLOOM_FOG: Record<BloomPaletteId, Record<BloomResolvedMode, number>> = {
  rose: { light: require('../../assets/images/storybook/fog/rose_light.webp'), dark: require('../../assets/images/storybook/fog/rose_dark.webp') },
  garden: { light: require('../../assets/images/storybook/fog/garden_light.webp'), dark: require('../../assets/images/storybook/fog/garden_dark.webp') },
  heritage: { light: require('../../assets/images/storybook/fog/heritage_light.webp'), dark: require('../../assets/images/storybook/fog/heritage_dark.webp') },
  midnight: { light: require('../../assets/images/storybook/fog/midnight_light.webp'), dark: require('../../assets/images/storybook/fog/midnight_dark.webp') },
};
export const getBloomFogArt = (palette: BloomPaletteId, mode: BloomResolvedMode): number => BLOOM_FOG[palette][mode];
