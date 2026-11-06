import { getBloomThemeRevision } from './runtime';
import { markBloomTypography } from './bloomTypographyRegistry';
import { getLivingAppearance, getLivingTypographyRevision, getLivingFontFamily, getLivingLetterSpacing } from './livingAppearance';

/** Lazily reevaluate theme-aware styles without remounting screens or resetting forms.
 * Only TEXT styles are scaled, never game boards, icons or absolute-positioned artwork.
 */
export function createBloomStyles<T extends Record<string, any>>(factory: () => T): T {
  let revision = '';
  let current: T;
  const load = () => {
    const next = `${getBloomThemeRevision()}:${getLivingTypographyRevision()}`;
    if (revision !== next) {
      const source = factory();
      const { fontScale, font } = getLivingAppearance();
      // Accessible baseline is 8% larger than the old tiny-card typography.
      // User fontScale still adjusts proportionally without changing stored preferences.
      const multiplier = 1.15 * fontScale / 100;
      const fontFamily = getLivingFontFamily(font);
      // React Native StyleSheet.create currently returns style objects; do not
      // mutate them because several screens share the same static factory.
      const result: Record<string, any> = {};
      Object.keys(source).forEach(key => {
        const style = source[key];
        if (!style || typeof style !== 'object' || Array.isArray(style) || typeof style.fontSize !== 'number') {
          result[key] = style; return;
        }
        const size = style.fontSize;
        // Text in narrow badges and controls grows a little less aggressively;
        // large content and paragraphs can use the requested full scale.
        const effective = size < 13 ? Math.min(multiplier, 1.32) : multiplier;
        const transformed: Record<string, any> = { ...style,
          fontSize: Math.max(10, Math.round(size * effective * 10) / 10),
        };
        if (typeof style.lineHeight === 'number') transformed.lineHeight = Math.max(transformed.fontSize * 1.17, Math.round(style.lineHeight * effective * 10) / 10);
        // Preserve the approved classic paper-letter serif and other intentional title families.
        if (!style.fontFamily) transformed.fontFamily = fontFamily;
        if (style.letterSpacing === undefined && getLivingLetterSpacing(font) > 0) transformed.letterSpacing = getLivingLetterSpacing(font);
        markBloomTypography(transformed, style);
        result[key] = transformed;
      });
      current = result as T;
      revision = next;
    }
    return current;
  };
  return new Proxy({} as T, {
    get(_target, property) { return Reflect.get(load(), property); },
    has(_target, property) { return Reflect.has(load(), property); },
    ownKeys() { return Reflect.ownKeys(load()); },
    getOwnPropertyDescriptor(_target, property) {
      const desc = Reflect.getOwnPropertyDescriptor(load(), property);
      return desc ? { ...desc, configurable: true } : undefined;
    },
  });
}
