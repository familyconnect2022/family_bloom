# Family Bloom — Phase 8.5B Runtime Singleton + Navigation Stack Optimization

Date: 2026-09-25

## Why this correction exists

Real Android report after Phase 8.2C showed tab latency largely recovered (~210–320 ms most successful switches), but listener diagnostics exposed a persistent runtime duplication:

```text
moments.moderation_hidden = 3
planner.events.month = 3
planner.moderation_hidden = 3
reviews.join_pending = 3
reviews.proposal_pending = 3
```

Core FamilyRealtimeProvider listeners remained exactly one each. Source audit found that the Performance Lab used `router.replace("/(tabs)")` when starting the 30-second probe. Because the original Tabs navigator remained lower in the root Stack, repeated tests could leave multiple Tabs trees mounted. The hidden Performance Lab also remained subscribed to every performance-service emit while Graph tests ran, adding benchmark overhead.

## Fixes

### 1. Stop creating duplicate Tabs navigators

- Performance Lab now unwinds the test stack with `router.dismissAll()` (fallback `router.navigate`) instead of replacing itself with a new Tabs route.
- Graph test returns to the existing Performance Lab with `router.back()`.
- Cross-domain links from Person Detail and Chat use `router.navigate(...)` for existing tab routes instead of explicit `push(...)`.
- Family Switcher and multi-family membership switching reuse/unwind to the existing Tabs navigator instead of replacing a nested route with a new Tabs route.
- Root auth/profile gates keep `replace` where no existing valid Tabs workspace should be reused.
- Root family-transition handling now uses `navigate`/unwind when a detail or membership route is sitting above an existing Tabs workspace; this closes a second non-test path that could otherwise retain duplicate Tabs trees.

### 2. Firestore identical-query singleton safety net

New runtime utility:

```text
src/services/realtime/sharedRealtimeRegistry.ts
```

It ref-counts identical bounded realtime queries by stable key. Multiple mounted consumers receive the same latest snapshot, while exactly one underlying Firestore listener is kept. The listener is released when the final consumer leaves.

Applied to:

```text
reviews.join_pending
reviews.proposal_pending
moments.moderation_hidden
planner.events.month
planner.moderation_hidden
planner.events.past
planner local upcoming/yearly fallback
```

This is runtime-only. It does not persist or share data across different family IDs/query keys.

### 3. Performance harness no longer distorts its own result

- Performance report screen subscribes to performance-service changes only while focused.
- Hidden Performance Lab no longer re-renders on every Graph mark/metric.
- Graph progressive counter UI is throttled (~250 ms) instead of updating its parent on every progressive batch.
- New metrics separate:
  - data-ready → first paint (React/render portion)
  - first paint → full progressive mount (tail)
- Performance report now tracks `tabs.navigator` mount count. Normal target is exactly `1`.

## Preserved architecture

- Phase 8.2 Graph relationship indexing.
- viewport-working-set connector routing.
- bounded pre-layout Graph mount.
- proven 8.2 idle progressive scheduler restored by 8.2C.
- Phase 8.3 offline retry / multi-family Moment.
- Phase 8.4 splash + spacing work.
- Phase 8.5 Person-directory in-flight dedupe.
- Performance Lab remains in source until release preparation.

## Expected device result

For an admin account in calendar mode the exact listener total can vary by role/mode, but each named singleton query should normally report `1`, never `3` after repeated tests.

Critical diagnostics:

```text
Tracked runtime mounts active:
- tabs.navigator: 1

Repeated tab switches:
listener counts remain stable
no 1 → 2 → 3 growth
```

The next Android report should be generated only after a full app restart / Metro clear so stale navigation state from the older test build cannot contaminate the measurement.

## Deploy impact

```text
Firestore schema: unchanged
Rules: unchanged
Functions: unchanged / not deployed
Blaze: not required
native dependency: none
migration: none
USE_CLOUD_FUNCTIONS=false
```

## Status

```text
IMPLEMENTED
STATIC/SYNTHETIC REGRESSION PASS
AWAITING REAL ANDROID RETEST
```
