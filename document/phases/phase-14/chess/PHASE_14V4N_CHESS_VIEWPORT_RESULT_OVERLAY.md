# Phase 14V4N — Chess Viewport Result Overlay Hotfix

Date: 2026-10-04
Base: Phase 14V4M FULL

## Problem reproduced from device screenshot 4026
V4M mounted `ChessResultToast` inside `boardStage`. Because `StyleSheet.absoluteFillObject` always resolves against the nearest positioned parent, the toast was centered relative to the chessboard instead of the phone viewport. It therefore looked like a child panel of the board.

## Fix
- Removed `ChessResultToast` from `boardStage`.
- Mounted it as a direct sibling of the game `ScrollView` under `ScreenContainer`.
- Overlay now fills the real screen viewport and stays centered even if the ScrollView content is taller than the screen or is scrolled.
- The result toast remains a lightweight in-app toast (not a native React Native Modal).
- The overlay does not participate in layout and cannot push the board/player rails.
- Hide the result toast while `rematchLoading` so the existing rematch loading overlay can take over cleanly.
- Softened the full-screen dim layer and slightly compacted the result card.

## Preserved from V4M
- Bloom Bot fixed 120 ms test delay.
- Player-rail material advantage/capture layout fix.
- Production Hint/Motion/FX defaults.
- Sparse hints, lean motion, visual-commit FX, material-swing FX.
- Image-only centered promotion chooser.
- Server-authoritative chess state and validation.
