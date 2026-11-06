# Phase 14V4K — Material-swing FX

Goal: reduce battle FX noise after V4J while preserving decisive chess moments.

## Capture FX policy
- Capturing a pawn never creates capture FX by itself.
- Equal/near-equal exchanges (estimated net gain <= +1) create no capture FX.
- The client checks whether the capturing piece can be immediately recaptured on its destination square.
- Estimated exchange gain = captured piece value - capturing piece value when an immediate legal recapture exists.
- Capture FX appears only when estimated net material gain is >= +2.
- Qualified captures use the title `ĐỘT BIẾN!`; +4 or greater uses dramatic intensity.
- Check, promotion, checkmate, timeout, resignation and draw remain independent FX events.
- No engine search/minimax is added to the input or motion hot path; the rule uses one local chess.js legal-move query only when deriving a capture visual event after visual commit.

Piece values: Pawn 1, Knight 3, Bishop 3, Rook 5, Queen 9.

Examples:
- Any capture of a pawn: no capture FX.
- Knight takes Bishop and can be recaptured: 3 - 3 = 0 -> no FX.
- Bishop takes Knight and can be recaptured: 3 - 3 = 0 -> no FX.
- Bishop takes Rook and can be recaptured: 5 - 3 = +2 -> `ĐỘT BIẾN!`.
- Rook takes Bishop and can be recaptured: 3 - 5 = -2 -> no FX.
- Free Knight/Bishop with no immediate recapture: +3 -> `ĐỘT BIẾN!`.
- Free Queen: +9 -> dramatic `ĐỘT BIẾN!`.

Server-authoritative move validation, premove, V4J sparse hints and visual-commit timing are unchanged.
