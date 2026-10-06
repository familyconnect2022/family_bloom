# Phase 14V4P — Chess Board-Local Overlay Host

Base: Phase 14V4O.

## Root cause
The previous iterations mixed three coordinate spaces: screen/root, ScrollView content, and boardStage. Promotion had been moved under boardStage, but boardStage itself was not the exact physical board coordinate box. The rematch/preparing overlay was still mounted at the screen root. That allowed one or both cards to appear centered against the wrong rectangle.

## Fix
- Added one shared `getChessBoardSize(windowWidth)` helper in `ChessBoard.tsx`.
- `ChessBoard` and `ChessGameScreen` now use the same board size calculation.
- Added an explicit `boardSurface` wrapper sized exactly `boardSize x boardSize`.
- Added `boardOverlayHost` as `StyleSheet.absoluteFillObject` inside that boardSurface.
- Promotion chooser and `Đang chuẩn bị ván mới…` both render inside this one host.
- The result win/loss/draw toast remains a separate viewport-level overlay because that one intentionally belongs to the phone viewport, not the board.

## Expected behavior
- Promotion chooser center = chessboard center.
- Preparing/rematch card center = chessboard center.
- Win/loss/draw toast center = physical phone viewport center.
- Scrolling the page moves board-local overlays together with the board and does not change their relative center.
