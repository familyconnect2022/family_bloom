# Phase 14V4O — Chess coordinate-space overlay fix

## Goal
Fix the two overlay classes by giving each the coordinate system it actually needs.

### Result toast (win/loss/draw)
- Must be centered in the **visible phone viewport**, never in ScrollView content and never in the board.
- Remains a non-layout Bloom toast: it does not push the board/player rails.
- Uses `useWindowDimensions()` and explicit `width/height` on a root-level absolute overlay anchored at `{top: 0, left: 0}`.
- Adds an explicit **Bạn thua** state, while preserving **Bạn thắng!** and **Ván hòa**.

### Promotion chooser
- Must be centered in the **chessboard**, not the screen.
- Removed React Native `Modal`.
- Mounted as an `absoluteFillObject` child of `boardStage` so it tracks board position/size even when the page is scrolled.
- Uses the real board piece WebP assets for Q/R/B/N; no visible piece-name labels.

## Preserved
- Sparse Hint architecture.
- Lean motion.
- Visual-commit FX and Material Swing filter.
- Material advantage row above captured pieces.
- Bloom Bot fixed test delay: 120 ms.
- Server-authoritative move/promotion path.
