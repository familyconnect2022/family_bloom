/** Family Bloom Android palette. Surfaces are deliberately uniform for each mode.
 * Do not mix brand colors with error/success semantics or media/board content.
 */
export type BloomPaletteId = 'rose' | 'garden' | 'heritage' | 'midnight';
export type BloomDisplayMode = 'light' | 'dark' | 'system';
export type BloomResolvedMode = 'light' | 'dark';
export type BloomSelection = Readonly<{ palette: BloomPaletteId; mode: BloomDisplayMode }>;
export const DEFAULT_BLOOM_SELECTION: BloomSelection = { palette: 'rose', mode: 'light' };
export const BLOOM_PALETTE_IDS: readonly BloomPaletteId[] = ['rose', 'garden', 'heritage', 'midnight'];
export const BLOOM_PALETTE_LABELS: Readonly<Record<BloomPaletteId, string>> = {
  rose: 'Bloom Rose', garden: 'Bloom Garden', heritage: 'Bloom Heritage', midnight: 'Bloom Midnight',
};

export type BloomColors = Readonly<{
  background: string; surface: string; card: string; surfaceSoft: string;
  surfaceFocus: string; focusBorder: string; inputSurface: string; inputSurfaceFocus: string;
  inputBorder: string; inputBorderFocus: string; inputPlaceholder: string;
  tabActive: string; tabInactive: string; tabSurface: string; timelineRail: string;
  primary: string; softSurface: string; accentBg: string; primaryText: string;
  secondaryText: string; border: string; positive: string; attention: string;
  destructive: string; white: string; red: string;
  onPrimary: string; muted: string; shadow: string; overlay: string; transparent: string;
  // Tokens for illustrations and selected states, never used as alternate card fills.
  iconBackground: string; selectedBackground: string; heroSurface: string;
  textOnSurface: string; textOnSelected: string; textDisabled: string;
  iconForeground: string; iconOnSelected: string; iconSelectedBackground: string;
  buttonPrimaryText: string; outline: string; calendarSelectedText: string;
}>;

type Seeds = Readonly<{ background: string; surface: string; soft: string; selected: string;
  primary: string; text: string; muted: string; border: string; focus: string;
  shadow: string; onPrimary: string; hero: string }>;

const SEEDS: Record<BloomPaletteId, Record<BloomResolvedMode, Seeds>> = {
  rose: {
    light: { background: '#FFF6F8', surface: '#FFFFFF', soft: '#FFF0F5', selected: '#FCE7EF', primary: '#AC4D76', text: '#352832', muted: '#766875', border: '#F0E5E9', focus: '#AC4D76', shadow: '#745063', onPrimary: '#FFFFFF', hero: '#FCE5EE' },
    dark: { background: '#18141C', surface: '#29222D', soft: '#342A36', selected: '#463141', primary: '#E9A2BD', text: '#F7F0F5', muted: '#C6B3C2', border: '#483848', focus: '#F1B5CE', shadow: '#09070B', onPrimary: '#281923', hero: '#332631' },
  },
  garden: {
    light: { background: '#F2F8F3', surface: '#FFFFFF', soft: '#EAF4EC', selected: '#DDF0E4', primary: '#39765A', text: '#223D2C', muted: '#667B6B', border: '#D7E6DA', focus: '#39765A', shadow: '#43634E', onPrimary: '#FFFFFF', hero: '#E4F2E8' },
    dark: { background: '#131A17', surface: '#222C26', soft: '#29372E', selected: '#344A3C', primary: '#A3D7B4', text: '#F0F7F1', muted: '#B5C9BA', border: '#405549', focus: '#B7E9C6', shadow: '#080E0A', onPrimary: '#15251A', hero: '#293C30' },
  },
  heritage: {
    light: { background: '#FCF6ED', surface: '#FFFFFF', soft: '#FBF0E3', selected: '#F4E6D5', primary: '#91613E', text: '#493524', muted: '#84715E', border: '#E8D9C6', focus: '#91613E', shadow: '#72553B', onPrimary: '#FFFFFF', hero: '#F6E4CC' },
    dark: { background: '#1D1814', surface: '#2D251F', soft: '#362B22', selected: '#46382B', primary: '#E7BF8E', text: '#FAF2E7', muted: '#C9B8A3', border: '#554435', focus: '#F3CE9E', shadow: '#100B08', onPrimary: '#2E2215', hero: '#3A2C20' },
  },
  midnight: {
    light: { background: '#F4F2FC', surface: '#FFFFFF', soft: '#F0EDFB', selected: '#EAE5F9', primary: '#6D55A4', text: '#302945', muted: '#756D87', border: '#DDD7EF', focus: '#6D55A4', shadow: '#655486', onPrimary: '#FFFFFF', hero: '#E9E1FA' },
    dark: { background: '#161521', surface: '#27253A', soft: '#302D43', selected: '#403855', primary: '#C6B3F0', text: '#F4F0FD', muted: '#BDB3D3', border: '#49435E', focus: '#DACCF9', shadow: '#0B0912', onPrimary: '#211B34', hero: '#342B4B' },
  },
};

export function getBloomColors(id: BloomPaletteId, mode: BloomResolvedMode): BloomColors {
  const s = SEEDS[id][mode];
  const dark = mode === 'dark';
  return {
    background: s.background, surface: s.surface, card: s.surface,
    surfaceSoft: s.soft, surfaceFocus: s.selected, focusBorder: s.focus,
    inputSurface: s.surface, inputSurfaceFocus: s.surface,
    inputBorder: s.border, inputBorderFocus: s.focus, inputPlaceholder: s.muted,
    tabActive: s.primary, tabInactive: s.muted, tabSurface: s.surface,
    timelineRail: s.border, primary: s.primary, softSurface: s.soft, accentBg: s.selected,
    primaryText: s.text, secondaryText: s.muted, border: s.border,
    positive: dark ? '#8CD5AB' : '#287A4D', attention: dark ? '#F3C87C' : '#986113',
    destructive: dark ? '#F6A2A9' : '#BA3755',
    white: '#FFFFFF', red: dark ? '#FFABAB' : '#C82936', onPrimary: s.onPrimary,
    muted: s.muted, shadow: s.shadow,
    overlay: dark ? 'rgba(0,0,0,0.65)' : 'rgba(40,20,32,0.34)', transparent: 'transparent',
    iconBackground: s.soft, selectedBackground: s.selected, heroSurface: s.hero,
    textOnSurface: s.text, textOnSelected: s.text, textDisabled: s.muted,
    iconForeground: s.primary, iconOnSelected: s.primary, iconSelectedBackground: s.selected,
    buttonPrimaryText: s.onPrimary, outline: s.border, calendarSelectedText: s.onPrimary,
  };
}

/**
 * Floating tabbar's own paper-like surface; do not reuse general card tokens.
 * The outer hitbox remains fully transparent. Even in dark display mode the
 * dock deliberately remains a LIGHT, themed surface so its icons stay dark.
 * Keeping this palette isolated prevents the Rose white-card rule from
 * accidentally tinting every other surface.
 */
export type BloomDockColors = Readonly<{
  surface: string;
  border: string;
  selected: string;
  inactiveIcon: string;
  activeIcon: string;
  bubbleText: string;
  shadow: string;
}>;
const DOCK_SURFACES: Readonly<Record<BloomPaletteId, Readonly<Record<BloomResolvedMode, Readonly<{surface:string; border:string; selected:string}>>>>> = {
  rose: {
    light: { surface: '#FFFFFF', border: '#F0E5E9', selected: '#AC4D76' },
    dark: { surface: '#FFF1F5', border: '#F2DEE7', selected: '#F5CCDC' },
  },
  garden: {
    light: { surface: '#F6FFF8', border: '#DCE9DF', selected: '#39765A' },
    dark: { surface: '#F0FCF3', border: '#D1E7D7', selected: '#D0F0D9' },
  },
  heritage: {
    light: { surface: '#FFFBF4', border: '#EDE1D0', selected: '#91613E' },
    dark: { surface: '#FFF5EA', border: '#EBDACA', selected: '#F4DFC5' },
  },
  midnight: {
    light: { surface: '#FAF8FF', border: '#E8E0F5', selected: '#6D55A4' },
    dark: { surface: '#F5F1FF', border: '#E1D9F4', selected: '#E1D5FA' },
  },
};
export function getBloomDockColors(id: BloomPaletteId, mode: BloomResolvedMode): BloomDockColors {
  const dock = DOCK_SURFACES[id][mode];
  const dark = mode === 'dark';
  const seeds = SEEDS[id][mode];
  return {
    ...dock,
    inactiveIcon: dark ? '#211B20' : id === 'rose' ? '#645660' : id === 'garden' ? '#314B3A' : id === 'heritage' ? '#56402E' : '#3D3552',
    activeIcon: dark ? '#211B20' : seeds.primary,
    bubbleText: dark ? '#211B20' : '#FFFFFF',
    shadow: dark ? '#08070B' : seeds.shadow,
  };
}

export function isBloomSelection(value: unknown): value is BloomSelection {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<BloomSelection>;
  return BLOOM_PALETTE_IDS.includes(v.palette as BloomPaletteId)
    && (v.mode === 'light' || v.mode === 'dark' || v.mode === 'system');
}
