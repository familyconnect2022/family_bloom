# Phase 16B.10 — Chess DEV Bot Server Authority

Date: 2026-10-05
Base: Phase 16B.9 Chess Production Polish on V4K gameplay/input.

## Goal
Restore reliable one-device development access to Bloom Bot outside the family 06:00–22:00 play window without re-introducing a client `.env` Bot toggle.

## Changes
- Render `CHESS_TEST_BOT_ENABLED` remains the sole Bot enable/disable switch.
- Client no longer aborts a Bot request because of stale local `testBotEnabled=false`; the request always reaches the server, which can accept or return `CHESS_TEST_BOT_DISABLED`.
- `/health.chessTestBotEnabled` is consumed during foreground prewake as a capability fallback instead of being logged and discarded.
- `app:join` and `lobby:join` ACK capability remain authoritative when explicitly present.
- Lobby waits for realtime `ready` before `lobby:join`, avoiding an early disconnected ACK race.
- In DEV builds the Bloom Bot card remains visible while capability resolves; this does not bypass server authority.
- Human-vs-human quiet hours remain unchanged; Bloom Bot invite/rematch stays 24/7.

## Non-goals / frozen areas
- No ChessBoard/ChessPiece/InteractionLayer gameplay changes.
- No move validation/protocol changes.
- No Render server gameplay change is required when the deployed V4M server already has `CHESS_TEST_BOT_ENABLED=true`.
- Phase 16B.9 promotion/result/preparing UI remains unchanged.
