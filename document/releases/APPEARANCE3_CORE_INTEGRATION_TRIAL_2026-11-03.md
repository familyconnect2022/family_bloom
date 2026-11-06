# Family Bloom — Appearance 3.0 Core Integration (Android trial)

## Baseline and rollback

Based on `Family_Bloom_APPEARANCE3_COLD_START_FIX_COMPILER_ON_FULL_CODE_TRIAL_2026-11-03.zip` after the Same APK A/B Lab and Cold Start patch. Keep that original ZIP as a rollback baseline. This is a **pilot integration**, not an all-screens theme migration or a certified Android Release.

## Changes

- `BloomText` and `BloomScaledInput` now subscribe to the **immutable typography snapshot** and optionally the current color snapshot, using values in React render. Legacy `createBloomStyles` declarations retain their *original* font size in the typography registry, preventing a stale pre-scaled style from holding a prior selection. New `appearanceRole` / `appearanceTone` opt-in props provide semantic text styles.
- `BloomCard`, `BloomActionCard`, `BloomButton`, `BloomTextInput`, `BloomConfirmDialog`, `BloomConfirmModal`, common page headers and `BloomHeroHeader` consume reactive color/typography directly rather than relying only on a discarded revision hook. Input focus state and draft remain native and stable.
- Introduces `/(internal)/appearance3-core-preview`, accessible from developer Appearance 3.0 Lab. This preview uses the *real* product components, not the sandbox copies. It shows the LIVE account theme and includes explicit RAM-only preview controls (palette, display mode, font, scale), restoring the original snapshot when leaving the route. It does not persist those preview selections.
- Preserves the previous Lab A/B, Cold Start cache gate, Firestore Rules, Auth, game, media upload and Web source. `app.json` still has `reactCompiler: true`.
- Adds a core integration source gate to the Android Release Build & Share launcher; updates two older test contracts to recognize reactive snapshots rather than requiring legacy revision hooks.

## Scope boundaries

- The `COLORS` Proxy and legacy `createBloomStyles` remain for unmigrated screens. New code paths use explicit snapshot values, but a complete migration of every old screen and custom inline color is **not** claimed.
- Production Android build/runtime, actual React Compiler transform output and FPS/battery measurements have **not** been verified in the source inspection environment.
- Android's user font-scale accessibility behavior remains enabled; don't equate a single user font slider percentage with the complete system pixel size.

## How to test

1. Apply the matching safe patch to an unchanged Cold Start Lab source copy; never use Full Auto Update to install this pilot patch.
2. Run `node scripts/tests/release/test-appearance3-core-integration.cjs` and `node scripts/tests/release/test-r3r3d7r2r3r3r1-hook-safety.cjs` before building.
3. Build Release APK using the existing Build & Share launcher. Keep the prior APK / ZIP as rollback.
4. With the verified developer account, open **Cài đặt → Dev Tools → Appearance 3.0 Lab → Core Preview**. Test Rose/Garden/Heritage/Midnight, light/dark, fonts, fontScale 90–160% while viewing real cards, text, input, buttons, modals and header.
5. Force-close/reopen ten times; verify the account's LIVE appearance matches its saved local cache, no default Rose flash, and input/modal work without state loss.
6. Compare JS frame/interaction latency with previous A/B Lab. Static passes do not establish native performance parity.

## Risk and rollback

If the safe installer rejects a file hash, stop: it means your project is not the exact baseline or was locally edited. Do **not** force copy. To revert, use the rollback BAT bundled with the safe patch, or restore the source backup made before applying. Neither helper touches Firebase data or phone SQLite.
