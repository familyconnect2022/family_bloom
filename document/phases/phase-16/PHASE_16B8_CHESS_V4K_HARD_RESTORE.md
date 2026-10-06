# Phase 16B.8 — Chess V4K Hard Restore + Copy-Over Safety

Date: 2026-10-05

## Decision

The Chess failure observed on Android is treated as a client regression, not a Render server regression.
The device log proved piece selection reached JS with `status=active`, while destination-square taps did not commit a move.

Phase 16B.8 therefore stops patching the 16B.x Chess interaction state machine and restores the proven pre-promotion-overhaul V4K client path.

## Server boundary

- Render server is intentionally unchanged from the current V4M-compatible source.
- `server/src/socket/socketServer.ts` remains the fixed 120 ms Bloom Bot diagnostic build.
- `useChessGame`, `chessSocketService`, and `ChessRealtimeContext` are unchanged from the Phase 16B.7 baseline.
- No Firebase Rules or indexes change is required.

## Client hard restore

The following files are byte-identical to the archived V4K FULL checkpoint:

- `src/components/chess/ChessBoard.tsx`
- `src/components/chess/ChessClock.tsx`
- `src/components/chess/ChessPlayerRail.tsx`
- `src/components/chess/ChessMaterialStrip.tsx`
- `src/components/chess/v2/ChessPiece.tsx`
- `src/components/chess/v2/InteractionLayer.tsx`
- `src/components/chess/v2/PieceLayer.tsx`

The game screen body is restored from V4K but remains at the current physical Expo Router location:

`src/app/(chess)/chess-game/[gameId].tsx`

Only import paths were adapted for the current route group and current `services/games/` folder.

## Removed from current Chess runtime

- board/window coordinate measurement for promotion/rematch
- `ChessPromotionOverlay`
- `ChessResultToast`
- board-surface portal host
- 16B.x input/lifecycle recovery patches

The V4K inline promotion chooser and simple loading overlay are restored.

## Copy-over safety

Two root BAT files are included:

1. `Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat`
   - run from the extracted new FULL package;
   - point it at the existing Family Bloom project;
   - removes legacy/moved routes, post-V4K Chess overlay leftovers, generated JS shadows, and local caches.
2. `Family_Bloom_CLEAN_APPLY_FULL.bat`
   - run after the FULL package has been copied over the old project;
   - runs the canonical cleanup script and the Phase 16B.8 restore verification gate.

Debug and Release build BAT files also run the cleanup automatically before their static gates.

## Current Chess acceptance boundary

Current Android builds no longer require the superseded V4L/V4M client UI or Phase 15A.6 board portal gates.
The active aggregate ends at V4K plus the Phase 16B.8 restore gate.
Historical scripts remain in the source tree for archaeology but do not block current builds.
