# Family Bloom P2.21 — Terminal-First Game Teardown + Dedicated Focus Camera

Date: 2026-10-14  
Base: P2.20 Clean Game Lifecycle + Focus 85% + Native Pan

## Why P2.21 exists

Real-device video `6362.mp4` proved that P2.20 still had two runtime failures:

1. Family Graph Focus rendered at the intended large native size, but one-finger pan still did not move the scene on Android.
2. After Chess/Xiangqi reached a terminal state, the board-game lifecycle could still leave enough stale session/presentation state for the next board game to hang. Xiangqi's command route also had a fallback that could resolve/create another Xiangqi session after terminal teardown while the result UI was still visible.

P2.21 changes the ownership model instead of adding another loader/retry workaround.

## 1. Terminal game means session is dead immediately

The canonical lifecycle is now:

`authoritative terminal packet -> copy immutable result snapshot -> tombstone gameId -> release active lease -> release route/presentation owner -> clear root rail identity -> clear surface gameId -> clear pending reservation -> reset retained board runtime -> ACK server result -> route returns to Game Hub`

The result UI is not part of that lifecycle. It can remain visible after every gameplay/session identity is already gone.

### Tombstones

`activeBoardGameSessionStore` now keeps a bounded terminal tombstone set. Once `{kind, gameId}` is terminal, late route/recovery/socket callbacks cannot reclaim the old game. A different/new gameId remains immediately claimable.

### Chess

`ChessRealtimeContext` is the only terminal owner for Chess. On `finished` or `cancelled` it:

- publishes an immutable terminal result snapshot;
- terminal-marks and finishes the claimed Chess session immediately;
- clears active id/recovery authority/pending reservation/local resumable snapshot;
- clears the Chess game store for the finished id;
- ACKs `gameResultAck` immediately;
- ignores every later packet for the tombstoned id.

`ChessSurfaceHost` no longer owns result lifecycle, result ACK, terminal teardown, or terminal sound scheduling. It renders only a live/preparing Chess surface.

### Xiangqi

`XiangqiSurfaceHost` now uses one `terminateAuthoritativeGame()` path for both full terminal state packets and terminal move deltas. It snapshots the result first, finishes the claimed session immediately, ACKs the result, and clears retained local play state.

The Xiangqi command route observes the independent terminal result. When its owned game ends it returns to `/home-games` immediately and is explicitly forbidden from calling `resolveOrCreateXiangqiSession()` behind the result modal. This closes the late-discovered auto-create/recovery race that could keep the cross-game lock alive after finish.

## 2. Result presentation is independent from the board session

New root-owned components:

- `src/services/games/boardGameTerminalResultStore.ts`
- `src/components/system/BoardGameTerminalResultHost.tsx`

The result host:

- owns no `ActiveBoardGameSession`;
- shows the saved Chess/Xiangqi result in an over-full-screen native modal;
- plays the terminal sound exactly once per saved result key;
- supports Chess human rematch through `ChessRealtimeActions` so the provider receives the new authoritative game id;
- keeps stable rematch request ids across transport ambiguity;
- supports rematch waiting/cancel independently of the old session;
- keeps quiet-hour policy for human rematches while test-bot games remain exempt;
- supports Xiangqi bot rematch from the saved game id.

Closing the result only clears the saved result snapshot. It does not perform session cleanup because session cleanup already happened at the terminal packet.

## 3. Family Graph Focus has a dedicated camera

P2.20 fixed the native modal boundary but still reused the normal graph camera/recognizer path. P2.21 separates Focus interaction state:

- `focusCameraTranslateX`
- `focusCameraTranslateY`
- `focusCameraScale`

New pure helper:

- `src/components/familyGraph/familyGraphFocusCamera.ts`

Focus gesture hierarchy is now:

`native overFullScreen Modal -> one GestureHandlerRootView -> GestureDetector(Pan + Pinch) -> Focus scene`

Inside Focus mode the graph viewport is a plain `View`, so there is no nested gesture root. One-finger pan updates the dedicated Focus SharedValues directly. The pan helper intentionally has no clamp that can snap translation back to zero. Pinch remains simultaneous and persists the exact final user camera for Focus re-open hydration.

Focus geometry remains exactly 85% of native window width and 85% of native window height, route-owned inside Phả hệ.

## 4. Dead lifecycle cleanup

Runtime source was audited for retired paths. P2.21 source contains no runtime references to:

- `pendingResultGameId`
- `leaveFinished`
- `acknowledgeResult()` client result-lifecycle API
- `scheduleTerminalSound`
- `resultSoundPlayedForGameRef`
- `resultRevealReady`
- user-facing old warm/check-session/move-board technical copy

`finishClaimedBoardGame()` has only two real terminal callers: Chess realtime authority and Xiangqi realtime authority.

## 5. Regression gates updated as successor contracts

Historical active gates that encoded “result stays inside live surface until dismiss” were updated to assert the P2.21 successor invariant instead of reviving retired code. Gameplay, away timeout, rematch idempotency, quiet-hour policy, audio, tab lifecycle, server authority, and visual contracts remain protected.

## Verification

Final source verification:

- **P2.21 terminal-first + dedicated Focus camera:** 80/80 PASS
- **P2.20 inherited contract:** 48/48 PASS
- **P2.19 inherited contract:** 60/60 PASS
- **P2.18 inherited contract:** 86/86 PASS
- **Current Chess aggregate:** 21/21 phase gates PASS
- **CLEAN_APPLY referenced test scripts:** 55/55 PASS
- **Project structure:** 18/18 PASS
- **Build entrypoint audit:** 22/22 BAT files PASS
- **Release readiness:** 11/11 PASS
- **Effective Expo config:** PASS
- **Board audio integrity:** PASS (11 supplied MP3 cues)
- Current Chess aggregate full TypeScript/TSX transpile scan: **357 files, 0 syntax diagnostics**

The extracted FULL source intentionally contains no `node_modules` and no generated Android/iOS/build/cache output. `package-lock.json` is not bundled in this source checkpoint; `Family_Bloom_CLEAN_APPLY_FULL.bat` will run `npm install` when dependencies/lock are absent, then validate the installed project.

## Deployment

P2.21 changes client/runtime source only. It does not change Firestore Rules/Indexes or Render server implementation. No Render restart or Firebase deployment is required solely for P2.21 if the current P2.19/P2.20-compatible realtime server is already deployed.

## Real-device acceptance checklist

1. Finish Chess. Result may remain visible, but Chess board/session must already be gone. Close result and start Xiangqi immediately.
2. Finish Xiangqi. The route behind the result must already be Game Hub; it must not show or create another Xiangqi session automatically. Close result and start Chess immediately.
3. From a finished Chess result, test `Chơi lại`; the new game must open with a new id and the old id must never reclaim the surface.
4. Open Family Graph Focus, drag one finger repeatedly in all directions, then pinch. Pan must visibly follow the finger.
5. Close/reopen the same cached Focus branch and confirm the persisted user camera is restored without blocking pan.
