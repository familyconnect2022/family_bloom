# Family Bloom P2.15.5 — Root Surface Visibility + Focus Commit + Audio Coldstart

Date: 2026-10-13
Baseline: P2.15.4 FULL CODE

## Real-device regressions addressed

1. Xiangqi route could remain visible as a white shell while its persistent board surface was translated off-screen.
2. Root Family Graph Focus could dismiss Person Detail but fail to appear above the native navigator surface.
3. Chess could miss the first two move cues, replay a duplicated move cue later, and fail to select the castle cue reliably.

## Root surface contract

- `BloomSurfaceStack` remains the single app-root presentation plane.
- Canonical order: board-game plane 100 < Focus plane 200 < global system UI 300.
- Android root plane has real native elevation (`80`) in addition to z-index so it can paint above `react-native-screens` navigator siblings.
- Focus fully occludes Chess/Xiangqi presentation and input while remaining independent from game lifecycle state.
- Feature hosts remain process-persistent after their first prepare; root manager owns arbitration only.

## Xiangqi / Chess visibility fix

`presentationReady` is no longer allowed to determine whether a full board is visible. It is retained only as a boot/prewarm signal.

A route-owned board is visible when:

- its surface mode is `full`, and
- it is not occluded by a higher-priority Focus surface.

The app-root presentation-ready state is now a one-way boot latch based on identity/navigation + critical visual assets. It does not fall back to false when tabbar readiness changes on a full-screen route.

This removes the white-shell failure where the Xiangqi route remained focused but the persistent surface was moved off-screen.

## Focus presentation fix

- Focus snapshot publication runs in `useLayoutEffect`, not a normal post-paint `useEffect`.
- Detail -> Focus handoff therefore commits the root Focus snapshot before the next paint.
- Root Focus is an ordinary persistent root surface, not a native Android Modal.
- P2.15.4 cooperative cancellation remains: heavy Focus traversal/projection loops yield at bounded checkpoints so Back can cancel stale work quickly.

## Board-game audio cold-start fix

- Exact supplied 11 MP3 files remain the only native board-game sound bank.
- Asset bytes start preloading at module load.
- Each long-lived native player is created with its source already bound; `replace()` is only a rate-limited recovery path.
- A missed cue is retried only inside the current gesture window and is never queued for delayed playback on a later move.
- Replay explicitly seeks to zero before replaying a previously-used cue.
- A new `criticalAudioReady` contract covers: game-start, move-self, move-opponent, capture, check, castle, promote and game-end.
- Chess Ready waits for both board first-paint and `criticalAudioReady` before marking the persistent surface prepared / sending the authoritative ready handshake.
- Xiangqi Ready uses the same critical-audio gate.
- The server clock therefore cannot start while Android is still attaching critical cue players.

## Chess semantic audio fixes

Move sound dedupe now uses physical move identity:

`color + from + to + promotion`

instead of SAN/flags, so optimistic-local and authoritative-server forms cannot produce two sounds merely because their semantic envelope differs.

Castling is recognized through all of:

- chess.js king/queen-side flags,
- SAN `O-O` / `O-O-O`,
- king travel of exactly two files,
- invariant square pairs `e1g1`, `e1c1`, `e8g8`, `e8c8`.

## Verification performed on working source

- P2.15.5 root/audio gate: 38/38 PASS
- P2.15.4 root arbitration gate: 40/40 PASS
- P2.15.3 runtime ownership gate: 40/40 PASS
- P2.15.2 Focus/audio gate: 30/30 PASS
- P2.15.1 Focus shell/copy-over gate: 26/26 PASS
- P2.15 stability gate: 65/65 PASS
- P2.14 gate: 50/50 PASS
- P2.12 persistent surfaces gate: 44/44 PASS
- P2.12.4 build/audio gate: 57/57 PASS
- Phase 17.9A9 full TS/TSX transpile scan: 348 files, PASS
- Phase 17.9A16 Xiangqi server authority: 45/45 PASS
- Phase 16B Xiangqi playable: 29/29 PASS
- Current Chess aggregate: 21/21 PASS
- Board audio integrity: exact 11 MP3, total 60,419 bytes, PASS
- Project structure: 18/18 PASS
- BAT entrypoint audit: 22 BAT files PASS

Dependency-install checks that require `node_modules` are intentionally executed by `scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat` after npm bootstrap on the user's Windows project. The FULL source package does not ship `node_modules`.

## Required real-device acceptance

1. Open Xiangqi repeatedly from Nhà Mình and after tab/route transitions: no white shell; persistent board must remain visible.
2. Open Family Graph Focus repeatedly, including Back during preparation: root Focus must appear above the graph immediately and stale computation must not block reopen.
3. Start Chess: first legal move must already have sound. Test at least 10–15 moves, capture, check, both castling directions where legal, and game end. No local/server duplicate move cue is acceptable.
