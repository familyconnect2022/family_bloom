# Phase 14V4J — Sparse/Isolated Hint + Lean Motion + Visual-Commit FX

Device video 4018 isolated three different performance/timing problems that had been coupled together in the chess renderer.

## 1. Hint no longer owns a 64-worklet graph

V4H/V4I still mounted one Reanimated hint slot for every square. V4J removes Reanimated from `HintLayer` completely.

The board computes only the currently legal destination squares. `HintLayer` renders plain native Views for those destinations, so selecting a knight usually renders 2–8 hint nodes rather than 64 dormant worklets.

### Hint updates are isolated from ChessBoard

`HintLayer` owns its small snapshot internally and exposes an imperative `show/clear` controller. Selecting or clearing a piece no longer calls React state on `ChessBoard`, so hint updates do not force `PieceLayer` reconciliation at the same moment motion begins.

Hint remains optional during validation. Turning it off unmounts the layer completely.

## 2. Programmatic piece motion is translate-only

Normal tap moves, opponent moves and premoves no longer run any scale sequence. They use a short UI-thread translate only:

- local tap: 105 ms
- opponent: 110 ms
- premove: 80 ms
- drag settle: 80 ms

A real finger drag keeps only a small 1.16 tactile lift; scale is reserved for direct touch feedback and is not used for automatic board motion.

## 3. FX follows the visual board, not network state

Previously the game screen derived FX from incoming network state and then waited for both `boardMoving=false` and `visualRevision` to catch up. During fast bot/realtime replies this could make FX late or stale.

V4J emits `onVisualCommit(previous, current)` directly from `ChessBoard` after the authoritative position has actually become visible. The screen derives the battle effect from that exact visual transition.

A new visual transition immediately replaces/cancels the old effect. A normal following move clears a stale previous capture/check banner rather than letting it trail the game.

## Invariants preserved

- Socket/server remains authoritative.
- chess.js legality validation remains unchanged.
- request/client move idempotency remains unchanged.
- premove remains one queued local intent and is revalidated on the new authoritative FEN.
- clocks remain isolated from board rendering.
- single board interaction surface remains.
- persistent piece identity remains intact.

## react-native-chessboard / Skia decision

Do not migrate yet. V4J removes the confirmed hot path while preserving Family Bloom's server-authoritative renderer contract. If V4J still shows visible stutter with Hint OFF and translate-only Motion ON, the next experiment should be a separate Skia renderer branch rather than adding more animation patches to the current View-based motion layer.
