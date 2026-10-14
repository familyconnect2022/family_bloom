# Phase 14V.3L — Chess FX Frame Pacing

Baseline: Phase 14V.3K Hybrid Instant Motion.

## Changes
- Removed realtime ChessDebug/ChessPerf console serialization from the client hot path.
- Replaced the battle-effect backlog queue with a latest-event policy.
- Battle FX only becomes visible after the board has visually settled the matching revision.
- Any new piece motion immediately suppresses/cancels the current battle overlay.
- Reduced FX lifetime and removed spring/scale animation to lower Android GPU overdraw/compositing pressure.
- Haptics no longer fire for every fast opponent/bot event.
- Coalesced/reconnect jumps do not synthesize stale capture/check effects.
- Hybrid instant local motion, no-reverse correction, Bot Anytime, WebP pieces, and server authority are preserved.

## Why
3997.mp4 showed effect banners remaining on the board while later moves were already occurring. The previous queue could keep 1.1–1.85s events behind a fast bot. In Debug builds, per-state console serialization also added avoidable JS/Metro work.
