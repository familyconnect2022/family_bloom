# Family Bloom P2.15.3 — Runtime Ownership + Persistent Root Focus + Audio Warm

Date: 2026-10-13
Baseline: P2.15.2 FULL CODE

## Scope

This checkpoint closes the three real-device regressions still coupled through presentation/runtime lifecycle:

1. Family Graph Focus was fast for the first visits but repeated close/reopen could stall on Android native Modal attach/detach.
2. Xiangqi could remain on its route shell while the persistent board surface disappeared.
3. Chess physical-board audio could be silent for the first moves and then replay stale/duplicate cues later.

## Family Graph Focus

- Focus no longer creates a React Native `Modal` for each visit.
- Added `familyGraphFocusSurfaceStore.ts`, a data-only external store with route-owner identity.
- Added one process-persistent `FamilyGraphFocusSurfaceHost` in `BloomSurfaceStack`'s canonical modal layer.
- Hidden Focus uses opacity/pointer-events only; its prepared BSH graph subtree remains mounted for hot revisit.
- Detail -> Focus publishes Focus immediately underneath the native Person sheet; `onDismiss` now performs Detail cleanup only and never gates Focus attachment.
- Cold Focus still paints shell/loading before graph hydration and retains cancel-first Back behavior.
- Route/unmount explicitly releases the root Focus owner, preventing stale callbacks from another graph instance.

## Xiangqi ownership

- `XiangqiSurfaceHost` no longer hides presentation when `user` or `activeFamilyId` is transiently unavailable.
- Identity changes may reset socket/game data only; they cannot release route presentation ownership.
- Route cleanup now requires `hideXiangqiSurface(ownerId)`.
- Intentional Chess -> Xiangqi arbitration uses explicit `forceHideChessSurface()` / `forceHideXiangqiSurface()` APIs.
- Stale route cleanup remains protected by the shared board-game owner-token guard.

## Chess / board-game audio

- The exact 11 supplied MP3 cues remain the only native board sound bank.
- The shared audio bank now starts warming after app first paint (`backgroundWarmReady`), before either game route is entered.
- A cue that cannot start within 260 ms is discarded instead of being queued and replayed late.
- Replay still uses request-token ownership and `seekTo(0)` before subsequent plays.
- Chess local/server move dedupe by `clientMoveId`, semantic fallback dedupe, castle recognition (`flags` + SAN), and finished-state terminal fallback remain intact.

## Verification

Current source verification after the architecture change:

- P2.11.3 Focus cancel-first: 31/31 PASS
- P2.11.4 retained chunks: 40/40 PASS
- P2.12.1 successor handoff: 15/15 PASS
- P2.12.2 root surface stack: 15/15 PASS
- P2.12.3 successor Focus recovery: 23/23 PASS
- P2.13: 44/44 PASS
- P2.14: 50/50 PASS
- P2.15: 65/65 PASS
- P2.15.1: 26/26 PASS
- P2.15.2: 30/30 PASS
- P2.15.3: 40/40 PASS
- Chess A9: 44/44 PASS
- Shared board-game A15: 27/27 PASS
- Xiangqi Phase16B: 29/29 PASS
- Current Chess aggregate: 21/21 PASS
- Exact supplied audio integrity: 11/11 files, 60,419 bytes PASS
- Project structure: 18/18 PASS
- Windows BAT/build-entrypoint audit: 22 BAT files PASS

Real-device validation is still required for the user-observed timing/audio/presentation regressions; these gates verify architecture, packaging and regression contracts, not physical-device behavior.
