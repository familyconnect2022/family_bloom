# Family Bloom — Phase 17.1 Build Report

**Checkpoint:** Five-Tab Runtime Lifecycle Tab-Switch Hotfix  
**Base:** Phase 17 FULL CODE (built on Phase 16B.18)  
**Date:** 2026-10-06

## Why this hotfix exists

Real-device video `4078.mp4` showed that Phase 17 made frequent main-tab switching feel heavier instead of smoother. Static lifecycle gates were passing, but the navigation implementation introduced work on the critical visual path. Phase 17.1 keeps the lifecycle resource ownership while removing the navigation-layer regressions.

## Root causes confirmed in Phase 17 source

1. `lazy: true` caused first visits to construct tab screens during the user's switch.
2. `freezeOnBlur: true` and `detachInactiveScreens={true}` forced Android to freeze/detach/reattach main-tab surfaces even though the intended optimization was only to sleep listeners/timers.
3. `useTabRuntime()` used `useSyncExternalStore` in every heavy tab screen even though all five callers discarded its returned snapshot. Each runtime transition could therefore re-render the whole tab. The incoming screen could render for `restoring` and again for `active` only 34 ms later.
4. Focus-scoped live work restarted 34 ms after focus, producing a second burst of listener/subscription work while the tab switch was still being perceived.
5. Once eager warm tabs are restored, the Phase 17 lazy-startup shortcut is no longer appropriate; it could reveal the app while other eager tab shells were still initializing.

## Phase 17.1 changes

### Navigator

- Restored `lazy: false`, matching the proven pre-Phase-17 tab behavior.
- Removed `freezeOnBlur`.
- Removed forced `detachInactiveScreens`.
- Main tab screen switching remains `animation: none`; only the lightweight bottom indicator animates on the UI thread.
- All five tab surfaces are warmed during startup and remain available for instant revisit.

### Runtime registration

- `useTabRuntime(tabId)` now owns only focus/blur registration.
- It does **not** subscribe the heavy screen to runtime state transitions.
- Added separate `useTabRuntimeSnapshot(tabId)` for future diagnostics/lightweight UI that genuinely needs reactive runtime state.
- The five production tab screens do not use the reactive snapshot hook.

### Resource lifecycle

The useful Phase 17 behavior remains:

- one focused tab owns live screen-specific work;
- blur invalidates the runtime epoch;
- stale async callbacks are rejected;
- Home badge refresh, Moments moderation, Planner month/list/past/moderation, Family pending reviews, and Nhà Mình Time Capsule listener/timer remain focus-scoped;
- background suspends tab live work;
- global Auth, FamilyRealtime, notification/inbox and Chess foreground realtime remain outside tab lifecycle.

Live-resource resume is moved from **34 ms to 210 ms** after focus. The already-rendered warm tab becomes visible immediately; listener/timer reactivation happens after the visual tab switch has settled instead of competing with it.

### Startup

- Restored the eager startup contract from Phase 16B.18: all five mounted tab shells report ready before the startup gate releases (with the existing bounded timeout fallback).
- This intentionally spends initialization while the startup shield owns the screen rather than leaking hidden-tab initialization into the first visible tab switches.

## Protected areas

Byte-identical to Phase 16B.18:

- `src/components/chess/ChessBoard.tsx`
- `src/components/chess/v2/ChessPiece.tsx`
- `src/components/xiangqi/XiangqiGameBoard.tsx`
- Chess game route
- Xiangqi game route
- Render Chess socket server
- Firestore Rules and indexes

No Render restart or Firebase deployment is required for Phase 17.1.

## Validation

- Phase 17 lifecycle/hotfix gate: **56/56 PASS**
- Phase 17.1 focused tab-switch gate: **40/40 PASS**
- Phase 16B.18: **22/22 PASS**
- Phase 16B.17: **38/38 PASS**
- Phase 16B.16: **48/48 PASS**
- Phase 16B.15: **51/51 PASS**
- Phase 16B.14: **51/51 PASS**
- Phase 16B Xiangqi: **26/26 PASS**
- Current Chess aggregate: **16/16 gate groups PASS**
- Phase 15B.3: **18/18 PASS**
- Release readiness: **11/11 PASS**
- TypeScript/TSX changed hot-path transpile: PASS

These are static/code regression gates. Real Android acceptance is required for frame pacing.

## Real-device acceptance

1. From a warmed app, switch `Trang nhà → Kỷ niệm → Lịch → Cây nhà → Nhà Mình` three to five loops.
2. Repeat in reverse order.
3. Pause 1–2 seconds on each tab and scroll immediately after arrival.
4. Enter/leave Chess or Xiangqi, then repeat the five-tab loop.
5. Background for ~5 seconds, foreground, then repeat.

Success criterion: switching must be at least as immediate as Phase 16B.18 while hidden tab listeners/timers still stop. Do not proceed to Phase 18 if real-device switching remains worse.

## Copy-over

The FULL package contains the current fixed PRE-COPY and POST-COPY BAT files in the ZIP root.

1. Run `Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` against the current project.
2. Overlay the entire Phase 17.1 FULL package.
3. Run `Family_Bloom_CLEAN_APPLY_FULL.bat`.
4. Run `npx expo start -c` or the normal Android Debug/Release BAT.
