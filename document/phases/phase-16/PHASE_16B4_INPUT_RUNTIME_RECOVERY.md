# Phase 16B.4 — Chess/Xiangqi Input + Performance Runner Recovery

Date: 2026-10-05
Base: `FAMILY_BLOOM_PHASE_16B1_CHESS_PERF_XIANGQI_HOTFIX_FULL_2026-10-05.zip`

## Device regressions addressed

1. Chess: tapping a piece could be observed by both the piece gesture and the full-board interaction gesture. The same finger-up could therefore select and immediately re-process the same square, making selection appear dead or causing duplicate move attempts.
2. Xiangqi: the Phase 16B.1 React Native `Pressable` interaction overlay was unreliable inside the Android `ScrollView`, so pieces could not be selected/moved on device.
3. Phase 15B app-wide performance sweep: the Lab screen and global runner both participated in bootstrap navigation. On Android the screen-level replace could be dropped and the run remained at `[FB_PERF_SWEEP] START ... steps=42` without `DRIVER_READY`.

## Implementation

### Chess
- Added one centralized `handleSquareTap` state machine for both piece hits and board-square hits.
- Added a 120 ms same-square native event dedupe window to prevent one Android finger-up from being handled twice.
- Tapping the already-selected source is idempotent.
- Tapping another friendly piece switches selection instead of executing an illegal move.
- Enemy/empty destination taps still enter the existing authoritative attempt/premove path.
- Drag remains independent and continues to use RNGH Pan + server-authoritative move submission.

### Xiangqi
- Removed the full-board React Native `Pressable` overlay.
- Restored `GestureHandlerRootView` + `GestureDetector` + native `Gesture.Tap()`.
- Tap coordinates are mapped to the nearest 9×10 intersection with an intersection-distance guard.
- Preserved the approved 1.3× piece display box, capped at 72 px.
- Existing local legal-move engine, check filtering, Bloom Bot, clocks, resign and reset flows are unchanged.

### Performance runner
- The Performance Lab now only calls `appWidePerformanceService.start()`.
- `AppWidePerformanceDriver` is the single bootstrap navigation owner.
- Bootstrap prefers `dismissAll()` to return to the already-mounted Tabs tree, then uses bounded physical `/(tabs)/play` retries when necessary.
- Added explicit `[FB_PERF_DRIVER] BOOTSTRAP` liveness logs.
- Added a 5.2 s fail-safe so a runner can no longer hang forever before `DRIVER_READY`.

## Native/backend impact

- No Firebase Rules changes.
- No Render/Chess server changes.
- No dependency/native module changes.
- A Metro reload/cache clear is sufficient for an already-installed development build.
