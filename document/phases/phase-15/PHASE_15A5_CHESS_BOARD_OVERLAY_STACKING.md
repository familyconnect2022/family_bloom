# Phase 15A.5 — Chess Board-local Overlay Stacking Hotfix

Date: 2026-10-05
Baseline: Phase 15A.4 FULL CODE

## Problem

The promotion chooser and the “Đang chuẩn bị ván mới…” overlay were intended to be board-local, but on Android they could still appear below later sibling UI such as the lower player rail or action row. The overlay child had a very high z-index/elevation, while its parent `boardStage` remained at a low elevation. Android stacking contexts can keep a child behind a later sibling even when the child itself has a large z-index.

## Fix

- Added `boardLocalOverlayActive = !!promotion || rematchLoading`.
- `boardStage` is conditionally lifted while either board-local overlay is visible:
  - `zIndex: 4000`
  - `elevation: 24`
- Replaced the overlay host’s implicit `absoluteFillObject` sizing with an explicit board-sized host:
  - `position: absolute`
  - `top: 0`, `left: 0`
  - `width: boardSize`, `height: boardSize`
- Promotion and rematch/preparing overlays continue to share the same board-local host.
- The result win/loss/draw toast remains the separate viewport-centered overlay and is unchanged.

## Expected behavior

- Promotion chooser is centered on the chessboard itself, not the root screen or ScrollView content.
- “Đang chuẩn bị ván mới…” is centered on the chessboard itself.
- Both overlays render above the lower player card and action buttons on Android.
- No layout height is added and the board/player rails do not move.

## Validation

- Phase 15A.5 overlay stacking: 10/10 PASS
- Phase 14V4P board-local overlays: 18/18 PASS
- Current Chess aggregate gates: 15/15 PASS
- Phase 15A.4: 10/10 PASS
- Phase 15A: 30/30 PASS
- Release readiness: 11/11 PASS
- TS/TSX syntax: 249/249 PASS
- Relative/alias/asset import resolution: 0 broken

No gameplay, server-authoritative move logic, Hint, Motion, Material Swing FX, result toast, clocks, or Bloom Bot timing was changed.
