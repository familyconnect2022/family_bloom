# Family Bloom · Phase 11 Final Performance Gate

Checkpoint date: 2026-09-27

## Goal

Reduce real-device manual work at the end of Phase 11. The tester presses one button in Performance Lab and Bloom automatically runs a deterministic rendering matrix, then returns with a strict PASS / WARNING / FAIL report.

## Automated matrix

- Family Graph real render with synthetic RAM-only data: 50 / 100 / 200 / 300 / 500 Person.
- Stress render: Moments, Timeline, Planner/Event and Memory Book at 100 and 200 rows.
- Every stress screen waits for first paint + initial visible batch, performs a real jump-to-end, records the next frame, then advances automatically.
- A JS event-loop probe runs across the whole matrix and records p95, max stall and count >=100ms.
- Existing listener and runtime-mount instrumentation is included in the final regression evaluator.
- Each step has a timeout so a broken render cannot leave the runner stuck forever.

## Safety

The Final Performance Gate itself is RAM-only. It does not write Firebase, does not upload Cloudinary media, does not switch the user's active Family, and does not bypass Auth or Security Rules. The separate 11.2B Firebase E2E/notification probe remains available as its own tool and is not invoked by this performance gate.

## How to run

Open Performance Lab and press `Chạy Final Performance Gate`. Do not touch the phone while the matrix is running. Bloom will navigate through the synthetic screens and return to Performance Lab automatically. Copy `Final Gate report` and send it for regression review.

## Final-gate completeness

A report cannot be PASS if Graph 50/100/200/300/500 coverage is incomplete, any of the eight stress cases is missing, the JS probe does not finish, or any automated step times out/fails.

## Scope limitation

The runner intentionally does not automatically switch real user Families. Real Family switching mutates user state and may open live listeners/data, so it stays outside the unattended RAM-only gate. Existing family-switch instrumentation still records metrics during normal use, and a short real-device smoke check can be kept for major release checkpoints.
