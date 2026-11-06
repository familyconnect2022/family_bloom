# Family Bloom — P2.3 Zero-Work Tab Press

Date: 2026-10-10
Base: P2.2 Provider Boundary Route Safety
Scope: Android main-tab tactile response only; no Firestore schema/rules/index/server protocol changes.

## Goal

Make the first touch frame of the bottom tabbar do visual work only. Navigation commit, lifecycle handoff and feature live-work resume must not compete with the pill/icon response or the 152 ms scene handoff.

## Runtime changes

### 1. UI-thread visual response on touch-down
- `src/app/(tabs)/_layout.tsx`
- Added `visualTargetIndex` SharedValue for active icon color.
- Pill movement and icon active color start immediately from `onPressIn`.
- The touch-down path does not navigate, transfer tab lifecycle ownership, or drain the task scheduler.
- A single animated Ionicons glyph is retained per tab; no dual-icon overlay regression.

### 2. Navigation commit moves off the touch frame
- Route commit is scheduled on the next animation frame.
- A commit generation token invalidates stale delayed commits during rapid multi-tab tapping.
- `latest-tap-wins` behavior remains.
- Prevented tab presses restore the visual target safely.

### 3. Outgoing surface is frozen through visual handoff
- `src/context/TabRuntimeContext.tsx`
- Added `TAB_HANDOFF_FREEZE_MS = 176`.
- The outgoing ACTIVE surface is not immediately moved to WARM when focus leaves.
- This prevents teardown/rerender/listener shutdown from competing with the 152 ms scene transition.
- Rapid tap-back can reclaim the still-frozen outgoing surface without forcing a needless ACTIVE -> RESTORING -> ACTIVE cycle.

### 4. Incoming heavy work still waits until after visual settle
- `TAB_RESTORE_DELAY_MS = 210` remains.
- New surface can paint its already-mounted/cached visual state first.
- Live feature work resumes only after the visual transition window.

### 5. Stable/memoized tab buttons
- Bottom tab buttons are memoized.
- Active icon treatment is driven by SharedValue rather than React `focused` color churn on the first touch frame.

## Why this targets the observed lag

Before P2.3, changing tab lifecycle during tab press could notify feature subscribers immediately. In Moments, for example, many rows can observe `screenFocused=false` and start realtime/visual teardown while the tab scene is still moving. P2.3 freezes that work until after handoff instead of trying to make the animation itself shorter.

## Historical gate maintenance

Several historical gates encoded superseded implementation details rather than behavior. They were updated only where the successor architecture is stronger/equivalent:
- React `focused` icon color -> P2.3 SharedValue icon color.
- immediate `prepareFocus()` -> deferred route commit + handoff freeze.
- old Planner `eventDays Set` -> P2 Calendar `DaySummary` projection.
- old Home root realtime/boot assumptions -> P2 cache bridge + isolated Home Activity signal store.
- `phase17_1` now identifies the current `useTabRuntime` registration boundary and recognizes `HomeActivityBell` as the focus-scoped badge owner.

No runtime feature was reverted to satisfy an obsolete assertion.

## New regression gate

`npm run phaseP2_3:check`

P2.3 gate result: **23/23 PASS**.

It verifies:
- touch-down only mutates UI-thread visual state,
- deferred next-frame navigation commit,
- stale commit cancellation,
- no synchronous `prepareFocus` on tab press,
- scheduler interaction starts only at deferred commit,
- prevented press visual rollback,
- one animated icon glyph,
- memoized tab buttons,
- outgoing handoff freeze > scene duration,
- rapid tap-back reuse,
- 210 ms live-work restore delay,
- background timer cleanup,
- wiring into copy-over/debug/release scripts.

## Regression status on final source

- P2.3: 23/23 PASS
- P2.2: 14/14 PASS
- P2.1: 32/32 PASS
- P2: 49/49 PASS
- P1: 32/32 PASS
- P1.1: 25/25 PASS
- P1.2: 26/26 PASS
- Phase 17 five-tab lifecycle: 56/56 PASS
- Phase 17.1 tab-switch successor gate: 41/41 PASS
- A9 Chess lifecycle/mini/premove: 44/44 PASS
- A10: 21/21 PASS
- A11: 31/31 PASS
- A12: 20/20 PASS
- A15: 27/27 PASS
- A16: 44/44 PASS
- A17 Native-Persistent Tabbar: 33/33 PASS
- A18 Single-Icon Tabbar: 15/15 PASS
- Moments: 42/42 PASS
- Planner stable architecture: 45/45 PASS
- Planner restore successor: 31/31 PASS
- Shared Event UI-thread navigation: 52/52 PASS
- Xiangqi playable: 28/28 PASS
- Web W1: 49/49 PASS
- Web W2: 88/88 PASS
- Web W3: 34/34 PASS
- Release readiness: 11/11 PASS
- Current Chess aggregate: 20/20 groups PASS
- A11 full TS/TSX transpile scan: 337 files clean

## Device test focus

Test these patterns on the physical Android device:
1. Home -> Moments -> Home repeatedly.
2. Moments -> Planner and Planner -> Moments.
3. Home -> Planner -> Home with fast taps.
4. Rapidly tap all five tabs; final tapped tab must win.
5. First tab switch after cold start.
6. Switch away from a long Moments feed, then return; scroll/visual state should remain stable.
7. Enter/leave Chess while tab activity exists to ensure no lifecycle regression.

Expected user-visible result:
- pill/icon acknowledge touch immediately,
- less hitch when leaving heavy tabs,
- data/listener resume happens after visual settle rather than during the tab animation.

If tactile lag remains clearly visible after P2.3, the next bottleneck is more likely native navigation/scene commit or first-paint work of the incoming surface, not pill easing/duration.

## Deployment impact

No change required to:
- Firestore Rules
- Firestore indexes
- Render server
- Socket protocol
- Firebase schema

No new native dependency was added solely for P2.3.
