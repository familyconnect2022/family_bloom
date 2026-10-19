# Family Bloom — P2.4 Frozen Tab Surfaces / Hard Render Isolation

Date: 2026-10-10
Baseline: P2.3 Zero-Work Tab Press
Scope: Android performance architecture only. No Firestore rules/index changes. No Render server protocol changes.

## Goal

Make tab switching behave like a surface handoff rather than a React-tree wake-up. The five main tab surfaces keep their state/native tree, but inactive tabs stop participating in React rendering. The tab press path remains UI-thread-first and feature work resumes only after the target surface is visible.

## Root causes found during audit

1. All five tab surfaces were eagerly mounted (`lazy:false`, `detachInactiveScreens:false`) but inactive screens were not hard-frozen. Hidden subtrees could still receive Context/store changes and reconcile.
2. Each heavy tab screen called the tab runtime hook that owned `useFocusEffect`. This made navigation focus a dependency inside Home, Moments, Planner, Tree and Nhà Mình screen trees.
3. RootNavigator consumed `useSegments()`. Every child tab URL change could re-render the root navigator/Stack even though root auth/route gating only needs the top-level route decision.
4. Full-screen scene translation meant two expensive feature surfaces were composited during every tab transition. This amplified dropped-frame perception even after P2.3 moved navigation work off touch-down.
5. HomeMusicPlayer controls context recreated its value when high-frequency `currentTime` changed. Controls-only consumers could render for progress they did not use.
6. BloomSlidingTabBar subscribed to the whole Chess surface snapshot even though it only needs `mode` (`hidden/full/mini`).

## Implementation

### A. Hard-freeze inactive native tab surfaces

- Keep `lazy:false` so all five main surfaces are prepared once.
- Keep `detachInactiveScreens:false` so state/native trees are retained.
- Add `freezeOnBlur:true` to the tab screen options.
- Inactive screens retain state but stop React re-render work until focused again.

### B. Remove full-screen scene animation

- `BLOOM_MOTION.tabs.animation` is now `none`.
- Removed full-scene interpolator/transition spec from the main bottom-tab scene handoff.
- The tabbar keeps its small SharedValue indicator response; heavy feature scenes no longer translate together.

### C. Move navigation focus ownership out of heavy screens

- Added one small `TabNavigatorFocusBridge` in `(tabs)/_layout.tsx`.
- The five heavy tab screens no longer call `useTabRuntime()` / `useFocusEffect()`.
- TabRuntimeStore now tracks `navigatorFocused` separately from active tab id.
- When the entire Tabs navigator is covered by a transient route, all tab runtimes suspend without unmounting visual state.
- When the Tabs navigator becomes visible again, only the current tab is restored.

### D. Freeze Tabs workspace under transient routes

- Root Stack `(tabs)` screen uses `freezeOnBlur:true`.
- Opening Event detail, Member detail, Settings, editors, etc. freezes the underlying tab workspace rather than allowing it to reconcile during stack navigation.
- Persistent Chess surface remains outside the Stack and is not destroyed by this rule.

### E. Isolate root route churn

- Moved `useSegments()` and tab-startup route-gate logic into a tiny `RootRouteGate` sibling.
- RootNavigator/Stack no longer directly consumes child tab URL segments.
- Home → Moments → Planner path changes therefore do not directly rebuild the root Stack.

### F. Remove unnecessary high-frequency state propagation

- `HomeMusicPlayerControlsContext` now has a memoized stable value and is separated from high-frequency progress state.
- `BloomSlidingTabBar` now uses `useChessSurfaceMode()` rather than the full Chess surface store snapshot.

### G. Retire easy regression paths

- Main tab screens are gated against reintroducing screen-local navigation-focus hooks.
- P2.4 gate checks the single-focus-bridge ownership model, hard freeze, root route isolation, scene animation removal and fine-grained Chess/music selectors.
- CLEAN/APPLY, Android Debug and Android Release scripts all run the P2.4 gate.

## State intentionally retained

The following state is not removed because it is required for instant return and does not change on every tab press:

- Home scroll/widget snapshot.
- Moments feed entities, anchor/scroll position and cached media state.
- Planner month/selection/index state.
- Family Tree camera/layout/model caches.
- Nhà Mình local UI state.
- Auth/current family identity.
- Persistent Chess/Xiangqi model/socket state.

P2.4 freezes their hidden React presentation; it does not destroy durable feature state.

## State/work removed from the tab critical path

- Per-screen navigation focus subscriptions.
- Root Stack dependency on every child tab segment.
- Hidden-tab React reconciliation through native screen focus changes.
- Full-screen scene translation of two heavy feature trees.
- Music controls re-renders caused only by playback progress.
- Tabbar subscription to unrelated Chess surface fields.

## Regression / verification results on final source

- P2.4 Frozen Tab Surfaces: **41/41 PASS**
- P2.3 Zero-Work Tab Press: **23/23 PASS**
- P2.2 Provider Boundary Route Safety: **14/14 PASS**
- P2.1 Code Audit Fix: **32/32 PASS**
- P2 Ten Bottleneck Architecture: **49/49 PASS**
- P1 Android Performance Foundation: **32/32 PASS**
- P1.1 Native-feel Tab Surface: **25/25 PASS**
- P1.2 Opaque Surface Handoff: **26/26 PASS**
- Five-tab runtime lifecycle: **56/56 PASS**
- Tab-switch lifecycle successor gate: **41/41 PASS**
- Moments optimization: **42/42 PASS**
- Planner current optimization: **47/47 PASS**
- Planner 17.8A: **31/31 PASS**
- Planner 17.8B: **45/45 PASS**
- Planner 17.8C: **39/39 PASS**
- Planner 17.8D Shared Event: **52/52 PASS**
- Planner 17.8E Tabbar: **39/39 PASS**
- A17 Native Persistent Tabbar: **33/33 PASS**
- A18 Single-icon Tabbar: **15/15 PASS**
- Xiangqi playable: **28/28 PASS**
- Release Readiness: **11/11 PASS**
- Chess current-build aggregate: **20/20 groups PASS**
- Chess aggregate includes full TS/TSX transpile scan: **337 files**

## Windows copy-over safety

- Root update BATs use CRLF only.
- Android helper BATs use CRLF only.
- PRE-COPY and CLEAN/APPLY identify P2.4.
- P2.4 gate is wired into copy-over, Debug and Release flows.

## Expected device behavior

During main-tab switching:

1. Touch-down updates only the lightweight tab visual path.
2. Navigation selects the new native screen.
3. Inactive feature trees are frozen and retain their state.
4. No full-screen feature-scene translation is performed.
5. The new active surface restores live work after visibility is established.
6. Other hidden tabs do not wake simply because the tab index changed.

This phase intentionally prioritizes render isolation over decorative tab-scene animation. The visual tabbar indicator remains, while the expensive content surfaces behave like retained/frozen native surfaces.

## Device test checklist

1. Switch Home ↔ Moments repeatedly; verify no visual reset and no feed scroll reset.
2. Switch Moments ↔ Planner repeatedly; verify Planner month/selection remain stable.
3. Rapidly tap Home → Planner → Home → Tree; latest tap must win without blank/white frame.
4. Sweep all five tabs for 20–30 seconds; look for progressive lag or memory-related degradation.
5. Open Event detail, return to Planner; underlying tab should resume from the same state.
6. Open Member/Settings/detail routes and return; tabs underneath must not rebuild visibly.
7. Enter Chess, minimize/return/switch family as previously tested; persistent game surface must remain correct.
8. With music playback/progress active in a dev scenario, verify tabbar/other controls do not pulse-render with currentTime.

