# Family Bloom R8R4R4 — Theme Cohesion / 24 Hero Scenes

## Baseline
FULL source integrates R8R4R2 + R8R4R3. The 92-screen JSON and approved Chess pawn/Xiangqi general remain authoritative. Scope: Android only; no Web, Render, or Vercel changes.

## Implemented
- 24 bundled PNG illustrations (six content areas × Rose/Garden/Heritage/Midnight) in `assets/images/storybook/heroes/v2` with a transparent lower edge. The files are adapted visual assets, not photographs.
- `src/theme/storybookHeroRegistry.ts` is the sole static Metro require registry, also used by the appearance picker for previews. Switching theme changes artwork and page tokens together.
- Main page variants map Home → home, Family/Tree/Profile → family, Moments → moments, Play/Study → learning, Events/Kitchen → events, Settings → settings. Compact child pages inherit their relevant scene; other variants have a safe Home fallback.
- Home feature artwork uses the same theme-aware registry; transparent/white decorations and Hub card accents were converted to semantic tokens. Study editor/lesson/question-detail highlights use theme tokens.
- Full and Mini Chess/Xiangqi and their game rules were not edited; approved pawn/general assets are unchanged.
- Kept Auth/Welcome and gesture routing logic from R8R4R3 unchanged.

## Quality limitations and deferred items
- 24 assets are artistically adapted from the already-approved Home artwork with section-specific overlays. They are working assets, **not yet 90% fidelity verified against the user's screen mockups**; visual approval and final artist-created distinct scene illustrations remain necessary.
- No Android APK was built. Static TS/TSX transpilation and source-only tests cannot establish on-device contrast, screen-reader behavior, tab gesture smoothness, or correctness of Firestore deployment.
- RGB/hex literals inside user-media dimming, scene-specific Time Capsule, native board squares and pieces were not blindly replaced. Toast status colors retain their error/success meanings.
- Some standalone feature panels with local styles require visual QA at all four themes and both display modes. Complete 92/92 screenshot QA has not happened; treat this as a theme-cohesion release, not full visual completion.

## Required on-device regression
1. Switch Rose→Garden→Heritage→Midnight on Home and confirm the sky/flowers and bottom backgrounds match; repeat Light/Dark/System.
2. Open theme Settings and verify thumbnails match each theme in actual Home.
3. Visit Family, Moments, Play/Learning, Planner/Events, Settings and child routes; confirm cropped hero alignment and fade, rotation and 160% font.
4. Inspect error/info/success toasts, input focus rings, modal overlays, dialog buttons and video/photo viewer.
5. Ensure Home→Welcome gate, image/avatar upload and cancellation, Chess/Xiangqi Full/Mini/premove/reconnect remain functional.
6. Measure tap→content latency and drag tabbar motion on actual Android hardware.

## Upgrade
Extract source ZIP to a distinct folder, run `Family_Bloom_AUTO_UPDATE_FULL.bat`, then build/share; do not copy overlays by hand. The updater preflight recognizes R8R4R1/R8R4R2/R8R4R3 or another protected baseline, preserves `.env` and prevents downgrade by Android versionCode. Leave Google credentials out of the ZIP.
