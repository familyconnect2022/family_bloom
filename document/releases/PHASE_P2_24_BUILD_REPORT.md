# Family Bloom P2.24 — Focus Native-Modal Gesture Ownership + Xiangqi Identity Scope

Date: 2026-10-14  
Base: P2.23 Canonical Chess FULL ↔ MINI Route Ownership

## Why P2.24 exists

Real-device validation after P2.23 exposed two independent client runtime defects:

1. Xiangqi crashed at render with `Property 'myName' doesn't exist` because `XiangqiPreparedSurface` rendered `name={myName}` without declaring that identifier in its own lexical scope.
2. Family Graph Focus still received neither one-finger pan nor pinch zoom. The dedicated camera math was intact, but the Focus graph created a second `GestureHandlerRootView` inside the native Modal. `unstable_forceActive` was attached to that inner root rather than the Modal-window root that actually owns Android touch delivery.

## Xiangqi identity fix

`XiangqiPreparedSurface` now derives `myName` locally from the already-available authenticated identity:

`shortName -> displayName -> Firebase displayName -> "Bạn"`

No new state, network request, socket event, or server protocol is involved. The PlayerRail therefore cannot reference an out-of-scope route/local variable.

## Focus gesture ownership fix

Focus now has one effective RNGH root in its native Modal window:

`Modal -> GestureHandlerRootView(unstable_forceActive) -> Focus card -> plain graph boundary -> GestureDetector(Pan + Pinch)`

Standard Family Graph keeps its local `GestureHandlerRootView`. The `focusOverlay` rendering path intentionally substitutes a plain `View`, preventing a nested root from silently becoming the ignored root while carrying the force-active flag.

The dedicated Focus SharedValues, simultaneous Pan + Pinch gestures, persisted Focus camera, BSH visual hydration, and 85% native-window geometry are unchanged.

## Regression protection

New `phaseP2_24:check` verifies:

- Modal-window root owns `unstable_forceActive`;
- Focus graph path uses a plain `View` boundary;
- the retired inner Focus force-active root is absent;
- Pan + Pinch remain simultaneous;
- Xiangqi `myName` is declared inside `XiangqiPreparedSurface` and uses the intended identity fallback chain;
- P2.24 is wired into CLEAN APPLY and Android Debug/Release build entrypoints.

P2.22's historical Focus assertion is updated to the P2.24 successor invariant so CLEAN APPLY cannot reintroduce the incorrect inner-root architecture.

## Deployment

P2.24 changes client/runtime source only. It does not modify the Render server protocol or Firestore Rules/Indexes. If Render has already been updated to the current P2.18+ server baseline, no server deployment is required solely for P2.24.

## Verification

Final successor/runtime verification before packaging:

- P2.24 Focus/Xiangqi gate: **24/24 PASS**
- P2.23 Chess FULL/MINI ownership: **30/30 PASS**
- P2.22 pan/audio/quiescence successor: **32/32 PASS**
- P2.21 terminal teardown/Focus camera: **80/80 PASS**
- P2.20 lifecycle/Focus geometry: **48/48 PASS**
- P2.19 route ownership: **60/60 PASS**
- P2.18 pending lock/lazy shared board: **86/86 PASS**
- Current Chess aggregate: **21/21 PASS**
- Current aggregate TS/TSX transpile scan: **357 files**
- Xiangqi server-authority A16: **45/45 PASS**
- Project structure: **18/18 PASS**
- Release readiness: **11/11 PASS**
- Build entrypoint audit: **22 BAT files PASS**
- Effective Expo config: **PASS**
- Board audio integrity: **11 supplied MP3 cues PASS**

## Real-device acceptance target

1. Open Xiangqi: no `myName` Render Error; the red rail shows the current member name/fallback.
2. Open Family Graph Focus and drag one finger immediately after visual-ready: the scene follows the finger.
3. Pinch in/out repeatedly in the same Focus session: scale changes continuously without closing/reopening.
4. Close/reopen Focus on a cached branch: dedicated camera hydration remains usable and pan/pinch still respond.
5. Re-test Chess FULL -> MINI -> FULL to confirm P2.23 ownership remains intact.
