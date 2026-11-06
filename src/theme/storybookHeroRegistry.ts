/** Living Storybook hero registry. One art asset for every main section × color theme.
 * All assets fade to transparency, so page surface provides the final color.
 * Keep originals under /assets; never tint uploaded family photographs.
 */
import type { BloomPaletteId } from './palette';
export type BloomHeroScene = 'home' | 'family' | 'moments' | 'learning' | 'events' | 'settings';
export const BLOOM_HERO_ART: Readonly<Record<BloomHeroScene, Record<BloomPaletteId, number>>> = {
  home: {
    rose: require('../../assets/images/storybook/heroes/v2/home_rose.webp'),
    garden: require('../../assets/images/storybook/heroes/v2/home_garden.webp'),
    heritage: require('../../assets/images/storybook/heroes/v2/home_heritage.webp'),
    midnight: require('../../assets/images/storybook/heroes/v2/home_midnight.webp'),
  },
  family: {
    rose: require('../../assets/images/storybook/heroes/v2/family_rose.webp'),
    garden: require('../../assets/images/storybook/heroes/v2/family_garden.webp'),
    heritage: require('../../assets/images/storybook/heroes/v2/family_heritage.webp'),
    midnight: require('../../assets/images/storybook/heroes/v2/family_midnight.webp'),
  },
  moments: {
    rose: require('../../assets/images/storybook/heroes/v2/moments_rose.webp'),
    garden: require('../../assets/images/storybook/heroes/v2/moments_garden.webp'),
    heritage: require('../../assets/images/storybook/heroes/v2/moments_heritage.webp'),
    midnight: require('../../assets/images/storybook/heroes/v2/moments_midnight.webp'),
  },
  learning: {
    rose: require('../../assets/images/storybook/heroes/v2/learning_rose.webp'),
    garden: require('../../assets/images/storybook/heroes/v2/learning_garden.webp'),
    heritage: require('../../assets/images/storybook/heroes/v2/learning_heritage.webp'),
    midnight: require('../../assets/images/storybook/heroes/v2/learning_midnight.webp'),
  },
  events: {
    rose: require('../../assets/images/storybook/heroes/v2/events_rose.webp'),
    garden: require('../../assets/images/storybook/heroes/v2/events_garden.webp'),
    heritage: require('../../assets/images/storybook/heroes/v2/events_heritage.webp'),
    midnight: require('../../assets/images/storybook/heroes/v2/events_midnight.webp'),
  },
  settings: {
    rose: require('../../assets/images/storybook/heroes/v2/settings_rose.webp'),
    garden: require('../../assets/images/storybook/heroes/v2/settings_garden.webp'),
    heritage: require('../../assets/images/storybook/heroes/v2/settings_heritage.webp'),
    midnight: require('../../assets/images/storybook/heroes/v2/settings_midnight.webp'),
  },
};
export function getBloomHeroArt(scene: BloomHeroScene, theme: BloomPaletteId): number {
  return BLOOM_HERO_ART[scene][theme];
}


/** Tiny bundled placeholder from the same scene/palette: never show an unrelated
 * pink image while Garden/Heritage/Midnight full art is decoded. */
export const BLOOM_HERO_PREVIEW: Readonly<Record<BloomHeroScene, Record<BloomPaletteId, number>>> = {
  home: {
    rose: require('../../assets/images/storybook/heroes/v2/thumbs/home_rose.png'),
    garden: require('../../assets/images/storybook/heroes/v2/thumbs/home_garden.png'),
    heritage: require('../../assets/images/storybook/heroes/v2/thumbs/home_heritage.png'),
    midnight: require('../../assets/images/storybook/heroes/v2/thumbs/home_midnight.png'),
  },
  family: {
    rose: require('../../assets/images/storybook/heroes/v2/thumbs/family_rose.png'),
    garden: require('../../assets/images/storybook/heroes/v2/thumbs/family_garden.png'),
    heritage: require('../../assets/images/storybook/heroes/v2/thumbs/family_heritage.png'),
    midnight: require('../../assets/images/storybook/heroes/v2/thumbs/family_midnight.png'),
  },
  moments: {
    rose: require('../../assets/images/storybook/heroes/v2/thumbs/moments_rose.png'),
    garden: require('../../assets/images/storybook/heroes/v2/thumbs/moments_garden.png'),
    heritage: require('../../assets/images/storybook/heroes/v2/thumbs/moments_heritage.png'),
    midnight: require('../../assets/images/storybook/heroes/v2/thumbs/moments_midnight.png'),
  },
  learning: {
    rose: require('../../assets/images/storybook/heroes/v2/thumbs/learning_rose.png'),
    garden: require('../../assets/images/storybook/heroes/v2/thumbs/learning_garden.png'),
    heritage: require('../../assets/images/storybook/heroes/v2/thumbs/learning_heritage.png'),
    midnight: require('../../assets/images/storybook/heroes/v2/thumbs/learning_midnight.png'),
  },
  events: {
    rose: require('../../assets/images/storybook/heroes/v2/thumbs/events_rose.png'),
    garden: require('../../assets/images/storybook/heroes/v2/thumbs/events_garden.png'),
    heritage: require('../../assets/images/storybook/heroes/v2/thumbs/events_heritage.png'),
    midnight: require('../../assets/images/storybook/heroes/v2/thumbs/events_midnight.png'),
  },
  settings: {
    rose: require('../../assets/images/storybook/heroes/v2/thumbs/settings_rose.png'),
    garden: require('../../assets/images/storybook/heroes/v2/thumbs/settings_garden.png'),
    heritage: require('../../assets/images/storybook/heroes/v2/thumbs/settings_heritage.png'),
    midnight: require('../../assets/images/storybook/heroes/v2/thumbs/settings_midnight.png'),
  },
};
export const getBloomHeroPreview = (scene: BloomHeroScene, theme: BloomPaletteId): number => BLOOM_HERO_PREVIEW[scene][theme];
