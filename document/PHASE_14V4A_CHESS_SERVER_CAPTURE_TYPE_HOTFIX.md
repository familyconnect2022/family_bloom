# Phase 14V.4A — Chess Server Capture Type Hotfix

## Symptom
Render TypeScript build stopped at `chessGameManager.ts` because chess.js types `Move.captured` as `PieceSymbol | undefined`, and `PieceSymbol` includes `"k"`. Family Bloom's V2 wire protocol intentionally allows only capturable pieces (`p/n/b/r/q`).

## Fix
- Keep `AppliedMove.captured` semantically strict: king is not a capturable piece.
- Narrow chess.js `PieceSymbol` through `asCapturablePiece()` before assigning to the V2 delta.
- Guard the impossible `captured === "k"` case as an invariant failure so the existing move transaction rollback restores the pre-move runtime snapshot.
- Apply the same narrowing on the client optimistic-move builder.

No Firestore schema, chess rules, clock model, Socket.IO event names, or V2 payload shape changed.
