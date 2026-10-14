# Family Bloom Performance Architecture P2.15.2

## Goal
Close the long-running Focus reopen and Chess audio regressions without adding new UI scope.

## Family Graph Focus
- Focus shell still opens before graph hydration.
- Back cancels scheduled presentation work immediately.
- Focus branch construction now projects from the already-hydrated Full Tree BSH scene instead of recomputing branch layout and connector routing.
- Projection filters immutable people, connections, geometry and routing maps by the selected branch and keeps the same precomputed coordinates.
- The expensive `buildFamilyGraphLayout` / `buildFamilyGraphGeometry` path is bypassed for Focus whenever the Full Tree scene is available.
- Completed projected scenes remain revision-key cached for hot revisit.
- This removes the multi-second synchronous Geometry job that could continue after Back and block the second Focus open.

## Chess audio
- Keeps the exact 11 original MP3 assets under `assets/audio/board-game/`.
- Short-cue replay no longer decides restart from Expo Audio `currentTime` snapshots.
- First cue plays directly; every replay explicitly `seekTo(0)` and only plays after the rewind resolves.
- Newest-request token still owns async rewind/play continuation.
- Semantic duplicate guard supplements `clientMoveId` dedupe for optimistic + authoritative/replay packets.
- Castling is recognized by chess.js flags and SAN (`O-O`, `O-O-O`, optional check/mate suffix).
- Challenge acceptance no longer replays the game-start cue; the authoritative waiting -> active transition owns it once.
- Terminal sound uses final-piece landing as preferred cadence plus authoritative `state.status === finished` fallback for resignation, timeout, away-timeout, reconnect recovery or interrupted final animation.
- Terminal cue is exactly-once per game.

## Xiangqi / inherited runtime
No new Xiangqi behavior was added in this phase. Historical regression gates were updated to accept the already-approved persistent-surface successor: direct 32-piece render (no staged 8/18/26/32 paint) and owner-token route lifecycle.

## Verification
Relevant source-tree gates passed before packaging:
- P2.11.3 Cancel-first Focus: 31/31
- P2.11.4 Retained Chunks: 40/40
- P2.12.3 Focus Native Modal Recovery: 23/23
- P2.13 Focus/Audio/Xiangqi Runtime: 44/44
- P2.14 Focus Revision Cache + Exact Audio + Xiangqi Owner: 50/50
- P2.15 Stability + Instant Interaction: 65/65
- P2.15.1 Focus Shell First + Copy-over Integrity: 26/26
- P2.15.2 Focus Reopen + Chess Audio Final: 30/30
- Phase 17.9A9 Chess lifecycle/mini/premove: 44/44
- Phase 17.9A15 Shared Board Game: 27/27
- Phase 16B Xiangqi playable: 29/29
- Phase 16B.14 current persistent lifecycle: 53/53
- Phase 16B.18 current successor: 21/21
- Phase 17.9A17 current successor: 33/33
- Current Chess aggregate: 21/21

Final ZIP must be extracted and the critical gates rerun on the extracted copy before release.
