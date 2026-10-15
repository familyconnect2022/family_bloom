# Family Bloom P2.27 — Focus UI-Thread Camera + Deterministic Chess Ready

Date: 2026-10-15  
Base: P2.26 Dedicated Focus Camera + Chess-Only Realtime

## Why P2.27 exists

Real-device validation of P2.26 proved two useful facts:

1. The physically separate Focus camera architecture is correct: Focus can now move independently from the normal Family Graph camera.
2. The P2.26 JS `PanResponder` input path is not acceptable as the final interaction path: pan can stutter and pinch can jump because it runs through the JS responder loop and used touch-local coordinates to derive pinch distance.

The same test also exposed a first-game Chess readiness race: a server game id could clear `surface.preparing` before the persistent native board had completed layout/assets/controllers, which could leave the Ready overlay stuck on "Đang vẽ bàn cờ…" while the server session remained active and therefore correctly blocked Xiangqi.

P2.27 fixes those two mechanisms without changing server authority or the P2.26 two-camera architecture.

## 1. Focus keeps a dedicated camera but returns input to the UI thread

`DedicatedFocusGraphViewport` remains physically separate from `FamilyGraphPrototype` and still owns its own:

- `focusScale` SharedValue;
- `focusTranslateX` SharedValue;
- `focusTranslateY` SharedValue;
- runtime viewport state;
- BSH retained-person state;
- exact Focus camera persistence.

The P2.26 `PanResponder` controller inside this dedicated viewport is removed.

Focus now has its own RNGH/Reanimated controller:

- `Gesture.Pan().minDistance(3).maxPointers(1)`;
- `Gesture.Pinch()`;
- `Gesture.Simultaneous(focusPanGesture, focusPinchGesture)`;
- worklet writes directly to the Focus SharedValues;
- pinch uses RNGH `event.scale`, `event.focalX`, `event.focalY` in one viewport coordinate system;
- one-pointer tail frames after pinch are ignored.

This matches the proven interaction mechanism of the main Family Graph while keeping the two camera systems independent.

## 2. No JS culling work on every drag frame

P2.26 called Focus retained-node discovery from the JS responder move loop.

P2.27 keeps camera movement entirely on the UI thread and commits BSH camera/discovery after gesture finalization. The retained set grows monotonically, so previously painted nodes stay stable while the camera moves.

## 3. Native Modal has one explicit Focus gesture root

The Focus native `Modal` owns one `GestureHandlerRootView` with `unstable_forceActive` around the Focus presentation. The dedicated viewport itself does not create another RNGH root.

The standard Family Graph keeps its own normal route-local root. Therefore the two runtime surfaces have separate camera/input controllers and separate native gesture ownership.

## 4. Chess cold activation can no longer clear preparation early

`activateChessSurface()` no longer unconditionally sets `preparing: false` when a server game id is attached.

For a cold surface it preserves/starts preparation:

`preparing = state.preparing || !state.prepared`

Only `markChessSurfacePrepared()` clears `preparing`, and that function is reached from the board visual-ready gate.

## 5. Chess readiness is retryable at runtime activation

`ChessBoard` still requires all original visual conditions:

- board layout ready;
- every initial piece controller registered;
- every initial piece asset ready;
- two painted animation frames before reporting ready.

P2.27 adds a runtime-activation retry of `maybeReportBoardReady()`. If layout/controllers/assets completed while the board was sleeping, the ready gate is evaluated again when runtime becomes active instead of waiting for a callback that may already have fired.

This makes readiness deterministic without weakening the visual gate.

## 6. Xiangqi lock behavior remains server-authoritative

P2.27 does **not** allow Xiangqi to bypass a real active Chess server session. That would violate the one-active-board-game rule.

The bug was that Chess could become visually stuck while its valid server session remained alive. Fixing deterministic Chess readiness lets the user actually enter/play/end that Chess session; once the server ends it, the existing terminal teardown releases the neutral board-game lease and Xiangqi is available again.

No Xiangqi server/session implementation was changed in P2.27.

## 7. Server unchanged

A byte-for-byte directory comparison between P2.26 and P2.27 `server/` is identical.

No new Render deployment is required solely for P2.27 if Render already runs the current P2.18+ compatible baseline.

## Verification

- P2.27 Focus UI-thread / deterministic Chess ready: **37/37 PASS**
- P2.26 successor: **32/32 PASS**
- P2.25 successor: **53/53 PASS**
- P2.24 successor: **24/24 PASS**
- P2.23 Chess FULL <-> MINI: **30/30 PASS**
- P2.22 successor: **32/32 PASS**
- P2.21 successor: **80/80 PASS**
- P2.20 successor: **48/48 PASS**
- P2.19 successor: **60/60 PASS**
- P2.18 pending lock / lazy board: **86/86 PASS**
- Xiangqi server authority: **45/45 PASS**
- Current Chess aggregate: **21/21 PASS**
- Full TS/TSX transpile scan: **357 files / 0 failures**
- Project structure: **18/18 PASS**
- Release readiness: **11/11 PASS**
- Board audio supplied pack: **11/11 cues PASS**
- Build entrypoints: **22 BAT files PASS**

## Real-device acceptance

Static gates cannot prove final Android touch feel or compositor timing. Validate on the physical device:

1. Open Focus and perform a long one-finger pan; movement should track the finger without the P2.26 JS stutter.
2. Pinch slowly and quickly; scale should follow finger distance without the previous jump/over-zoom.
3. Pan, add a second finger to pinch, release one finger, then pan again; there should be no release kick.
4. Close/reopen the same Focus branch; Focus camera restore must not move the normal-tree camera.
5. Start the first Chess game after app launch. "Đang vẽ bàn cờ…" must clear once the board is actually painted.
6. During a real active Chess server session, Xiangqi must remain blocked. After Chess reaches terminal state, the lock must disappear and Xiangqi must be startable.
7. Exercise Chess FULL -> MINI -> FULL after the readiness fix; game id, clock and socket session must remain unchanged.
