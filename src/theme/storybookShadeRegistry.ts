/** Small in-APK readability gradient; never an opaque/frosted header card. */
import type { BloomPaletteId, BloomResolvedMode } from './palette';
const SHADES: Record<BloomPaletteId, Record<BloomResolvedMode, number>> = {
  rose: {light: require('../../assets/images/storybook/shades/rose_light.png'), dark: require('../../assets/images/storybook/shades/rose_dark.png')},
  garden: {light: require('../../assets/images/storybook/shades/garden_light.png'), dark: require('../../assets/images/storybook/shades/garden_dark.png')},
  heritage: {light: require('../../assets/images/storybook/shades/heritage_light.png'), dark: require('../../assets/images/storybook/shades/heritage_dark.png')},
  midnight: {light: require('../../assets/images/storybook/shades/midnight_light.png'), dark: require('../../assets/images/storybook/shades/midnight_dark.png')},
};
export const getBloomHeroTextShade = (palette: BloomPaletteId, mode: BloomResolvedMode) => SHADES[palette][mode];
