# Family Bloom P2.16.3 — Session / Audio / Focus Recovery

## Root causes fixed

- Route-owned Chess/Xiangqi surfaces were siblings of `BoardGameAudioProvider`, so their sound hooks resolved to `NO_SOUND`. The single audio provider now wraps `RootNavigator` and `BloomSurfaceStack`. Its component identity stays stable when warm readiness changes.
- Chess/Xiangqi routes were force-hiding the other game before server session recovery. This could destroy the Chess mini presentation merely by entering Xiangqi. Routes no longer arbitrate cross-game ownership. The existing durable `chessActiveUsers/{uid}` lock remains authoritative.
- Home Games now blocks Xiangqi navigation while a Chess game is active and resumes the existing Chess session directly.
- Xiangqi route renders its warm board host directly; the old route shell/guard can no longer sit over an already-mounted board.
- Focus geometry no longer silently aborts when viewport measurement is transiently zero; it falls back to route-root dimensions and keeps BSH hot-scene reuse.

## Invariants

1. A route may present its own game pixels but may not destroy the other game's session/presentation during mount/focus.
2. Server durable lock decides Chess vs Xiangqi ownership. Client route state is presentation only.
3. One process-wide board-audio bank is an ancestor of every board route and mini/global game UI.
4. Active Chess + tap Xiangqi = no Xiangqi session creation and Chess remains minimized.
5. Focus open may never silently no-op because a layout measurement is momentarily unavailable.
