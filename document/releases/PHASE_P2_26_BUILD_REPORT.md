# Family Bloom P2.26 — Dedicated Focus Camera + Chess-Only Realtime

Date: 2026-10-15  
Base: P2.25 Server-Owned Sessions + Focus PanResponder

## Why P2.26 exists

Real-device testing showed that Focus pan/pinch still failed even after changing the Focus input path from RNGH to PanResponder. Source inspection also showed that the Focus surface was still implemented by re-entering `FamilyGraphPrototype`, where Focus and normal-tree transforms flowed through the same `activeCamera*` controller path. In parallel, Chess still exposed a retained `otherBoardGameActive` boolean even after P2.25 removed Xiangqi identity from that context.

P2.26 removes both residual couplings rather than adding another gesture flag or cross-game condition.

## 1. Focus now owns a physically separate camera system

`PersistentFocusGraphSurface` no longer renders `FamilyGraphPrototype` with `surfaceMode="focusOverlay"`.

It renders `DedicatedFocusGraphViewport`, which owns its own:

- `focusScale` SharedValue;
- `focusTranslateX` SharedValue;
- `focusTranslateY` SharedValue;
- PanResponder instance;
- pinch focal/anchor state;
- viewport measurement;
- retained-person discovery;
- BSH runtime hydration and exact user-camera persistence.

The Focus surface shares only immutable renderer-ready data with the standard graph:

`BSH scene -> precomputed layout -> precomputed geometry -> PersonNode/connector renderer`

It does **not** share the normal graph's camera controller, RNGH gestures, auto-centering effects, or `activeCamera*` aliases.

The normal Family Graph keeps its existing RNGH + Reanimated camera path unchanged.

## 2. Focus retained rendering stays BSH-compatible

The dedicated Focus viewport hydrates retained IDs from `hydrateFamilyGraphRuntimeState()`, queries its own spatial grid as the camera moves, grows retained IDs monotonically, and persists explored IDs through `retainFamilyGraphRuntimePersonIds()`.

When a user finishes pan/pinch, the exact final Focus camera is persisted through `updateFamilyGraphRuntimeCamera()`. Closing and reopening the same revision-safe Focus scene can therefore restore the Focus camera without touching the normal-tree camera.

## 3. Chess realtime context is now Chess-only

Removed `otherBoardGameActive` from:

- `ChessRealtimeContext` public value;
- provider React state;
- `useChessLobby()`;
- Chess Lobby behavior;
- Home Chess-open behavior.

When Chess `sessionRecover` receives `busy_other_game`, the Chess provider now treats that only as:

`no Chess session is recoverable`

It drops retained Chess state, clears stale pending data, and normalizes Chess recovery to `none`. It does not retain the other game's kind/id and does not route or present another game.

Cross-game creation protection remains in the neutral pending reservation store and in authoritative server mutation validation. Xiangqi continues to validate its own lifetime through its own resolver.

## 4. Server unchanged

A byte-for-byte directory comparison between P2.25 and P2.26 `server/` is identical.

P2.26 requires no new Render deployment if the deployed Render server is already on the current P2.18+ compatible baseline. If Render has never been updated to that baseline, deploy the `server/` folder once before evaluating cross-game behavior.

## Verification

- P2.26 dedicated Focus camera / Chess-only realtime: **32/32 PASS**
- P2.25 server-owned sessions / Focus PanResponder: **53/53 PASS**
- P2.24 Focus gesture / Xiangqi identity: **24/24 PASS**
- P2.23 Chess FULL <-> MINI ownership: **30/30 PASS**
- P2.22 successor: **32/32 PASS**
- P2.21 successor: **80/80 PASS**
- P2.20 successor: **48/48 PASS**
- P2.19 successor: **60/60 PASS**
- P2.18 pending lock / lazy board: **86/86 PASS**
- Xiangqi server authority: **45/45 PASS**
- Current Chess aggregate: **21/21 PASS**
- Current Chess full TS/TSX transpile scan: **357 files**
- Project structure: **18/18 PASS**
- Release readiness: **11/11 PASS**
- Board audio integrity: **11/11 supplied MP3 cues PASS**
- Build entrypoints: **22 BAT files PASS**

## Real-device acceptance

Static/source gates cannot prove Android touch delivery or compositor timing. Test these on the physical device:

1. Open Focus View and pan one finger immediately.
2. Pinch with two fingers, including pinch after a one-finger pan.
3. Close/reopen the same Focus branch and confirm its Focus camera restores without moving the normal Family Graph camera.
4. Finish Xiangqi, then open Chess. Chess must never show Xiangqi loading/session UI.
5. Finish Chess, then open Xiangqi. Xiangqi must validate its own server session and never consume Chess state.
6. Exercise Chess FULL -> MINI -> FULL repeatedly; game id, clock and socket session must remain unchanged.
