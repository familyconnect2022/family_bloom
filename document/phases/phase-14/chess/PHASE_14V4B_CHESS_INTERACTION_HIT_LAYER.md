# Phase 14V.4B — Chess Interaction Hit Layer Hotfix

## Device finding
Frame-by-frame review of `4002.mp4` showed legal-hint/selection changes but no committed piece transaction. The source piece remains on its origin square throughout the sampled move attempts. This narrows the failure to the tap/drop interaction path before authoritative move reconciliation.

## Change
- `SquareLayer` is now pure visual/static background.
- New `InteractionLayer` owns 64 static logical-square hit slots.
- Layer order is `Square -> Highlight -> Hint -> Interaction -> Piece`.
- Empty-square taps no longer depend on Android pointer pass-through through the Reanimated overlay tree.
- `PieceLayer` stays above the hit surface, so piece tap/drag remains owned by Gesture Handler.
- Tap and drag still converge on the same `executeAttempt()` / local `chess.js` validation path.
- No server/protocol changes in this hotfix.
