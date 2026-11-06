/** Shared presentation tokens. Cards never use alternate pink backgrounds. */
import { COLORS } from './theme';
export const BLOOM_SUPPER = {
  surface: {
    get card() { return COLORS.surface; },
    get soft() { return COLORS.surface; },
    get accent() { return COLORS.surface; },
    get raised() { return COLORS.surface; },
    get icon() { return COLORS.iconBackground; },
  },
  border: {
    get soft() { return COLORS.border; },
    get card() { return COLORS.border; },
    get strong() { return COLORS.focusBorder; },
    get icon() { return COLORS.border; },
  },
  radius: { card: 24, modal: 28, compact: 20, icon: 15, button: 18 },
  shadow: {
    get color() { return COLORS.shadow; },
    opacity: 0.09, radius: 16, y: 7, elevation: 3,
  },
  modal: {
    get backdrop() { return COLORS.overlay; },
    get glowPink() { return COLORS.selectedBackground; },
    get glowGold() { return COLORS.iconBackground; },
  },
  copy: { eyebrow: 'FAMILY BLOOM' },
} as const;
export type BloomSupperTone = 'default' | 'soft' | 'accent';
