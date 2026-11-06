# Family Bloom — Phase 17.5A
## Manual Confirm Performance Sweep

**Base:** Phase 17.5 Guided Manual Performance Sweep  
**Delivery:** COPY-OVER FULL CODE  
**Date:** 2026-10-07

## Why this hotfix exists

Real-device testing of Phase 17.5 showed that manual navigation itself was acceptable, but the runner still depended on `usePathname()` to decide that the tester had reached the requested screen. On the Android navigation tree used by Family Bloom, the root observer could remain on a stale pathname even after the tester changed tab/screen. The run therefore stayed at `WAITING_FOR_USER` even though the requested screen had already been opened.

Phase 17.5A removes pathname matching as a hard gate for all 29 real app routes.

## New acceptance contract

For every real app screen:

1. HUD names the screen to open.
2. Tester navigates there normally.
3. A screen-local HUD is rendered **inside the active screen surface**.
4. Tester taps **TÔI ĐÃ MỞ ĐÚNG MÀN · ĐO MÀN NÀY**.
5. Bloom records `MANUAL_CONFIRM` and starts the measurement clock at that moment.
6. Bloom waits two paint frames, then observes the configured dwell window.
7. Step result is committed automatically and the next instruction appears.

`Expected` and `Current` pathnames remain visible only as diagnostics. A mismatch does not block measurement.

## Why the HUD moved inside screens

The old root-level HUD was a sibling of the native Stack. On Android, native-stack surfaces can sit above sibling React views regardless of React `zIndex`, so the HUD could be hidden behind the active route.

Phase 17.5A mounts `GuidedPerformanceOverlay` from both standard screen wrappers:

- `ScreenContainer`
- `BloomKeyboardScreen`

All 29 production routes in the current performance matrix use one of these wrappers. This keeps the confirmation control on the screen the tester is actually viewing.

## Measurement ownership

Real-route measurement is now service-owned after explicit confirmation:

`MANUAL_CONFIRM → FRAME_1 → FRAME_2 → DWELLING → STEP_COMMITTED`

The service itself schedules the two `requestAnimationFrame` boundaries and dwell completion, so measurement no longer depends on a separate Root Driver render after confirmation.

The Root Driver remains mounted only for:

- arming the current real-route step;
- automated RAM-only Graph/stress routes after the 29 real routes;
- completion of the run.

For real routes it no longer owns visible HUD, pathname matching, or frame/dwell timing.

## 42-step matrix unchanged

- 29 real signed-in app routes — manual navigation + explicit confirmation.
- 5 RAM-only Family Graph sizes — 50 / 100 / 200 / 300 / 500.
- 8 RAM-only list stress steps — Moments / Timeline / Events / Memory Book × 100 / 200.

Total: **42 steps**.

## Fast device acceptance

Start with **3 bước thử** only:

1. Nhà Mình → tap **3 bước thử**.
2. HUD requests **Trang nhà**.
3. Manually open Trang nhà.
4. On Trang nhà, tap **TÔI ĐÃ MỞ ĐÚNG MÀN · ĐO MÀN NÀY**.
5. Wait roughly one second; HUD should advance to **Kỷ niệm**.
6. Open Kỷ niệm and confirm again.
7. Open Lịch and confirm again.
8. Smoke run should finish **3/3**.

No `NAV_SENT` is expected for these three real routes. `Current pathname` is diagnostic only.

## Validation

Final static/regression results:

- Phase 17 lifecycle: **56/56 PASS**
- Phase 17.1 tab-switch: **40/40 PASS**
- Phase 17.2 runner compatibility: **43/43 PASS**
- Phase 17.4 compatibility: **13/13 PASS**
- Phase 17.4A retired-auto-nav guard: **9/9 PASS**
- Phase 17.5 compatibility: **32/32 PASS**
- Phase 17.5A Manual Confirm Performance: **22/22 PASS**
- Phase 15B: **35/35 PASS**
- Phase 15B.1: **12/12 PASS**
- Phase 15B.2: **13/13 PASS**
- Phase 15B.3: **19/19 PASS**
- Xiangqi playable: **26/26 PASS**
- Current Chess aggregate: **16/16 gate groups PASS**
- Release readiness: **11/11 PASS**
- Changed TypeScript/TSX transpile diagnostics: **PASS**

## Deployment

No Render server change.  
No Firestore Rules/index change.  
Chess/Xiangqi gameplay files are unchanged from Phase 17.5.
