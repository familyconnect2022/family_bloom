# Family Bloom — Phase 17.2 Performance Runner Recovery

**Base:** Phase 17.1 Tab-Switch Hotfix  
**Protected game baseline:** Phase 16B.18  
**Date:** 2026-10-06

## Goal

Recover the 42-step app-wide Performance Lab from the real-device failure where a run could remain at `0/42` with only “Đang mở bài kiểm tra đầu tiên…”. The new runner must expose exactly where it is waiting and must not let one bad route silently hang the complete sweep.

## Runner architecture

One root-level `AppWidePerformanceDriver` owns all sweep navigation. `PerformanceTestScreen` only starts state. The service now exposes an explicit state machine:

`LEAVING_LAB → NAVIGATING → ARRIVED → SETTLING → DWELLING → ADVANCING`

Synthetic steps use:

`NAVIGATING → SYNTHETIC → ADVANCING`

Terminal states are `COMPLETE` and `ABORTED`.

Every meaningful transition writes a bounded `FB_PERF_RUNNER` event with step, phase, pathname and detail.

## Progressive test modes

- `smoke3`: first three real routes only.
- `tabs5`: five main tabs only.
- `full`: all 42 steps.

The full matrix remains 29 real/read-only production routes, five RAM-only Family Graph sizes (50/100/200/300/500), and eight RAM-only long-list stress steps (100/200 across Moments, Timeline, Events and Memory Book).

## Explicit route handshake

A real route step now records:

1. `STEP_STARTED`
2. `NAV_SENT`
3. `ROUTE_MATCH`
4. `FRAME_1`
5. `FRAME_2`
6. dwell/observation window
7. `STEP_COMMITTED`

The Lab-exit bootstrap is also acknowledged separately through `LAB_EXIT_REQUESTED` and `LAB_EXITED`.

## Watchdogs

- Bootstrap watchdog: if the runner cannot leave Performance Lab, the run aborts with `BOOTSTRAP_TIMEOUT` rather than staying at 0/42 indefinitely.
- Per-step watchdog: a route/synthetic step that cannot complete records an explicit `WATCHDOG_TIMEOUT`. A route timeout is committed as FAIL and advances instead of hanging the whole run.

## On-device HUD

The DEV-only floating HUD is `pointerEvents="none"` and shows:

- run mode;
- step X/N and step label;
- Vietnamese phase label plus machine phase;
- expected/actual pathname;
- last ACK;
- navigation attempt count;
- live step elapsed and phase elapsed;
- watchdog time remaining;
- completed/FAIL/WARN counts.

A low-frequency 500 ms diagnostic heartbeat updates only HUD timing text; it is not a dependency of the navigation-owner effect.

## Lab report

When the run returns to Performance Lab it shows:

- current/terminal runner state;
- expected/actual route;
- last ACK and error;
- last eight runner events;
- per-step PASS/WARNING/FAIL and duration;
- route p95;
- event-loop p95/max;
- listener peak;
- mount peak;
- five slowest routes.

“Copy full report” also includes the complete bounded runner event log.

## Windows/ADB support

`Family_Bloom_Phase15B_Performance_Run.ps1` accepts `full`, `tabs5`, or `smoke3` mode and captures both `FB_PERF_SWEEP` and `FB_PERF_RUNNER` markers. It continues to sample native Android PSS and saves gfxinfo framestats/final meminfo.

## Safety

The sweep preserves app-wide no-write behavior. Synthetic data remains RAM-only. Phase 17.2 does not change Chess/Xiangqi gameplay, Render server code, Firestore rules, or Firestore indexes.

## Static validation

- Phase 17 lifecycle: 56/56 PASS
- Phase 17.1 tab-switch hotfix: 40/40 PASS
- Phase 17.2 runner recovery: 42/42 PASS
- Phase 15B app-wide diagnostic compatibility: 35/35 PASS
- Phase 15B.1 progress driver: 12/12 PASS
- Phase 15B.2 liveness: 12/12 PASS
- Phase 15B.3 state machine/layering: 18/18 PASS
- Phase 16B Xiangqi playable: 26/26 PASS
- Current Chess aggregate: 16/16 gate groups PASS
- Release readiness: 11/11 PASS

These are code/static gates, not physical Android acceptance.

## Required Android acceptance

1. `smoke3` must complete 3/3 and return to the Lab.
2. `tabs5` must complete 5/5 and return to the Lab.
3. `full` must progress through all 42 steps, recording FAIL rather than silently hanging if an individual route is unhealthy.
