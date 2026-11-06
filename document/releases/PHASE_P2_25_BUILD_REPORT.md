# Family Bloom P2.25 — Server-Owned Board Sessions + Focus PanResponder

Date: 2026-10-14  
Base: P2.24 Focus Native-Modal Gesture + Xiangqi Identity

## Why P2.25 exists

Real-device validation after P2.24 exposed two architecture failures that could not be treated as isolated UI bugs:

1. Family Graph Focus still received neither pan nor pinch on the tested Android device even after the RNGH Modal-root ownership changes. Static source looked valid, but device behavior proved that the Focus native Modal gesture path itself could not be trusted.
2. After a Xiangqi session had existed, choosing Chess could show Xiangqi recovery/waiting UI. The client let Chess recovery carry `busyOtherGame` Xiangqi identity and use it for routing/presentation. This allowed stale cross-game state to outlive the server session that created it.

P2.25 removes both sources of ambiguity instead of adding another timing/root workaround.

## 1. Server owns every board-game session lifetime

The canonical rule is now:

`server session alive -> client may mirror it`

`server finished / expired / not-found / none -> matching local session is deleted immediately`

A cached game id, retained board, route, recovery receipt, or presentation rail can never extend the lifetime of a server session.

### Chess owns only Chess

`ChessRealtimeContext` no longer stores or exposes a Xiangqi `busyOtherGame` payload. It exposes only the neutral boolean `otherBoardGameActive` when the Chess server proves another board game currently blocks Chess creation.

Chess recovery may:

- recover/clear a Chess session;
- hold the neutral cross-game lock;
- never create, present, route, or retain Xiangqi identity.

If Chess recovery returns another game, pending, none, finished, or if `gameJoin` reports the Chess game finished/not-found, stale local Chess state is dropped immediately.

`BoardGameSessionBridge` mirrors only server-confirmed `activeGameId` into a Chess lease. It never claims Xiangqi from Chess recovery and never syncs the presentation rail unless the Chess claim actually succeeds.

Chess Lobby and Chess game routes contain no route to Xiangqi.

### Xiangqi owns only Xiangqi

`resolveOrCreateXiangqiSession()` is now the authority boundary for Xiangqi route entry/recovery.

A retained local Xiangqi lease is never accepted as proof that a live server session exists. The resolver always validates the Xiangqi transport first:

- `active` + successful `gameJoin` -> reuse that authoritative Xiangqi game;
- `finished_unseen` -> delete local Xiangqi lease, ACK history receipt, then allow a fresh Xiangqi creation;
- `none` -> delete local Xiangqi lease before fresh creation;
- `busy_other_game` -> delete stale local Xiangqi lease and return a neutral Chess-busy result;
- server says `active` but `gameJoin` returns finished/not-found -> delete local Xiangqi state and do not create a second game behind the failed recovery.

The Xiangqi route no longer imports Chess realtime, never claims/routes Chess, and cannot raise a retained Xiangqi board before server validation succeeds.

`XiangqiSurfaceHost` also tears down the local Xiangqi lease/runtime if a known game id is rejected by the server as finished/not-found.

### Shared lock remains neutral

The existing one-board-game-per-user pending/active lock remains. It is only arbitration; it is not a shared session object.

Chess session data stays in Chess. Xiangqi session data stays in Xiangqi.

## 2. Focus bypasses RNGH entirely

P2.24 proved that a source-correct RNGH hierarchy was still insufficient on the tested Android native Modal. P2.25 therefore removes RNGH from Focus interaction rather than adding another root/flag.

Focus uses React Native `PanResponder` directly on the Focus viewport:

- one finger -> pan;
- two fingers -> pinch using touch distance;
- pinch preserves the canvas point underneath the two-finger focal point;
- release/termination commits the exact final camera into the existing retained Focus camera state.

The existing dedicated Focus SharedValues remain the render source, so scene transforms still update without React layout churn.

Standard Family Graph is unchanged and continues using the existing RNGH simultaneous Pan + Pinch path.

### Touch blockers removed from Focus

The native Focus Modal root is now a normal `View`, not a force-active RNGH root.

The old full-screen backdrop `Pressable` is replaced with a `pointerEvents="none"` View, so the Modal contains no full-screen responder competing with the Focus viewport. Focus closes through its explicit controls.

## 3. Preserved behavior

- P2.23 Chess FULL <-> MINI keeps one session/gameId and canonical route ownership.
- P2.24 Xiangqi `myName` lexical-scope fix remains.
- terminal result UI remains independent from a dead gameplay session.
- shared pending lock still prevents simultaneous Chess/Xiangqi creation.
- no board is prewarmed at app startup.
- no global/root Family Graph Focus host is reintroduced.

## 4. Regression protection

New `phaseP2_25:check` covers 53 invariants, including:

- Focus PanResponder pan/pinch/focal-anchor path;
- no Focus `unstable_forceActive` dependency;
- no full-screen Focus touch shield;
- standard graph RNGH preserved;
- no runtime `busyOtherGame` payload;
- Chess routes cannot route Xiangqi;
- Xiangqi routes cannot import/route Chess;
- server-confirmed Chess id is the only Chess reopen id;
- retained Xiangqi lease cannot bypass server recovery;
- finished/none/not-found Xiangqi state clears local lifetime;
- rail sync occurs only after a successful canonical claim;
- CLEAN APPLY and Android Debug/Release include the P2.25 gate.

Historical successor gates were updated only where they encoded the retired cross-game/RNGH implementation shape; their behavior contracts remain active.

## 5. Verification

Final verification before packaging:

- **P2.25 server-owned sessions + Focus PanResponder:** 53/53 PASS
- **P2.24 successor:** 24/24 PASS
- **P2.23 Chess FULL/MINI ownership:** 30/30 PASS
- **P2.22 audio/quiescence successor:** 32/32 PASS
- **P2.20 clean lifecycle/Focus:** 48/48 PASS
- **P2.19 route ownership:** 60/60 PASS
- **P2.18 pending lock/lazy shared board:** 86/86 PASS
- **P2.17.1 shared Xiangqi transport/graph first paint:** 25/25 PASS
- **Xiangqi server authority A16:** 45/45 PASS
- **Current Chess aggregate:** 21/21 PASS
- **Current aggregate TS/TSX transpile scan:** 357 files
- **Project structure:** 18/18 PASS
- **Release readiness:** 11/11 PASS
- **Build entrypoint audit:** 22 BAT files PASS

## 6. Server / deployment

The complete `server/` directory in P2.25 is byte-for-byte identical to P2.24.

P2.25 itself therefore introduces no Render server change and no Firestore Rules/Indexes change. If Render is already on the current P2.18+ shared-lock server baseline, no new server deployment is required for P2.25. If Render was never updated to that baseline, deploy the `server/` directory from this FULL package once before judging cross-game recovery.

## 7. Real-device acceptance target

1. Finish/leave Xiangqi, then tap Chess: only Chess may open; no Xiangqi waiting/recovery screen may appear.
2. Finish/leave Chess, then tap Xiangqi: Xiangqi must validate its own server session; dead local ids must disappear automatically.
3. Kill/reopen the app with an expired/deleted Xiangqi or Chess id cached locally: server `none`/finished/not-found must erase that local session rather than revive it.
4. Chess FULL -> MINI -> FULL repeatedly: same game id/clock/session throughout.
5. Open Family Graph Focus and drag one finger immediately: pan must track the finger.
6. Use two fingers in the same Focus session: pinch must zoom around the finger focal point.
7. Close/reopen a cached Focus branch and repeat pan/pinch.

Static gates cannot prove Android touch delivery. The Focus PanResponder change deliberately uses a different native responder path than every failed RNGH attempt, but physical-device validation remains the final acceptance criterion.
