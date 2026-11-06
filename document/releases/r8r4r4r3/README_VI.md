# Family Bloom R8R4R4R3 · Welcome native window + section-specific hero art

Base: complete R8R4R4R2 Android source; only Android UI changed. Build Android identity/versionCode unchanged. No Web, Firebase security rules, server, or chess logic changes.

## P0 welcome

- Video `68812.mp4` shows an inert envelope. The old `WelcomeModal` was an absolutely positioned sibling over a Native Stack; on Android such an overlay can paint without receiving the native touch stream.
- Welcome now uses `react-native` `Modal` as an independent foreground native window and a full-window `Pressable` on the sealed envelope. On press-down it visibly moves to `opening`, preserves a 2600ms watchdog, and opens the unchanged 14-paragraph reader. The hardware back action does not bypass this gate.
- Static + simulated JS tests pass, but a real phone must verify the native window interaction. Do not claim actual touch repair from a mock alone.

## Distinct hero art

- Previous 24 PNGs used the Home cottage as background in other sections, with symbols superimposed. This was not the approved design.
- Home unchanged. Family / Moments / Learning / Events / Settings now use **five genuinely separate illustrated compositions** per section, each with four color variants and an RGBA fade at the bottom. The updated thumbnail placeholders match each scene/theme.
- This new art is a **source-generated, vector/paper-cut concept set**, not the final high-detail painterly images from the mockup; user visual approval remains pending. Generator source is bundled for design iteration. Do not claim 90% fidelity.
- Child pages still inherit section art via `BloomHeroHeader`; unchanged navigation, game Full/Mini boards, and media upload logic.

## Required on-phone test

1. Clear/open app normally, sign in with a known verified profile + family, tap *anywhere* on envelope: expect immediate opening feedback and scrollable letter (not exit/reopen).
2. Tap *Bước vào mái nhà Family Bloom*: Home opens without flashing a white screen or skipping a missing profile; repeat on a second account.
3. Check all five distinct main scenes with Rose/Garden/Heritage/Midnight and light/dark modes; ensure image/selection match, text stays readable, no lag.
4. Test tabbar dragging/snap, native Chess/Xiangqi, Moments uploads/cancel, Settings cache and Auto Update after source backup.

## Constraints

- Tests are source/static/mock only; actual Gradle build and Windows BAT execution not performed here. Preserve original app and `.env` before applying.
