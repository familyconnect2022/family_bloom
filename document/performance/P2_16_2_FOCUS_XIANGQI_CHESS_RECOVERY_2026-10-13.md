# Family Bloom P2.16.2 — Focus / Xiangqi / Chess Recovery

Date: 2026-10-13

## Why this phase exists

P2.16.1 removed paint-ACK hydration dependency, but device evidence still exposed three independent stalls:

1. Focus View already had renderer-ready BSH scenes in cache, yet the real reopen/switch path ignored the cache and deliberately rebuilt through the shell.
2. Xiangqi serialised a 65-second `/health` prewake before opening Socket.IO, and board Ready additionally required one image callback for every piece instance.
3. Chess could leave `gameSyncInFlight` latched on the `CHESS_SERVER_RECOVERING` early-return path and continued covering a fully painted board with the large sync card.

## P2.16.2 contract

### Focus View

- Add an identity-only BSH scene probe for the user press path. It performs no graph fingerprint, topology, geometry or revision-LRU work.
- Retain prepared branch scenes by person id for the mounted graph route.
- Validate every local hot scene against the current full-tree visual revision. Cache accelerates only; it cannot override correctness.
- Reopen a prepared branch immediately, including A -> B -> A switching.
- Keep genuinely cold branches shell-first, two-frame delayed and cancellable.

### Xiangqi

- `/health` is a fire-and-forget wake hint; Socket.IO begins immediately instead of waiting behind it.
- Transient transport/ACK recovery errors retry while the Xiangqi route remains focused; a user no longer has to leave and reopen the screen to trigger another recovery attempt.
- A route-owned Xiangqi host may mount even during the tiny `surface.prepared` subscription race.
- Board Ready is based on non-zero scene layout plus two committed native frames. Bundled local `require()` images are not network hydration dependencies and per-instance `onLoadEnd` callbacks cannot deadlock gameplay.
- Server remains authoritative for state, legal moves, clock, ready handshake and results.

### Chess

- `CHESS_SERVER_RECOVERING` retry explicitly releases `gameSyncInFlight` before returning and marks the cached game reconnecting.
- Once the native board is painted, ordinary network/session synchronization uses the small non-blocking board pill instead of the full-screen preparation card.
- Interaction remains locked until connection is connected, the authoritative session matches, status is active and entry phase is playing.

## Validation

Run:

```text
npm run phaseP2_16:check
npm run phaseP2_16_1:check
npm run phaseP2_16_2:check
```

`scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat`, Debug build and Release build all run the P2.16.2 gate.
