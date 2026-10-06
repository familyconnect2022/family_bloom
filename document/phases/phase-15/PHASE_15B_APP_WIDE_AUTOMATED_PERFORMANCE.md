# Phase 15B — App-wide Automated Performance Diagnostic

Baseline: Phase 15A.6 (Chess board-anchored window portal)

## Goal

Create one automated diagnostic run that measures the signed-in Family Bloom app end-to-end without asking the tester to create large Firestore datasets or manually visit every feature.

Phase 15B is diagnostic instrumentation only. It does not intentionally change product behavior or optimize a bottleneck yet. The report from a real Android device becomes the input for the next optimization pass.

## One run = 42 automated steps

### 29 real app routes

The sweep opens real production screens with the current signed-in account and active family:

1. Trang nhà
2. Kỷ niệm
3. Lịch
4. Cây nhà
5. Nhà Mình
6. Chuyện trong nhà
7. Cài đặt nhắc chuyện
8. Hồ sơ
9. Dòng thời gian gia đình
10. Chọn mái nhà
11. Các mái nhà của tôi
12. Cổng gia đình
13. Lời mời vào nhà
14. Cây gia đình thật
15. Đề xuất Cây nhà
16. Chăm sóc Cây nhà
17. Kỷ yếu gia đình
18. Lời thì thầm
19. Cùng quyết định
20. Bếp Nhà Mình
21. Hộp thời gian
22. Soạn Hộp thời gian
23. Trò chơi Nhà Mình
24. Tạo trò chơi
25. Quỹ gia đình
26. Bảng tin Nhà Mình
27. Sảnh Cờ vua
28. Lịch sử Cờ vua
29. Trò chuyện

Login/OTP/create-profile and routes requiring a concrete dynamic entity id are intentionally excluded from the signed-in sweep. Those flows need a different session state or a selected entity and would make the performance result non-deterministic.

### 13 RAM-only synthetic steps

- Family Graph: 50 / 100 / 200 / 300 / 500 Person.
- Moments: 100 / 200.
- Family Timeline: 100 / 200.
- Events: 100 / 200.
- Memory Book: 100 / 200.

The synthetic matrix never writes generated test data to Firestore.

## Read-only / no-write contract

While the real-route sweep is active, `appWidePerformanceService.isNoWriteMode()` is true. The harness never presses create/edit/delete actions.

Known maintenance writes that could normally happen just by opening a screen are suppressed during the sweep:

- Whisper expiry cleanup.
- Poll expiry cleanup.
- Family Fund initial-control initialization.
- Notification mark-all-seen.
- Family Gateway approved-request auto-switch.

This protects the user's real family data while still measuring real queries/listeners/rendering.

## Metrics collected automatically

### App / navigation

- JS session → app ready context.
- First usable frame per route (navigation request → two stable animation frames).
- Route p95.
- Five slowest real screens.
- Per-step PASS / WARNING / FAIL.

The observation dwell after first usable frame is deliberately excluded from route latency. It exists only to observe async Firestore/listener/React work.

### React / JS

- React Profiler commit count per route.
- Total React actual duration per route.
- Worst React commit per route.
- Normalized event-loop delay p50/p95/max.
- Event-loop stalls >=100 ms and >=500 ms.
- Sampling coverage.

### Runtime lifecycle

- Active listener count.
- Peak listener count.
- Duplicate listener names.
- Active runtime mounts.
- Peak runtime mounts.

### Memory

If Hermes exposes `performance.memory`, Phase 15B records JS heap. Many React Native/Hermes builds do not expose that API, so the Windows runner also samples real Android process PSS with ADB.

## Android one-click runner

Run:

`scripts/android/Family_Bloom_Phase15B_Performance_Run.bat`

Requirements:

- Debug build installed.
- User already signed in and has an active family.
- USB debugging authorized.
- Metro reachable if this is a Metro-backed debug build.

The runner:

1. force-stops Family Bloom for a cleaner launch reference;
2. resets Android `gfxinfo`;
3. opens `familybloom://performance-test?autoStart=1`;
4. Phase 15B starts without a screen tap;
5. samples `dumpsys meminfo com.familybloom.android` every 2 seconds;
6. waits for `[FB_PERF_SWEEP] COMPLETE` / `ABORT`;
7. saves native diagnostics under `reports/device/phase15b-<timestamp>/`.

Generated files include:

- `PHASE_15B_NATIVE_SUMMARY.txt`
- `phase15b-native-memory.csv`
- `phase15b-markers.txt`
- `gfxinfo-framestats.txt`
- `meminfo-final.txt`
- `logcat.txt`
- `launch.txt`

## In-app run

Open Nhà Mình → Phòng đo hiệu năng and press **Kiểm tra toàn app tự động** once. Leave the phone untouched until Bloom returns to the Performance Lab.

The final card shows:

- overall verdict;
- real-route PASS/WARNING/FAIL counts;
- synthetic PASS/FAIL counts;
- startup context;
- route p95;
- JS event-loop p95/max;
- listener/mount peaks;
- five slowest routes.

Use **Sao chép báo cáo Phase 15B** to copy the full report.

## Initial guardrails

Real-route verdicts are diagnostic, not release policy yet:

- FAIL: first usable frame > 3000 ms, worst React commit > 220 ms, or >=3 duplicate listener names.
- WARNING: first usable frame > 1600 ms, worst React commit > 120 ms, or any duplicate listener.
- PASS: below those limits.

App-wide event-loop scoring uses stress-friendly thresholds because the same run intentionally includes Graph 500 and long-list pressure:

- PASS: p95 <= 500 ms and max <= 1800 ms.
- WARNING: p95 <= 900 ms and max <= 3000 ms.
- FAIL: above those limits.

The next optimization phase should use the measured real-device baseline rather than tightening thresholds before data exists.

## Regression protection

`npm run phase15b:check` verifies the Phase 15B contract and is called by both canonical Android Debug and Release build pipelines.

Current static verification at packaging time:

- Phase 15B: 33/33 PASS.
- Phase 15A: 30/30 PASS.
- Phase 15A.4: 10/10 PASS.
- Phase 15A.6: 14/14 PASS.
- Release readiness: 11/11 PASS.
- Current Chess aggregate: 13/13 PASS.
- Phase 11 Final Performance Gate contract: PASS.
- TS/TSX syntax: 251/251 PASS.
- Relative/alias/asset resolution: 1124/1124 PASS.

A full TypeScript typecheck is not claimed in this source-only package because dependencies/node_modules are intentionally not bundled with the FULL ZIP.
