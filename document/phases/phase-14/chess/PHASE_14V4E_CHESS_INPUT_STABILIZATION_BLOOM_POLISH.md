# Phase 14V.4E — Chess Input Stabilization + Bloom Polish

Base: Phase 14V.4D diagnostic interaction fix.

## Runtime changes

- Keeps a separate `interactionStateRef` representing the board position already visible to the user. Incoming network FEN/version may advance first, but local selection and `chess.js` validation do not switch to that future state until the matching visual move commits.
- Local-confirmed and remote-authoritative deltas advance the interaction state only at `authoritative_commit`. `expectedVersion` sent to the server is the same visual revision used by local validation; when network revision is ahead, input is locked as `VISUAL_CATCHUP_LOCK` until animation catches up.
- Drag release first accepts the exact legal square. Near a square border/corner it may magnetically resolve to the nearest **legal** chess.js destination within `0.56 * squareSize`; it never invents a non-legal move.
- Diagnostic RAM trace now exposes `drop_target`, `drop_target_adjusted`, and `input_blocked` so transient motion/pending locks are visible instead of looking like random ignored input.
- Piece art grows from `0.82 * squareSize` to `0.984 * squareSize` (~1.2x visual size) while the gesture/hit slot remains exactly one logical square.
- Board returns to Bloom blush/rose treatment with softer highlights, rounded border, and a light Bloom shell.
- Rematch now gives immediate feedback: button loading plus full-screen Bloom card “Đang chuẩn bị ván mới…” until the new game route/state is ready. The overlay is reset when `gameId` changes.

## Backend / protocol

No server protocol, Firestore schema, Rules, Functions, or Render deployment change in this phase. A server already running Phase 14V.4A+ remains compatible.

## Device focus

1. Rapidly play after the bot/opponent move settles; legal moves must be validated against the position actually visible.
2. Drag near borders/corners of a legal destination and confirm the intended legal target is selected.
3. Verify illegal drops still return to origin.
4. Verify larger pieces do not change logical hit/target mapping.
5. Press `Chơi lại`; loading feedback must appear immediately and disappear on the new game.
6. Keep Diagnostics open if any move is rejected; note `input_blocked`, `local_validate_illegal`, or socket/server stages.
