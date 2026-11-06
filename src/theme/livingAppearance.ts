/** Living appearance store: pure JS, no Firestore or React rendering side effects. */
export type BloomFontStyle = 'modern' | 'rounded' | 'cute' | 'clear' | 'classic';
export type BloomMotionLevel = 'vivid' | 'gentle' | 'still';
export type LivingAppearance = Readonly<{ font: BloomFontStyle; fontScale: number; motion: BloomMotionLevel }>;
export const DEFAULT_LIVING_APPEARANCE: LivingAppearance = { font: 'modern', fontScale: 100, motion: 'gentle' };
let appearance = DEFAULT_LIVING_APPEARANCE;
let revision = 0;
let typographyRevision = 0;
let motionRevision = 0;
const allListeners = new Set<() => void>();
const typographyListeners = new Set<() => void>();
const motionListeners = new Set<() => void>();
export function isLivingAppearance(v: unknown): v is LivingAppearance {
  if (!v || typeof v !== 'object') return false;
  const o = v as Partial<LivingAppearance>;
  return ['modern','rounded','cute','clear','classic'].includes(o.font || '') &&
    typeof o.fontScale === 'number' && Number.isInteger(o.fontScale) && o.fontScale >= 90 && o.fontScale <= 160 &&
    ['vivid','gentle','still'].includes(o.motion || '');
}
export const getLivingAppearance = () => appearance;
export const getLivingAppearanceRevision = () => revision;
export const getLivingTypographyRevision = () => typographyRevision;
export const getLivingMotionRevision = () => motionRevision;
const listen = (group: Set<() => void>, cb: () => void) => { group.add(cb); return () => {group.delete(cb);}; };
export const subscribeLivingAppearance = (cb: () => void) => listen(allListeners, cb);
export const subscribeLivingTypography = (cb: () => void) => listen(typographyListeners, cb);
export const subscribeLivingMotion = (cb: () => void) => listen(motionListeners, cb);
export function applyLivingAppearance(value: unknown): boolean {
  if (!isLivingAppearance(value)) return false;
  const typographyChanged = appearance.font !== value.font || appearance.fontScale !== value.fontScale;
  const motionChanged = appearance.motion !== value.motion;
  if (!typographyChanged && !motionChanged) return false;
  appearance = {font: value.font, fontScale: value.fontScale, motion: value.motion};
  revision++;
  if (typographyChanged) { typographyRevision++; typographyListeners.forEach(fn => fn()); }
  if (motionChanged) { motionRevision++; motionListeners.forEach(fn => fn()); }
  allListeners.forEach(fn => fn());
  return true;
}
/** Keep Android glyph-compatible fallback until explicitly bundled Vietnamese fonts are approved. */
export function getLivingFontFamily(style = appearance.font) {
  switch(style) {
    case 'rounded': return 'sans-serif-medium';
    case 'cute': return 'sans-serif-rounded';
    case 'clear': return 'sans-serif';
    case 'classic': return 'serif';
    default: return 'sans-serif';
  }
}
export function getLivingLetterSpacing(style = appearance.font): number {
  return style === 'rounded' ? 0.16 : style === 'cute' ? 0.38 : style === 'clear' ? 0.44 : 0;
}
