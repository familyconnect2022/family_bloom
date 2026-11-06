# Family Bloom — P2.5 Visual-Ready Startup + No-Reload Return

Date: 2026-10-10
Baseline: P2.4 Frozen Tab Surfaces / Hard Render Isolation

## Scope
P2.5 addresses two remaining sources of perceived startup/tab-return cost:

1. Structural UI could appear before the Ionicons font and before the active tab committed its first frame, producing a white tabbar followed by glyphs painting in.
2. Several transient routes treated focus as invalidation, causing blocking reloads after a simple Parent → Detail → Back round-trip.

## Implemented

### 1) Visual-ready native startup
- RootLayout preloads `Ionicons.font` with `expo-font`.
- Native splash release now requires:
  - auth/profile/membership/navigation readiness,
  - critical visual assets readiness,
  - the active visual surface to report its first committed ready effect.
- A direct deep-link/transient route can release the startup gate without waiting for a tab that is intentionally not mounted.
- Welcome/Chess presentation is also held until first visual readiness to avoid competing with the first frame.

### 2) Active-tab-first startup
- Bottom tabs changed from `lazy:false` to `lazy:true`.
- `detachInactiveScreens={false}` remains, so once a tab mounts it stays persistent.
- `freezeOnBlur:true` remains, so inactive mounted tabs do not participate in normal React work.
- Remaining tabs are optionally preloaded one-by-one using React Navigation `preload()` through `BloomTaskScheduler` at `IDLE` priority.
- If preload is unavailable, P2.5 deliberately does not force hidden mounts; first visit remains the fallback.

### 3) TabStartup ownership
- Removed dependency on root feature realtime contexts.
- Startup readiness is now released by the first mounted active surface rather than waiting for all five tabs/data heads.
- Provider is keyed by account/family session.
- 2.5s bounded safety fallback prevents a broken feature from trapping the native splash.

### 4) Home first-frame cost
- Existing family warm cache remains the primary first-paint data path.
- Cache-miss skeleton geometry is now static; multiple independent opacity loops were removed from Home startup.

### 5) Time Capsule — Back != Refresh
- List screen no longer reloads on route focus.
- Recipient + creator realtime subscriptions remain authoritative while the list route stays mounted.
- Pull-to-refresh remains available for explicit user refresh.
- Detail screen performs initial load once, then revalidates only when:
  - an in-process capsule mutation version changed, or
  - a 60s TTL expired (covers external-device edits while hidden).
- Create/update/remove/open-summary mutations bump a local capsule mutation version.

### 6) Notifications — short-return cache
- Added in-memory projection cache keyed by user/family-membership/preferences.
- A short detail round trip no longer fetches activity + smart reminders for every family again.
- Focus revalidates only after a 30s TTL; cached rows remain visible during silent refresh.

### 7) Family Graph — identical snapshot containment
- Realtime reconnect after focus is still allowed.
- Incoming graph snapshots are fingerprinted before React state replacement.
- Identical snapshot = no `setSnapshot`, no graph visual/query-engine rebuild.

### 8) Focus audit result
Remaining `useFocusEffect` ownership is intentional:
- Chess route: persistent game-surface activate/minimize.
- Xiangqi: heavy-surface lifecycle.
- Home Games: visible-only timer + realtime listener.
- Family Graph/Admin: visible-only graph realtime subscription.
- Tabs layout: one tiny navigator focus bridge.
- Notifications/Time Capsule Detail: conditional invalidation only; no unconditional load-on-focus.

## Safety / compatibility
- No Firestore Rules changes.
- No Firestore index changes.
- No Render/Socket server changes.
- No native dependency changes; `expo-font` already exists in the project.
- Copy-over workflow remains supported.

## Verification performed on source
- P2.5: 20/20 PASS
- P2.4: 41/41 PASS
- P2.3: 23/23 PASS
- P2.2: 14/14 PASS
- P2.1: 32/32 PASS
- P2: 49/49 PASS
- Five-tab lifecycle: 56/56 PASS
- Phase 17.1 tab-switch: 41/41 PASS
- Moments: 42/42 PASS
- Planner: 47/47 PASS
- Time Capsule functional: 49/49 PASS
- Time Capsule realtime: 16/16 PASS
- Time Capsule horizontal/live state successor: 26/26 + 18/18 PASS
- Home functional: PASS, TS/TSX 322/322
- Graph focus isolation: PASS, TS/TSX 322/322
- Release readiness: 11/11 PASS
- Chess/Xiangqi aggregate: 20/20 groups PASS
- A9 full source transpile: 337 TS/TSX PASS (covered by current Chess aggregate)

## Test focus on device
1. Cold-start the app from a killed process. The native splash should hand off to a complete tabbar; no white tabbar then staggered icon paint.
2. Immediately tap Moments/Planner before idle prewarm completes; user interaction must win.
3. Home → Time Capsule list → open capsule → Back. The list must appear immediately without a blocking “Bloom đang tìm...” reload.
4. Notifications → Event/Moment/detail → Back within 30s. Existing list must remain visible; no full-screen reload.
5. Family Graph → transient editor/detail → Back. Reconnect may occur, but an identical graph snapshot must not visibly rebuild the graph.
