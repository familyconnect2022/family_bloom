# Phase 14V.3J — Chess Server-First Motion

Baseline: Phase 14V.3I Chess Bloom Bot Anytime.

## Root cause fixed
The previous board moved a piece optimistically before the server ACK and used a 110 ms reverse animation when the ACK/state reconciliation did not match. On a fast bot this produced the visible A → B → A bounce.

## New motion contract
- Tap-to-move never starts an optimistic piece animation.
- The client sends the move intent and keeps the piece visually on its source square while awaiting the authoritative server result.
- A rejected/stale move does not move the piece and has no rollback animation.
- An accepted move is queued as an authoritative state and animates exactly once from source to destination.
- Socket and ACK copies of the same revision are de-duplicated.
- Fast subsequent bot/opponent positions queue by revision and play only after the current visual move settles.
- A reconnect/coalesced jump of more than one ply snaps safely rather than fabricating an animation against the wrong board.
- Destination FEN is committed under the moving overlay before the overlay is removed.

## Preserved
- Server-authoritative move validation and `expectedRevision` protocol.
- Native-driver piece movement.
- Phase 14V.3H visual state protections.
- Phase 14V.3I Bloom Bot 24/7 exception while human-vs-human quiet hours remain unchanged.
