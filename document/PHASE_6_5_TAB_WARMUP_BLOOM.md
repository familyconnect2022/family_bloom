# Phase 6.5 — Tab warmup and Bloom tab bar (cumulative hotfix 2)

Base: main 646457dbb0883fd849211695b082f43cf4631787. Includes the previous Moments spacing/tab-switch hotfix. OPEN / AWAITING DEVICE TEST.

The user reports initial tab visits stutter and subsequent visits improve. The navigator uses default lazy mounting: each screen's first mount, effects and native views are deferred until selected. This is a source-confirmed source of first-visit work; a device frame trace is still needed to quantify the remaining stalls.

Changes:
- Keep the first render lazy, then enable mounting one tab at a time after a 700 ms quiet period and an idle callback. No forced idle timeout; busy frames may postpone preparation. Do not navigate, change tab selection or history.
- Cancel queued work on pathname change, background and unmount. Resume only remaining tabs while the app is active on a main tab. Opening another stack screen pauses preparation.
- Warm tabs stay mounted under the navigator's existing lifecycle. This trades some earlier memory use and reads for faster subsequent visits. A tap before preparation completes can still incur first-mount work. This does not guarantee zero startup latency.
- Replace the default tab press component with TouchableOpacity: gentle opacity feedback, no Android gray ripple. Remove tab-bar elevation/shadow; use a white-pink surface, rose labels and a pale pink selected-icon pill. Preserve navigator-provided press/long-press handlers, accessibility props and safe-area spacing.
- Retain the previous 16-point Person padding, calendar query reuse, deferred Moment realtime work and memoized media grid.

Validation: test-tabWarmup PASS (idle scheduling, one tab per turn, cancellation including late callbacks, resume and completion); phase2-static-check PASS (127 TS/TSX); test-familyGraphPhase65 PASS; git diff --check PASS. No full typecheck/native build/device frame profiling or on-device visual verification was available.

Apply: extract the cumulative ZIP into the project root, replacing matching files. Restart/reload the app. No dependencies, Firebase Rules, Functions or native code changed; no additional deployment is needed.

Device check:
1. Close/reopen the app; let Home settle for roughly 4–6 seconds, then visit the five tabs. Compare with tapping immediately after launch (preparation may not have finished).
2. Repeat rapid switches after tabs have opened. Verify calendar state, Moments comments/reactions, image viewer and Person links.
3. Background during initial preparation, resume and switch tabs. Open a Person/profile screen during preparation and return. Verify no unexpected navigation.
4. Check pink selected-pill, no gray ripple/shadow, readable labels and safe-area spacing with Android gesture/three-button navigation and larger text.

Reference: https://docs.expo.dev/router/advanced/tabs/ and https://reactnavigation.org/docs/bottom-tab-navigator/#lazy
