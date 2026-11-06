# Phase 15B.1 — App-wide Performance Progress Driver Hotfix

## Why
On-device testing of Phase 15B could remain visibly parked on Performance Lab with the completed-step counter not moving. The first transition depended on the global sibling driver observing the same service start event; the UI also displayed the zero-based `currentStep`, which made the first active step look like `0/42`.

## Fix
- Manual start and deep-link auto-start now force an immediate route-context change.
  - When Performance Lab was pushed from the existing app, `router.dismissAll()` reuses the existing Tabs navigator.
  - Direct deep-links without a dismissable stack fall back to `router.replace(firstRoute)`.
- The global `AppWidePerformanceDriver` continues the remaining 42-step sweep.
- A lightweight, pointer-events-none progress HUD is rendered above every tested route while the sweep is active.
  - Shows `Bước X/42`.
  - Shows the current step label.
  - Shows `Đã xong Y/42` and a progress rail.
- The HUD is mounted outside the navigation React Profiler subtree so its own per-step re-renders are not counted as the tested route's React commits.
- Performance Lab's button uses one-based active-step copy instead of showing `0/42` for the first step.
- Debug and Release build helpers now run `phase15b1:check`.

## Expected on-device behavior
1. Open Performance Lab and tap **Kiểm tra toàn app tự động**.
2. The lab should immediately leave the foreground and reuse the existing app navigation tree.
3. A small Bloom Performance HUD should appear over the tested screen with `Bước 1/42` and `Đã xong 0/42`.
4. The route label and completed count should advance automatically.
5. After route sweep + RAM-only synthetic matrix finish, Bloom returns to Performance Lab with the report.

## Verification
- Phase 15B.1 gate: 10/10 PASS
- Phase 15B gate: 33/33 PASS
- Phase 15A: 30/30 PASS
- Phase 15A.4: 10/10 PASS
- Phase 15A.6: 14/14 PASS
- Current Chess aggregate: 13/13 PASS
- Release readiness: 11/11 PASS
- TS/TSX syntax: 251/251 PASS
- Relative/alias import + asset resolution: 1088 checked / 0 broken
