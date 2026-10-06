# Phase 16B.8 — Build Report

## Baseline

Family Bloom Phase 16B.7 FULL, with Chess client restored from the archived Phase 14V4K FULL checkpoint.

## Chess restore verification

- Phase 16B.8 hard-restore gate: 22 PASS / 0 FAIL.
- Current Chess aggregate: 9 / 9 suites PASS.
- V4J sparse hint + visual commit: 17 / 17 PASS.
- V4K material swing FX: 11 / 11 PASS.
- Phase 14U authoritative Chess core: 54 / 54 PASS.
- Phase 14V family game policy: 26 / 26 PASS.
- Phase 14V.2 Bloom Bot: 40 / 40 PASS.
- Phase 14V.2A auth diagnostics: 13 / 13 PASS.
- Phase 14V.2B cold-start presence: 18 / 18 PASS.
- Phase 14V.4A capture type safety: 9 / 9 PASS.

## Performance / Xiangqi regression gates

- Phase 15B: 33 / 33 PASS.
- Phase 15B.3: 18 / 18 PASS.
- Phase 16B.1: 17 / 17 PASS.
- Phase 16A.2: 12 / 12 PASS.
- Phase 16B Xiangqi playable logic: 26 / 26 PASS.

## Other regression gates sampled in this build

- Release readiness: 11 / 11 PASS.
- Phase 15A structure/UI: 30 / 30 PASS.
- Phase 15A.4: 10 / 10 PASS.
- Phase 15B.1: 10 / 10 PASS.
- Phase 15B.2: 10 / 10 PASS.
- Phase 14N: 13 / 13 PASS.
- Phase 14T: 44 / 44 PASS.
- Phase 14T.0A: 21 / 21 PASS.
- Phase 14R / Fund / Time Capsule / Whisper current gates sampled: PASS.

## Syntax / import verification

All restored Chess TS/TSX files transpile without syntax diagnostics.
Every relative import in the grouped Chess game route resolves in the current tree.

## Copy-over simulation

A simulated `16B.7 old project + 16B.8 FULL overlay` retained the old `ChessPromotionOverlay.tsx` and `ChessResultToast.tsx` until cleanup, as expected.
Running the new cleanup removed those leftovers and legacy route duplicates, after which:

- Phase 16B.8: 22 / 22 PASS.
- Phase 15B.3: 18 / 18 PASS.

This validates the intended FULL-over-old workflow.

## Device status

Static/source verification cannot substitute for Android native hit-testing.
The device acceptance test remains:

1. select `d2` and tap `d4`;
2. select `e2` and tap `e4`;
3. test drag/drop;
4. test one capture;
5. test promotion using the restored inline V4K chooser;
6. confirm Bloom Bot replies against the unchanged V4M Render server.
