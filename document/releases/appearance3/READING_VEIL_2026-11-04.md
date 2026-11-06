# Family Bloom · Appearance 3.0 — Hero Reading Veil

Android trial based on `Family_Bloom_APPEARANCE3_FONT_SELECTOR_CARD_ICON_FULL_CODE_2026-11-04.zip`.

## Purpose

Strengthen the eyebrow, title and particularly the description in every `BloomHeroHeader` without darkening the whole illustration or covering the right-hand artwork with a hard-edged card.

## Implementation

- **One shared header**: `src/components/ui/BloomHeroHeader.tsx`.
- **Eight offline transparent reading veils**: `assets/images/storybook/shades/{rose,garden,heritage,midnight}_{light,dark}.png`, from theme `background` seeds. In light mode they use paper-blush, sage-ivory, parchment, and lavender-ivory respectively; in dark mode they use the corresponding dark surfaces.
- **Compiler-safe text tokens**: `src/theme/storybookReadingTokens.ts` receives `theme.colors` from `useA3Theme()` and binds the resulting colors *directly* to Text styles. No global Proxy read is required for the rendered header text.
- **Preserved**: artwork registry, full-width placement, 35% height, irregular lower-edge fog, safe-area padding, back/notification buttons, React Compiler ON, and Firebase Local-First.
- **No runtime blur/gradient animation**. Asset preparation script: `scripts/appearance/generate_hero_reading_veil.py` (Pillow + NumPy needed only to regenerate PNGs; never used by Android builds).
- **Regression gate**: `scripts/tests/release/test-appearance3-hero-reading-veil.cjs` is run by Build & Share.

## Visual review

Inspect the four palettes in light **and** dark mode, including Home, Cây nhà, Lịch, Kỷ niệm, and a compact child page. Check short/long subtitle, Android system fontScale, and 100%/140%/160% in-app fontSize. Verify that the right-hand art and bottom fog remain visible and the header does not display a white rectangle. Test theme switching without tapping cards and after force-close/reopen.

A programmatic sampling of all 48 combinations (six hero illustrations × four themes × light/dark) produced minimum **5.46:1** contrast for the approximate subtitle region tested on source images at 400×300, before lower-edge fog. This is an image-level approximation, **not** a guarantee for every actual line position, screen dimension or device, and not an APK validation.

## Release status

Trial only. Source-code and asset tests should pass before Android build. No Windows Build & Share or on-device Release APK test is claimed in this report.
