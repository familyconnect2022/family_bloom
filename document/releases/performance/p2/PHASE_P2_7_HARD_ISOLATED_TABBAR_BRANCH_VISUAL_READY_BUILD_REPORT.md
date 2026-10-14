# Family Bloom — Performance Architecture P2.7
## Hard-Isolated TabBar + Branch Visual-Ready

**Build date:** 2026-10-11 (Asia/Ho_Chi_Minh)  
**Baseline:** P2.6 Interaction + Event Detail + Moments Scroll Polish

## Why P2.7 exists

Real-device validation of P2.6 showed two remaining architecture-level problems:

1. The tab pill was smoother after distance-aware timing, but still had a small hitch because the visual custom tabbar was still rendered as `Tabs.tabBar`. A route-state commit could therefore reach the same React/native commit window while the pill was moving.
2. A large genealogy Focus Branch could dismiss its preparing state before the graph had actually painted. Its close animation also intentionally scaled the whole focus card to zero, which produced the visible shrinking white rectangle on Back. Large/high branches exposed this more often because they require more graph work than small/lower branches.

P2.7 removes those two source causes rather than increasing animation durations again.

## 1. Hard-isolated persistent tabbar

### New boundary

`src/app/(tabs)/_layout.tsx` now separates navigation control from visual chrome:

- `PersistentBloomTabBarHost` is a sibling overlay of `<Tabs>` and stays mounted for the tab workspace lifetime.
- `Tabs.tabBar` renders only `TabNavigatorControllerBridge`, which returns `null` and owns no native view.
- `PersistentTabBarController` keeps the latest navigator state/navigation object behind an imperative boundary.
- A route commit sends only a tiny index signal to existing SharedValues/refs; it does not set React state in the visual tabbar.

### Pill/scene handoff

For a user tab press:

1. `onPressIn` starts the pill/icon response immediately through Reanimated SharedValues.
2. Motion duration remains distance-aware (164–278 ms).
3. The destination navigator commit is scheduled after the pill completes (+8 ms handoff margin), so the heavy scene commit cannot compete with the pill mid-flight.
4. A generation token cancels stale queued commits during rapid multi-tab tapping (latest request wins).
5. A prevented `tabPress` animates the pill back to the committed index.
6. Feature lifecycle `restoreFocus()` is deferred beyond the visual handoff.

The visual bar uses `renderToHardwareTextureAndroid` so the small bottom chrome is composited independently from heavy tab scenes.

### Preserved behavior

- `detachInactiveScreens={false}`
- `freezeOnBlur: true`
- `lazy: true`
- P2.5 active-first startup + idle hidden-tab preload
- P2.4 persistent/frozen tab surfaces
- Single icon per tab and 50x36 pill geometry
- Existing Chess full-surface tabbar hiding behavior

## 2. Genealogy Focus Branch visual-ready contract

### Data-ready is no longer visual-ready

`src/components/familyGraph/FamilyGraphPrototype.tsx` now exposes `onVisualReady` for an isolated Focus Branch child.

The preparing shield remains above the graph until all of the following are true:

1. branch data exists;
2. the child viewport has a non-zero layout;
3. the initial camera/auto-fit has been applied;
4. progressive mounting has reached the complete branch population;
5. two `requestAnimationFrame` presentation opportunities have passed after that final commit.

Only then does the graph crossfade in.

### Large branches

Focus Overlay no longer bypasses the existing progressive full-tree scheduler. Large/high branches therefore mount in bounded batches behind the preparing shield instead of attempting one large synchronous mount.

### Stale work protection

- Every Focus Branch session carries a `requestId`.
- The child graph key includes that request id, forcing clean per-session readiness refs.
- Close increments the request generation before exit starts.
- Late branch extraction/paint callbacks from an older or closing session are rejected.
- Switching branch A -> B resets visual readiness and preparing progress.

### Rectangle removal

The old close path used `scale: progress`, eventually scaling the entire 80% focus card to `0`. P2.7 removes that behavior.

The focus card now remains near full scale (`0.985 -> 1`) and closes with a 185 ms fade/tiny offset. The native overlay is unmounted only after the exit completes. This directly removes the shrinking rectangular card seen in the device video.

## 3. Regression-gate migration

Several historical gates encoded the *old implementation shape* rather than the preserved behavior (for example, requiring `useSharedValue(state.index)` inside `Tabs.tabBar`). Those gates were updated to recognize P2.7 as an approved successor while still asserting their original invariants.

Updated compatibility gates include:

- Phase 16B17 tab SharedValue check
- Phase 17.8D / 17.8E tab navigation/chrome checks
- Phase 17.9A17 / A18 tabbar checks
- P1 / P1.1 / P1.2 tab surface checks
- P2.3 / P2.4 performance architecture checks

No game rules, Firestore rules/indexes, or server behavior were changed for P2.7.

## 4. Verification

### P2.7 dedicated gate

- `test-phase-p2_7-hard-isolated-tabbar-branch-visual-ready.js`: **35/35 PASS**
- Whole `src` transpile inside that gate: **322 TS/TSX files PASS**

### Key migrated gates

- Phase 17.8D Shared Event Store + UI-thread Navigation: **52/52 PASS**
- Phase 17.8E Icon-only UI-thread Tab Bar: **39/39 PASS**
- Phase 17.9A17 Native-Persistent Tabbar: **33/33 PASS**
- Phase 17.9A18 Single-Icon Tabbar: **15/15 PASS**
- Phase 16B17 Away Timeout + Tab SharedValue: **38/38 PASS**
- Chess current aggregate: **20/20 gate groups PASS**
- Phase 17 Five-Tab Runtime Lifecycle: **56/56 PASS**
- Phase 17.1 Tab-Switch Hotfix: **41/41 PASS**
- Phase 16B Xiangqi Playable Logic: **28/28 PASS**
- Release Readiness: **11/11 PASS**

### Copy-over chain

The exact Node gate sequence invoked by `Family_Bloom_CLEAN_APPLY_FULL.bat` was executed in two runs because the execution environment capped a single long command. The first **32/38** scripts passed before that command timeout; the remaining **6/6** scripts were then executed directly and all passed. There was no test failure at the split.

Result: **38/38 updater gate scripts PASS**.

### Packaging safeguards

- Root `.gitignore` retained.
- `Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` retained and relabeled P2.7.
- `Family_Bloom_CLEAN_APPLY_FULL.bat` runs the P2.7 gate in addition to inherited gates.
- Root cleanup/updater BATs are Windows CRLF.
- P2.6 historical reports and earlier architecture reports are retained in the FULL package.

## 5. Real-device acceptance targets

Static/transpile/regression gates verify the intended code paths, but the original symptoms are visual frame-timing issues and must still be accepted on the user's Android device.

Priority checks:

1. Home/first tab <-> last tab repeated jumps: pill should not hitch mid-flight; scene handoff follows pill completion.
2. Adjacent tab jumps: still quick and responsive.
3. Highest/largest genealogy branch: preparing state remains until the graph is actually visible; no blank branch reveal.
4. Back/swipe Back from heavy branch: no shrinking white rectangle.
5. Rapid tab taps and rapid branch open/switch/close: no stale scene or stale branch wins later.

P2.7 intentionally addresses the implementation sources observed in the supplied recordings; it does **not** claim final real-device acceptance until those scenarios are retested on the target device.
