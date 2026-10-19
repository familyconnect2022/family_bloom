# Family Bloom — Phase 17.5B

## Persistent Guided HUD

Phase 17.5A proved that manual confirmation is the right orchestration model, but an Android Native Stack transition could leave the newly focused screen with an old HUD snapshot. The visible control could therefore disappear after leaving Performance Lab.

17.5B keeps the measurement service unchanged and fixes only presentation ownership:

- `(tabs)/_layout.tsx` owns one persistent HUD for `/`, `/moments`, `/planner`, `/family`, `/play`.
- `ScreenContainer` and `BloomKeyboardScreen` own the HUD for Root Stack/detail surfaces.
- `GuidedPerformanceOverlay` has explicit `tabs`/`screen` hosts and only the host that owns the current pathname renders.
- `useFocusEffect` re-reads the singleton performance session every time the active surface regains focus.
- Pathname remains advisory; the tester still explicitly confirms each real-route measurement.

This removes the need for auto-navigation and prevents guided controls from disappearing on Back/tab transitions.
