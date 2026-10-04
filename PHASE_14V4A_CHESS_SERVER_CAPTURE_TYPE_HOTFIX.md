# Phase 14V.4A — Chess server captured-piece type hotfix

## Why this hotfix exists
Render TypeScript build failed because `chess.js` exposes `Move.captured` as `PieceSymbol | undefined`, and `PieceSymbol` includes `"k"` at the type level. Family Bloom's wire type intentionally excludes kings from capturable pieces because a legal chess move never captures the king.

## Fix
- Added a narrow helper on the server and client that converts `PieceSymbol | undefined` to the protocol's capturable-piece union (`p | n | b | r | q`).
- If `chess.js` ever reports `captured === "k"`, Family Bloom treats it as an invariant violation instead of widening the protocol.
- No protocol field was widened to permit king capture.
- No Firebase, Firestore, Render configuration, or gameplay semantics changed.

## Validation
- Phase 14V.4 Renderer V2: 37/37 PASS
- Phase 14V.4A capture type hotfix: 9/9 PASS
- Phase 14V.3I Bot Anytime: 15/15 PASS
- Phase 14U Chess core: 54/54 PASS
- Isolated strict server TypeScript check reproducing the Render `PieceSymbol` shape: PASS

## Deployment
Deploy the `server/` directory from this source to Render, then rebuild the matching V2 Android client.
