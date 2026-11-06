# Family Bloom P2.34 — Session/Presentation Bridge + Stacked Game Views

Date: 2026-10-17
Base: P2.33 Persistent Full/Mini Presentation Foundation

## Fixed root cause

P2.33 kept realtime protocol and persistent presentation deliberately separate. A Bloom Bot challenge could therefore create an authoritative server game while the persistent Full Surface stayed IDLE.

P2.34 adds a small root-owned bridge:

- Chess `gameState` -> Chess presentation.
- Xiangqi `gameState` -> Xiangqi presentation.
- only `waiting`, `active`, and `paused` states bring Full on-screen.
- terminal states close only when both game kind and `gameId` match the currently bound presentation.
- terminal move deltas (for example checkmate/general-capture moves) also close the matching presentation, because those finishes can arrive on the hot-path delta event rather than a full state event.
- Accept/Recover ACKs also feed the same state-to-presentation functions as an authoritative fallback.

The games still keep separate socket transports, state types, and mappers. No shared Chess/Xiangqi gameplay state machine was introduced.

## Full Surface visual structure

The root Full Surface remains 85% of the device window and persistent/off-screen parked when hidden.

Inside it are now two always-mounted siblings:

- Chess view: absolute, centered, 90% x 90% of Full Surface, deep pink `#D94F87`.
- Xiangqi view: absolute, centered, 90% x 90% of Full Surface, deep gold `#D3A11F`.

Both occupy the same rectangle and overlap. Selection changes only opacity, z-index, elevation, and pointer-events. Neither view is recreated when switching presentation kind.

Mini remains a persistent separate root sibling and inherits the active game's color.

## Session safety

`boardGamePresentationStore` now carries `activeGameId` in addition to active kind/mode/content selectors. This lets terminal events use `closeBoardGamePresentationForGame(kind, gameId)` so delayed packets from an old game cannot close a newer presentation.

Close still resets active kind, active game id, Full content, Mini content, and mode to the canonical IDLE snapshot in one publication.

## Developer Bloom Bot flow

The Bot test does not open a Surface merely because the invitation ACK succeeds. Outgoing challenges wait for the server's actual `gameState` event. Accept and Recover already receive an authoritative state in their ACK, so they immediately feed that state into the same bridge mapper as a fallback.

## Delivery helpers

The FULL package includes:

- `scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat`
- `eas.json` with `family-bloom-test` internal Android APK profile
- `scripts/android/eas/Family_Bloom_EAS_UPDATE_TEST.bat`

The OTA BAT prompts interactively for the update message. The existing baseline still does not include an OTA dependency/config migration in this phase; the helper keeps its own readiness checks rather than silently changing native/update configuration as part of the Surface fix.
