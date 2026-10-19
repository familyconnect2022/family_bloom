# Phase 15B.2 — App-wide Performance Runner Liveness Hotfix

## Symptom on device
Phase 15B displayed `Đang chạy bước 1/42…` in Performance Lab but stayed on the same screen and never advanced.

## Root cause
Phase 15B.1 started the sweep and then issued `router.dismissAll()` while the global driver could simultaneously react to the same external service update and issue its own route navigation. On Android/Expo Router those two imperative navigation actions could race, leaving Performance Lab as the visible route. The service state was running, so the local counter showed 1/42, but route arrival/settle callbacks never executed.

The driver also used an ad-hoc emitter + forceRender subscription. It normally works, but it is weaker than React's external-store contract for state that lives outside React during native navigation transitions.

## Fix
- Manual and deep-link starts now use exactly one atomic navigation action: `router.dismissTo(firstRoute)`.
  - If the requested first tab already exists in stack history, Expo Router unwinds to it.
  - Otherwise the current screen is replaced with that route.
- `AppWidePerformanceDriver` now subscribes with `useSyncExternalStore` and a monotonically increasing service revision.
- Service subscriber cleanup now returns `void` explicitly.
- Added an independent hard watchdog for each route/Graph/stress step so a broken benchmark cannot remain stuck forever.
- Added `[FB_PERF_DRIVER] ACTIVE ...` liveness markers to device logs.
- Added Phase 15B.2 build gate to Debug and Release scripts.

## Expected device behavior
After tapping `Kiểm tra toàn app tự động`, Performance Lab must leave immediately and the app must begin navigating through the real route matrix. The run should not remain parked at 1/42. If an individual route cannot complete, watchdog marks that step failed and allows the sweep to continue.

## Verification
- Phase 15B.2 gate: 10/10 PASS
- Phase 15B.1 gate: 10/10 PASS
- Phase 15B: 33/33 PASS
- Phase 15A: 30/30 PASS
- Phase 15A.4: 10/10 PASS
- Phase 15A.6: 14/14 PASS
- Current Chess aggregate: 13/13 PASS
- Release readiness: 11/11 PASS
- Phase 14N: 13/13 PASS
- Phase 14Q: 34/34 PASS
- Phase 14R.5A: 30/30 PASS
- Phase 14S.1: 51/51 PASS
- Phase 14T: 44/44 PASS
- TS/TSX syntax: 251/251 PASS
- Import/asset resolution: 1126/1126 PASS

## Runtime note
This hotfix changes only the internal performance diagnostic flow. Production behavior, Chess gameplay, Firebase rules, and user data flows are unchanged.
