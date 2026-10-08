# Family Bloom — Phase 17.5
## Guided Manual Performance Sweep

**Base:** Phase 17.4A Workspace First Navigation Hotfix  
**Delivery:** COPY-OVER FULL CODE  
**Date:** 2026-10-07

## Why this phase exists

Real-device evidence from Phase 17.2–17.4A showed that forcing Expo Router to move through the whole app was the unstable part of the performance harness. The measurement instrumentation itself was useful, but automatic production-route navigation repeatedly failed at bootstrap or Step 1.

Phase 17.5 removes automatic navigation for every real app screen. The tester owns navigation; Bloom only observes the current pathname and measures when the requested screen is actually visible.

## Guided runner contract

For each real route:

1. HUD shows the requested screen and expected pathname.
2. Tester manually opens that screen using the normal app UI.
3. Waiting time is not included in performance metrics.
4. When pathname matches, Bloom starts the measurement window.
5. Two paint boundaries are observed, then a short dwell captures asynchronous work/listeners/React commits.
6. Result is committed and HUD advances to the next instruction.

No route timeout runs while waiting for the tester. A route watchdog starts only after the expected route is reached and measurement has begun.

The HUD exposes **Bỏ qua bước này** if a route is unavailable or intentionally skipped.

## 42-step matrix preserved

- 29 real signed-in app routes — guided/manual navigation.
- 5 RAM-only Family Graph sizes — 50 / 100 / 200 / 300 / 500.
- 8 RAM-only list stress steps — Moments / Timeline / Events / Memory Book × 100 / 200.

Total: **42 steps**.

The RAM-only synthetic tail remains automated because it does not depend on production-route navigation and does not write Firebase.

## HUD groups

- A · 5 TAB CHÍNH
- B · CORE & CÂY NHÀ
- C · NHÀ MÌNH & REALTIME
- D · GRAPH RAM
- E · STRESS RAM

HUD clearly shows expected route, current route, waiting time, measurement time, completed count, FAIL/WARN/SKIP counts and progress.

## Important measurement change

User search/navigation time is excluded. `stepStartedAt` begins only after route match, and route first-usable duration is measured from route arrival to the second stable paint boundary.

This makes the result describe screen/render work instead of how quickly the tester can find a menu item.

## Retired architecture

Current build scripts no longer execute the superseded Phase 17.3B–17.3E automatic-navigation gates. Those scripts remain in source history, but the current contract is Guided Manual Sweep.

Phase 17.4 and 17.4A gates were converted to compatibility guards that explicitly reject automatic Step-1 navigation.

## Validation

Final static/regression results:

- Phase 17 lifecycle: **56/56 PASS**
- Phase 17.1 tab-switch: **40/40 PASS**
- Phase 17.2 runner compatibility: **42/42 PASS**
- Phase 17.4 compatibility: **13/13 PASS**
- Phase 17.4A retired-auto-nav guard: **9/9 PASS**
- Phase 17.5 Guided Manual Performance: **30/30 PASS**
- Phase 15B: **35/35 PASS**
- Phase 15B.1: **12/12 PASS**
- Phase 15B.2: **13/13 PASS**
- Phase 15B.3: **19/19 PASS**
- Xiangqi playable: **26/26 PASS**
- Current Chess aggregate: **16/16 gate groups PASS**
- Release readiness: **11/11 PASS**
- Changed TypeScript/TSX transpile diagnostics: **PASS**

## Device acceptance

For the fastest acceptance test:

1. Open **Nhà Mình**.
2. Tap **3 bước thử**.
3. HUD must show `Bước 1/3 · Tab · Trang nhà` and `CHỜ BẠN` while current path is `/play`.
4. Manually tap **Trang nhà**.
5. HUD must change to `✓ Đúng màn · Bloom đang đo`, commit Step 1, then ask for Kỷ niệm.
6. Manually tap **Kỷ niệm**, then **Lịch**.
7. Smoke run should finish 3/3 without any `NAV_SENT` for those real routes.

Only after smoke3 succeeds should the full **42 bước guided** run be used.

## Deployment

No Render server change.  
No Firestore Rules/index change.  
Chess/Xiangqi gameplay source remains protected by the existing regression gates.
