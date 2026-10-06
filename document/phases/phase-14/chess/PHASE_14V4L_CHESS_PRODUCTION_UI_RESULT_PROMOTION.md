# Phase 14V4L — Chess Production UI + Result Toast + Promotion Overlay

Date: 2026-10-04
Base: Phase 14V4K Material Swing FX

## Production UI
- Removed Hint / Motion / FX diagnostic switches from the game screen.
- Hint, Motion, and FX are enabled by default in production.
- Removed `Bạn` / `Đối thủ` labels from clocks.
- Removed `Quân trắng` / `Quân đen` and turn-copy rows from player rails.
- Active-turn clock now uses a solid Bloom accent fill with white tabular numerals; inactive clock stays light.
- Bot display is simplified to `Bloom Bot` without the experimental suffix.

## End-game experience
- Replaced the old below-board finished-result card with `ChessResultToast`, centered over the board.
- Win state has a small crown/trophy treatment, Bloom sparkles, and six lightweight native-driver petals.
- The result toast exposes `Chơi ván mới` and `Đồng ý` actions.
- `Đồng ý` dismisses only the toast; board/history state remains intact.
- Result toast waits 180 ms after finish so the final board movement can land before celebration enters.
- Final-state generic battle FX is suppressed so it cannot overlap the result toast.

## Promotion
- Replaced the inline text promotion card with a screen-centered custom Bloom overlay.
- Promotion options use the exact board piece WebP assets for Queen/Rook/Bishop/Knight in the current player's color.
- Piece names are not rendered visually. Accessibility labels remain available for screen readers.
- Selection still resolves through the existing `onPromotion` promise and server-authoritative move command.

## Preserved performance / chess behavior
- V4J sparse Hint architecture remains unchanged.
- V4J translate-only programmatic Motion remains unchanged.
- V4J visual-commit FX pipeline remains unchanged.
- V4K material-swing FX filtering remains unchanged.
- Server-authoritative move validation, premove revalidation, clock authority, Socket.IO revisioning and chess.js legality remain unchanged.
