# Phase 14V.3I — Chess Bloom Bot Anytime

Baseline: Phase 14V.3H Chess Visual State Lock.

## Policy change
- Human vs human: unchanged, new challenges/rematches only from 06:00 to before 22:00 (Vietnam time).
- Human vs Bloom Bot: exempt from quiet hours; invite, accept, and rematch are allowed at any time.
- Existing active games remain unaffected.

## Server
- `chess:test:bot:invite` no longer calls the quiet-hour assertion.
- `chess:invite:accept` applies the quiet-hour assertion only to non-bot invites.
- `chess:game:rematch` applies quiet hours only when `old.testBotUid` is absent.

## Client
- Bloom Bot test button remains enabled after 22:00 when the socket is ready.
- Night policy copy explains that only family-member challenges are paused.
- Finished games vs Bloom Bot show `Chơi lại` after 22:00; human rematches still show `Hẹn từ 06:00`.
