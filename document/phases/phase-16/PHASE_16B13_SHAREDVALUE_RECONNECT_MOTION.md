# Phase 16B.13 — SharedValue Reconnect + Motion

Phase 16B.13 moves the board's high-frequency visual work away from React renders while preserving Family Bloom's server-authoritative Chess contract.

## Source of truth

The server still owns FEN, revision, turn, clocks, result, and legality. The client keeps the latest authoritative snapshot in JS/ref form. Reanimated SharedValues are a **visual projection** of that state, not a second game engine.

This deliberately avoids putting/parsing FEN or PGN in SharedValues. FEN is compact logical state but parsing it on the UI thread would mix game logic with animation. PGN is history and is not suitable as the per-frame position source.

## Persistent renderer

The Chess `PieceLayer` stays mounted for the game. Piece identity/controllers survive normal state updates and reconnect. SharedValues own pixel position, scale, and opacity. React state is used only for low-frequency semantic UI such as game status and promotion artwork changes.

## Reconnect policy

- Keep last visible board on screen.
- Lock input while transport is reconnecting.
- Show a small reconnect status pill instead of replacing/fading the board.
- Same FEN: update metadata only, no motion.
- One authoritative version gap: animate the verified missed move.
- Larger gap: reconcile persistent native piece nodes to FEN.
- Never fade the whole board to zero merely because the socket reconnected.

## Motion policy

Chess move travel is eased and runs on the Reanimated UI thread, including the approved 1.30 lift. Drag tracking also remains entirely on SharedValues until a final drop command crosses to JS/server authority.

Bloom game bottom modals now animate backdrop, translate, opacity, and scale on the UI thread and remain mounted through their closing animation.

Xiangqi keeps its own engine and rules but follows the same visual principle: SharedValue position, eased motion, and a 1.30 lift.
