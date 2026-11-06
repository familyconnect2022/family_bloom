# Family Bloom P2.37R2C-H9A — Mini lifecycle + performance

H9A freezes the H6/H7/H8 stability baseline and changes only local game presentation ownership and Android decor-rail bounds.

## Fixed

- Authoritative state for the same `gameId` no longer forces `MINI -> FULL`.
- Server state continues to own game existence/FEN/clock/revision; client presentation owns `full` vs `mini`.
- Different/stale game state cannot steal an already-bound presentation.
- Mini changes the physical native decor-rail bounds to 118x72dp instead of leaving a transparent MATCH_PARENT layer above React tabs.
- Mini drag moves the small rail itself and retains dock side/Y in persistent native memory.
- Idle/background parks the rail off-screen at 1x1 while retaining Full/Mini/Chess renderer instances.
- `bringToFront()` no longer requests a full DecorView relayout.
- Native action subscriptions are mounted once rather than resubscribed on every Full/Mini transition.

## Frozen

- Root/auth Stack layout.
- H7 tab `flex:1` navigator layout.
- H6 Activity decor-rail isolation from React/Yoga.
- H8 Chess server-authoritative tap-to-move renderer.
- Xiangqi remains probe-only in this phase.

## Binary

- App: `1.3.8` / versionCode `143018`
- Native module: `family-bloom-overlay@1.3.7`
- Native identity: `P2.37R2C-H9A-native-1`

H9A is a native change and requires a rebuilt APK/development client before device verification.
