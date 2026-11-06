/** Compiler-visible, semantic text colors for illustrated headers.
 *
 * The image veil shares the same appearance palette as the page, but heading
 * text needs stronger contrast than ordinary card subtitles. We compute these
 * from the immutable Appearance 3.0 color snapshot; no global COLORS Proxy,
 * render revision, Firebase listener, or extra subscription is involved.
 */
import type { BloomColors } from './palette';

function blendHex(first: string, second: string, secondWeight: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(first) || !/^#[0-9a-f]{6}$/i.test(second)) return first;
  const rgb = [1, 3, 5].map((index) => {
    const a = parseInt(first.slice(index, index + 2), 16);
    const b = parseInt(second.slice(index, index + 2), 16);
    return Math.round(a * (1 - secondWeight) + b * secondWeight)
      .toString(16).padStart(2, '0');
  });
  return `#${rgb.join('')}`;
}

export type BloomHeroReadingTokens = Readonly<{
  eyebrow: string;
  title: string;
  subtitle: string;
}>;

export function getBloomHeroReadingTokens(colors: BloomColors): BloomHeroReadingTokens {
  return {
    // Preserve a little theme accent without losing text contrast.
    eyebrow: blendHex(colors.primary, colors.primaryText, 0.30),
    title: colors.primaryText,
    // Much darker/lighter than ordinary secondaryText on the hero photo.
    subtitle: blendHex(colors.primaryText, colors.secondaryText, 0.18),
  };
}
