# Phase 16B.1 — Chess board recovery + Performance runner + Xiangqi 1.3x

Date: 2026-10-05
Baseline: Phase 16B FULL

## 1. Chess board pink-cover regression

The pink full-board cover was introduced after Phase 15B.3 when ChessBoard was split into several full-size wrapper planes (`squarePlane`, `visualPlane`, `highlightPlane`, `interactionPlane`, `piecePlane`). On Android these overlapping full-board native/composited surfaces could rasterize the board backing color and cover both squares and pieces.

Phase 16B.1 restores the proven Phase 14V4P render tree:

- SquareLayer renders directly inside one clipped board surface.
- One visual `Animated.View` owns highlights, hints, interaction and pieces.
- PieceLayer returns to plain `StyleSheet.absoluteFill`.
- The extra elevated native layer on `boardSurface` is removed.
- Phase 15B.3 late-FEN PieceLayer self-heal is preserved.
- Phase 15A.6 board-anchored window portal for promotion/rematch is preserved.

## 2. App-wide Performance runner

Two startup/liveness issues were addressed:

- `runnerReady` was missing from the global driver's effect dependency list. The service could emit DRIVER_READY, render the HUD, but the effect would not continue step 1.
- The Performance Lab now escapes through the physical `/(tabs)` navigator instead of relying on a root public object href.
- A 450 ms Android escape watchdog retries `router.replace("/(tabs)")` only if the Lab is still visible and the active run has not acknowledged its runner yet.
- The step driver remains replace-only after startup, with a single `currentStep` source and existing hard per-step watchdogs.

## 3. Xiangqi playable V1

The local-authoritative Xiangqi V1 remains playable against Bloom Bot with:

- legal move generation and self-check filtering;
- general palace/flying-general rule;
- advisor palace rule;
- elephant river + elephant-eye rule;
- horse-leg rule;
- chariot/cannon/soldier movement;
- capture/check/checkmate/stalemate/resign/timeout;
- local 10-minute focused clocks;
- result modal + new game;
- approved 14 production WebP piece assets.

Piece display box is reduced from 1.5x to the user-approved **1.3x** (`Math.min(72, step * 1.3)`).

This phase does **not** require Chess server redeploy or Firestore rules deployment. Xiangqi is still local-authoritative for device testing; realtime/server authority is deferred to the shared realtime game-core phase.

## Verification

- Phase 16B.1: 15/15 PASS
- Phase 16B playable/logic: 26/26 PASS
- Phase 15B.3 state machine: 18/18 PASS
- Current Chess aggregate: 13/13 gate groups PASS
- Phase 16A.2 safe assets: 12/12 PASS
- Phase 14T Games: 44/44 PASS
- Phase 15A: 30/30 PASS
- Release readiness: 11/11 PASS
- TS/TSX syntax: 257/257 PASS
- Import/assets: 1154/1154 PASS
