# Phase 14V4M — Board Overlay Result + Fixed Bot Delay Diagnostic

Date: 2026-10-04
Base: Phase 14V4L Production UI + Result Toast + Promotion Overlay

## 1. Result toast: true board overlay
- `ChessResultToast` no longer uses React Native `Modal`.
- It is mounted **inside `boardStage`** and uses `StyleSheet.absoluteFillObject`.
- Therefore it cannot take layout height, cannot push the board/player rail, and is always centered over the board.
- The win presentation is strengthened with a warm aura, trophy halo, sparkles, petals and blossom corners while remaining result-only.
- `Chơi ván mới` and `Đồng ý` remain inside the centered result card.

## 2. Captured material rail
- `Lợi thế +X` has its own fixed row above captured pieces.
- Captured pieces use a second fixed row below it.
- Long rows compact at 8 / 11 / 14 captured pieces and are clipped inside their own band, so they can no longer cover the advantage text.
- Player rail reserves more vertical room for the two-row material display.

## 3. Bloom Bot fixed response delay diagnostic
- Removed randomized 90–179 ms artificial think delay.
- Bloom Bot now waits exactly **120 ms** before every scheduled bot action.
- Bot move choice remains synchronous and server-authoritative; the fixed wait only controls when the action begins.
- Diagnostic interpretation: after deploying this server build, any repeatable pause materially above 120 ms is not caused by random bot think-time. Remaining latency would be socket/network, server state lookup/mutation, or client visual handling.

## 4. Preserved behavior
- V4J sparse Hint stays enabled.
- V4J translate-only Motion stays enabled.
- V4J visual-commit FX remains.
- V4K material-swing FX remains.
- V4L image-only centered promotion overlay remains.
- Server authoritative revision validation, chess.js legality, premove revalidation and clocks remain unchanged.

## Device check
1. Deploy/restart the Render chess server from this V4M source (required for the 120 ms test).
2. Start a Bloom Bot game and make several ordinary moves and checks.
3. Compare bot response delay across moves: artificial wait should now be consistent at 120 ms instead of random.
4. Finish a game: result card must appear over the middle of the board without moving the board or bottom rail.
5. In a long-capture position, confirm `Lợi thế +X` stays above the captured-piece row with no overlap.
