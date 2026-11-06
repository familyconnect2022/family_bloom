# Phase 14V4F — Chess Turn Focus + Player Rail + Material Advantage

Baseline: Phase 14V4E.

## Goals

- Server `turn` remains the authoritative source for whose move it is.
- When it is not the local player's turn, own pieces cannot be selected or dragged.
- Turn feedback is visual and lightweight: player rail + clock focus use Reanimated SharedValue, not React state.
- Player identity, turn copy, captured pieces and clock are grouped into a compact rail immediately above/below the board.
- Captured-piece rows and material advantage are isolated from ChessBoard rendering.
- Diagnostic panel is moved below gameplay controls and is collapsed by default.

## Turn gating

`ChessBoard` uses `canInteract(state, myColor)` and keeps the native `boardLocked` SharedValue locked unless:

- game status is `active`; and
- authoritative visible turn equals `myColor`.

Selection and `attemptMove()` both repeat the guard in JS. Diagnostic traces use `NOT_MY_TURN` when the user tries to interact outside their turn.

Premove input is disabled by this UX decision. The server still remains authoritative and still rejects out-of-turn commands if a malformed client sends one.

## Turn visual state

The game screen owns two Reanimated SharedValues:

- `whiteTurnActive`
- `blackTurnActive`

They are updated from `ChessBoard` only after the corresponding visual authoritative commit, so the glow does not jump ahead of the piece animation.

`ChessPlayerRail` and `ChessClock` consume those SharedValues for border/background/scale focus. No React `isMyTurn` state was added.

## Captured pieces + material score

Compact server snapshot shape:

```ts
captureSummary: {
  byWhite: { p, n, b, r, q },
  byBlack: { p, n, b, r, q },
}
```

- Server Runtime stores the summary in RAM.
- On restore, the summary is rebuilt once from verbose chess.js history.
- On an accepted capture, only the mover's bucket increments.
- Normal move delta remains unchanged and does **not** include the whole capture summary; it already contains `move.captured`.
- Client `applyChessMoveDelta()` increments its local summary from that existing field.
- Full snapshot carries the small summary for join/reconnect/resync.

Material values:

- Pawn = 1
- Knight = 3
- Bishop = 3
- Rook = 5
- Queen = 9

Only the side with a positive material differential displays `Lợi thế +N`.

`ChessMaterialStrip` is `React.memo` with a custom capture-count comparator. It rerenders only when captured counts or displayed advantage change and does not feed any props into `ChessBoard`.

## Layout

Runtime order:

```text
Opponent Player Rail
Chess Board
My Player Rail
FX test chip
Promotion / game actions / result
Diagnostics (collapsed by default)
```

This removes the large diagnostic card from between the board and the local player's clock/card.

## Deployment

This phase changes both client and server types.

Deploy the `server/` directory from 14V4F to Render before validating reconnect capture history. An older V4A server can still play normal moves with the V4F client fallback, but capture rows after reconnect will not have complete historical capture data until the V4F server is deployed.

## Validation

- Phase 14U → 14V4F selected regression gates PASS.
- Phase 14V4F gate: 28/28 PASS.
- Modified client/server TS/TSX files syntax-transpile PASS.
- Full project native build not executed in the packaging environment because project node_modules are not bundled.
