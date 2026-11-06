# Phase 14V.3K — Chess Hybrid Instant Motion

## Goal
Keep the board feeling immediate without reintroducing the A → B → A rollback jitter seen in device video.

## Final motion contract
- Tap-to-move is validated immediately on-device against the current local `legalMoves` snapshot.
- An illegal destination never starts a piece animation and is not treated as a visual move.
- A locally legal move starts the 145ms native-driver slide immediately; it does not wait for the Socket.IO round trip.
- The server remains authoritative. Every command still carries `expectedRevision`, and the accepted `ChessGameState` is the state committed under the animation overlay.
- If the animation reaches B before ACK/socket confirmation, the overlay stays at B and waits. It never animates backward.
- Either the socket state or the ACK may confirm the move. The first authoritative confirmation wins; the duplicate is harmless.
- Newer bot/opponent states stay queued by revision until the current visual move settles.
- A rare rejection/state conflict uses a short whole-board fade to the latest authoritative state. There is no B → A piece animation.
- Promotion now uses the same hybrid path: choose Q/R/B/N locally, animate immediately, then reconcile authoritatively.

## Preserved behavior
- Phase 14V.3I Bot Anytime remains: bot games/rematches are allowed after 22:00; human-vs-human quiet hours remain.
- Phase 14V.3G WebP default pieces remain.
- Phase 14V.3H visual-state locking, revision queueing, duplicate-state guards, reconnect snap behavior, server-authoritative clocks/results and FX timing remain.

## Regression gate
Run:

```bash
npm run phase14v3k:check
```

The Android Debug and Release helper scripts run this gate automatically after the legacy no-rollback gate.
