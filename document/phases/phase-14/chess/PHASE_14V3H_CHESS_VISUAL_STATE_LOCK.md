# Phase 14V.3H — Chess Visual State Lock

Baseline: `FAMILY_BLOOM_PHASE_14V3G_DEFAULT_WEBP_CHESS_PIECES_FULL_2026-10-03.zip`

## Goal
Remove the visible chess-piece bounce where a piece reaches its destination, flashes back to its source square for one or two frames, then jumps forward again when the authoritative state arrives.

## Changes
- A successful move ACK now returns the exact `ChessGameState` to `ChessBoard`; boolean acceptance alone can no longer release the moving overlay.
- The moving overlay stays pinned at the destination until both conditions are true:
  1. native move animation has finished;
  2. the exact authoritative move state (revision/ply/from/to) is confirmed.
- The destination FEN is committed underneath the moving overlay before the overlay is removed.
- Fast bot/opponent states that arrive while another piece is animating are queued and reconciled after the current visual move settles.
- Incoming authoritative moves animate from the currently displayed FEN, not from a future server snapshot.
- Large reconnect jumps fall back to a clean authoritative snap instead of creating an invalid animation.
- Board input remains locked while either a visual move or queued visual reconciliation is pending.
- Last-move and check-square highlights now follow the settled visual board state rather than racing ahead with the newest socket state.
- Existing monotonic state gate in `useChessGame` remains intact: stale revisions and same-revision conflicting FEN packets are still rejected.

## Validation
Run:

```bash
npm run phase14v3h:check
npm run phase14v3c:check
node scripts/test-phase14v3f-chess-reconcile-fx-timing.js
npm run phase14v3g:check
```

Additional Chess gates from Phase 14U through Phase 14V.2D were also re-run before packaging.
