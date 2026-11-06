# Family Bloom Phase 16B — Xiangqi Playable V1 + Performance/Chess Layer Hotfix

Baseline: Phase 16A.2 precise safe-crop full source.

## Xiangqi playable V1
- Keeps the approved 14 production WebP assets and safe padding manifest.
- Enlarges the Xiangqi display box to 1.5x board intersection spacing (bounded at 82px).
- Replaces the old gallery-first screen with a chess-like playable game screen.
- Adds Bloom Bot local play and a 10:00 local clock per side.
- Active clock uses solid Bloom fill with white digits; inactive clock stays light.
- Adds local Xiangqi rules engine separated from React UI so it can later move to/shared with the realtime server.
- Implemented V1 rules: palace general/advisor, flying generals, elephant river/eye, horse leg, cannon screen capture, chariot lines, soldier river behavior, self-check filtering, check/checkmate/stalemate, resignation and timeout.
- Bloom Bot only selects from generated legal moves.

This phase is local-authoritative for device testing. Realtime Socket.IO/server authority is intentionally deferred to the shared realtime game core phase.

## Chess Android board-layer hotfix
Observed on Android: a solid #C98BA7 layer could cover the complete 8x8 board while the surrounding Chess screen remained alive.

Root cause risk: internal full-board transparent planes used Android `elevation`, including boardBorder and PieceLayer. Android elevation creates native compositing surfaces; combined with clipping/Animated.View this can rasterize a transparent full-size plane as the parent board background.

Fix:
- Internal Chess planes now use zIndex only.
- square/visual/highlight/hint/interaction/piece/border planes explicitly use transparent backgrounds.
- PieceLayer no longer creates an elevated native surface.
- Only the outer board shell retains elevation for the board shadow.

## Phase 15B performance start hotfix
- A new run clears the previous hard watchdog, route and synthetic state before reset.
- Performance Lab starts with exactly one deterministic `router.replace(firstRoute)` action.
- Removes the Android stack-shape dependency of `dismissAll()` that could leave the Lab visible while the driver waited below it.

## Active Android build gates
- Phase 16A.2 safe approved assets gate.
- Phase 16B playable/rules/performance/chess-layer gate.
- Historical Phase 16A gallery-only gate remains in source for history but no longer blocks Debug/Release.

## Verification
- Phase 16B: 27/27 PASS
- Phase 16A.2 safe assets: 12/12 PASS
- Current Chess aggregate: 13/13 PASS
- Phase 15B.3 state machine: 19/19 PASS
- Phase 14T Games: 44/44 PASS
- Phase 15A structure/UI: 30/30 PASS
- Release readiness: 11/11 PASS
- TS/TSX syntax: 257/257 PASS
- Local import/asset resolution: 1154/1154 PASS
