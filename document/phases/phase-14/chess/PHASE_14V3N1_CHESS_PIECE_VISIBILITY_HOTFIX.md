# Phase 14V.3N.1 — Chess Piece Visibility Hotfix

Baseline: Phase 14V.3N Persistent Piece Layer.

## Device regression
On Android the board squares/highlights rendered, but all chess pieces disappeared after the 14V.3N persistent-layer refactor.

## Root cause / risk removed
The board and moving layer used `renderToHardwareTextureAndroid` while local WebP pieces were rendered by `expo-image`. Android can rasterize the parent before asynchronous image content is painted, leaving a cached board texture without the piece layer. The absolute piece layer itself and FEN state remained valid.

## Fix
- Remove `renderToHardwareTextureAndroid` from ChessBoard and the moving slot.
- Render the 12 bundled WebP chess assets with React Native `Image` instead of `expo-image` inside ChessBoard.
- Remove `recyclingKey` / expo-image transition behavior from board pieces.
- Keep the persistent absolute static-piece layer and persistent moving-piece slot from 14V.3N.
- Give the piece layer explicit board dimensions and `collapsable={false}`.
- Keep `fadeDuration={0}` so local pieces appear immediately on Android.
- Preserve Hybrid Instant Motion, no reverse rollback, FX A/B switch, bot 24/7, and server-authoritative gameplay.

No server/Firestore deployment is required. Device test remains the acceptance gate for visibility and motion smoothness.
