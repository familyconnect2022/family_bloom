# Phase 14V.4 — Chess Renderer V2 + Minimal Realtime Protocol

## Status

IMPLEMENTED / AWAITING REAL-DEVICE TEST.

This phase replaces the old Chess board motion renderer at runtime. Historical Phase 14V.3H/J/K/L/M/N/N1 files and scripts remain in the repository only as history; Android build helpers now validate the V2 gate instead of those superseded motion gates.

## Runtime architecture

### Client board

`ChessBoard` now uses a persistent layered renderer:

- `SquareLayer`: 64 static squares / hit targets.
- `HighlightLayer`: 64 static highlight slots driven by Reanimated SharedValues.
- `HintLayer`: 64 static legal-move slots driven by two 32-bit move masks and two 32-bit capture masks.
- `PieceLayer`: persistent absolute-position pieces with stable piece ids.
- `ChessPiece`: Reanimated shared `x/y/opacity/scale` + Gesture Handler.

No React state is used merely to change selected-square, legal-move, capture, last-move, check, or premove visual markers.

### Local interaction

- `chess.js` remains on the JS thread and is called only when selection / attempted move changes.
- Tap-to-move and drag-to-move share the same move-attempt path.
- Illegal tap: piece never leaves its square.
- Illegal drag: piece returns to origin with a short `withTiming` animation (`95ms`).
- Legal local move: visual motion starts without waiting for network ACK.
- Server reject/conflict: clear transient hints and authoritative snapshot resync with short board crossfade; no default B→A reverse rollback animation.
- Drag-frame updates change only Reanimated SharedValues; there is no React setter in the pan `onUpdate` path.

### Visual hint masks

Logical square index is orientation-independent:

- `a8 = 0`
- `h8 = 7`
- `a1 = 56`
- `h1 = 63`

Masks:

- `legalMoveLow/high`
- `captureLow/high`

Capture classification uses chess.js move semantics (`c` capture and `e` en-passant) rather than target occupancy alone. Promotion variants collapse naturally to one destination bit.

### Persistent pieces

- Piece components use stable ids rather than square keys.
- Local WebP assets are bundled and rendered with React Native `Image`.
- No image fetch occurs per move.
- Piece layer and piece native views opt out of collapsing.
- Normal move animates one persistent piece.
- Capture fades the captured persistent piece.
- En-passant fades the pawn on the actual captured square.
- Castling animates king and rook in the same visual transaction.
- Promotion swaps only the promoted piece sprite.
- Resize/orientation derives new x/y from logical square and repositions existing piece controllers; it does not rebuild the board position.

## Realtime protocol V2

### Client → server move command

Only command data is sent:

- `gameId`
- `from`
- `to`
- optional `promotion`
- `clientMoveId`
- `expectedVersion`

Client does not send FEN, PGN, clocks, legal-move lists, pixel coordinates, board size, or orientation.

### Server → clients accepted move

Hot-path accepted moves use `chess:game:moveApplied` with a compact authoritative delta:

- ids/version/ply
- applied move metadata
- authoritative FEN after the move
- active turn
- authoritative clock snapshot
- check square
- game status/result fields when relevant

The server no longer sends PGN or full legal-move lists on each accepted move. Full client snapshots also strip internal PGN/legal-move data.

Human-v-human games do not enumerate the complete server legal-move list merely to build a client packet. The list remains available internally only for Bloom Bot games. Every submitted move is still independently validated by server chess.js.

### ACK

Move command ACK is intentionally small:

- `clientMoveId`
- authoritative accepted `version`
- optional duplicate flag

Board truth comes from the authoritative move-delta event.

## Packet order / duplicate safety

- Server game mutations remain serialized through the per-game queue.
- Client requires the next move delta to be exactly `currentRevision + 1`.
- Gap / out-of-order delta triggers full authoritative resync instead of applying speculative animation.
- Hook keeps a bounded 16-delta local buffer so multiple Socket.IO events arriving inside one React batch are not collapsed into only the latest visual event.
- Visual animation queue processes deltas sequentially.

## Persistence

Realtime move transport remains Socket.IO.

Normal accepted moves are no longer persisted to Firestore one write per move. The server checkpoints periodically (`CHECKPOINT_EVERY_PLY`) and persists terminal games / important state mutations. Server restart recovery continues to restore durable state and pause an active recovered game until both players return.

## V1 retirement

There is no runtime switch back to the old ChessBoard motion renderer. Phase 14V.4 is the only renderer path used by the game screen.

Old motion regression scripts remain historical references but are intentionally removed from Android build gating because their required implementation strings describe the retired renderer. Phase 14V.4 replaces their authority.

## Validation

New gate:

`npm run phase14v4:check`

It validates renderer, masks, shared-value-only selection/hints, local move behavior, persistent piece identity, orientation/resize policy, packet minimization, ordered delta buffering, authoritative server validation, checkpoint policy, and Android build integration.

At implementation time the gate passes 37/37 checks before final packaging. Core pre-V2 functional gates (Phase 14U, 14V, 14V.1, 14V.2, 14V.2A/B/C/D, and Bot Anytime) are retained; static expectations that specifically required the retired renderer/protocol were updated or superseded rather than treated as runtime requirements.

## Device test focus

1. Start with FX OFF.
2. Drag pieces continuously; verify the piece follows the finger without board repaint hitch.
3. Drop onto an illegal square; verify ~95ms return to origin.
4. Tap own pieces quickly; verify dots/rings swap instantly without board flash.
5. Test captures, en-passant, both castlings, promotion, Black orientation, and resize if available.
6. Play against Bloom Bot for rapid alternating moves; verify no missing or overlapping piece animation.
7. Toggle FX ON only after base motion is confirmed smooth.
8. Background/foreground the app and verify authoritative resync.

## Deployment requirement

V2 changes both client and server protocol. Deploy the V2 Render server and rebuild/install the V2 Android client as one compatible pair. Do not evaluate V2 motion against the old Render server because the old server does not emit the V2 move-delta protocol.
