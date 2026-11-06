# Phase 15A.6 — Chess board-anchored window portal

Date: 2026-10-05

## Problem

Promotion and rematch-preparing UI were correctly intended to be board-local, but on Android they still lived below the `boardStage` parent stacking context. Large child `zIndex`/`elevation` values could not guarantee that those overlays stayed above later sibling player rails/actions. In device testing the chooser/preparing card could therefore appear visually displaced and partially hidden by other game UI.

## Final architecture

- Keep `ChessBoard` itself in the normal scroll/layout tree.
- Give the physical board surface a non-collapsing native ref.
- Before promotion or rematch preparation is shown, measure the board with `measureInWindow()`.
- Render promotion/preparing UI in a transparent, hardware-accelerated React Native `Modal` that sits above the app window.
- Position one portal slot from the measured board `x/y/width/height`.
- Center both promotion and rematch UI inside that slot.
- The result win/loss/draw toast is unchanged and remains viewport-centered independently.

This separates two coordinate contracts clearly:

1. Win/loss/draw result -> phone viewport center.
2. Promotion/rematch preparation -> chessboard physical center.

## Android stacking fix

The new portal no longer depends on a child escaping its parent's stacking context. The window-level layer is always above player rails, action buttons, cards and the ScrollView, while the content position remains tied to the board rectangle rather than the screen center.

## Build gates

`phase15a6:check` verifies:

- board native ref + `collapsable={false}`;
- physical `measureInWindow()` geometry;
- fresh measurement before promotion and rematch;
- transparent window-level modal;
- status/navigation bar translucent coordinate alignment;
- portal uses measured x/y/width/height;
- promotion + rematch share one board slot;
- old `boardStageOverlayActive`/`boardOverlayHost` stacking workaround is not current;
- promotion remains image-only;
- result toast remains independent;
- Debug and Release run the Phase 15A.6 gate.

Historical V4O/V4P/15A.5 gates remain in the source tree for traceability but are no longer part of `chess:current-check`, because their overlay architecture has been superseded by this fix.

## Verification

- `npm run chess:current-check`: 13/13 current gates PASS
- `npm run phase15a:check`: 30/30 PASS
- `npm run phase15a4:check`: 10/10 PASS
- `npm run phase15a6:check`: 14/14 PASS
- `npm run release:check`: 11/11 PASS
- TS/TSX syntax: 249/249 PASS
- relative/alias/asset imports: 0 broken
