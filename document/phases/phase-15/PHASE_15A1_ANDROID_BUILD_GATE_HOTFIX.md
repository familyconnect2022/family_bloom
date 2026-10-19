# Phase 15A.1 — Android Build Gate Hotfix

Date: 2026-10-04
Baseline: Phase 15A FULL, preserving Chess V4P runtime behavior.

## Symptom

Android Debug build stopped during `phase14v1:check` with two failures:

- old capture FX expectation (`MỘT ĐÒN NẶNG!` / every capture),
- old production A/B FX switch expectation.

Those assertions belonged to earlier Chess phases and conflict with the current production behavior:

- V4K intentionally filters normal captures and only surfaces meaningful material swings,
- V4L removed Hint/Motion/FX test toggles from the production UI,
- V4J/P superseded the old static hint / renderer architecture.

Continuing the old Debug gate chain also exposed later historical gates that still expected static 64-slot hints, old scale motion, old diagnostics placement, and other superseded renderer details.

## Fix

1. Added `npm run chess:current-check`.
2. Android Debug and Release helpers now call this single current Chess aggregate gate instead of accumulating historical renderer gates.
3. The aggregate validates the current architecture only:
   - Phase 14U authoritative core,
   - Phase 14V family policy,
   - V1 global presence with current Material Swing FX semantics,
   - V2 Bloom Bot with fixed 120 ms diagnostic delay,
   - V2A/V2B auth + cold-start presence,
   - V3I Bot-anytime policy,
   - V4A capture type safety,
   - V4J sparse hints / visual commit,
   - V4K Material Swing FX,
   - V4L production UI / promotion,
   - V4M result / fixed Bot delay,
   - V4O coordinate spaces,
   - V4P board-local overlay host.
4. Updated still-relevant historical gates (V1/V2/V2A/V2B/V3I/14U) so they accept being invoked through the aggregate build gate.
5. Updated V1 assertions for current capture FX behavior and production-no-test-toggle behavior.
6. Updated V2 assertions for the fixed 120 ms Bot delay and warm Bloom Bot UI copy.
7. Updated V3I rematch copy expectation to current `Chơi ván mới / Hẹn từ 06:00` wording.
8. Obsolete renderer gates remain in the repository for historical investigation, but no longer block Android builds.

## Verification

- Debug/Release build helpers reference `chess:current-check`: PASS.
- Stale build references to `phase14v4`, `phase14v4e`, `phase14v4f`, `phase14v4g`: none.
- Current Chess aggregate: 14/14 gate groups PASS.
- Phase 15A gate: 30/30 PASS.
- Release readiness: 11/11 PASS.
- Phase 14N: 13/13 PASS.
- Time Capsule/Fund/Games gates in the Android static chain: PASS.
- TS/TSX syntax: 258/258 PASS.
- Relative import resolution: 0 broken.

## Runtime scope

This hotfix does **not** change Chess gameplay, board input, server authority, Hint, Motion, Material Swing FX, promotion, result overlay, or the fixed Bloom Bot 120 ms test delay. It only aligns the Android build validation pipeline with the current codebase.
