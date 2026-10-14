# Phase 8.2C — Tab Regression Correction

Status: IMPLEMENTED · AWAITING REAL-DEVICE RETEST

## Why this correction exists

Real Android measurements after Phase 8.2B showed that the extra paint-yield scheduling did not materially improve 300/500 Person first paint, while Full Tree completion became slower and tab transitions became visibly worse. The device report included repeated ~0.7–1.0 s tab transitions early in the session and listener-open work occurring inside tab traces.

Phase 8.2C therefore treats the original Phase 8.2 device result as the performance baseline and removes only the 8.2B scheduling strategy that regressed interaction responsiveness.

## Kept from Phase 8.2 / 8.2B

- Phase 8.2 indexed Family Graph layout architecture.
- Viewport working-set connector routing.
- `requestedRouteConnections` / scoped routing work.
- Partner adjacency indexing (`partnerIdsByPerson`) to avoid repeated relationship scans.
- Performance Test Lab.
- Tab phase and listener-open instrumentation.
- All Phase 8.3–8.5 reliability/multi-family features.

## Corrected

### Graph

Removed the 8.2B per-batch `requestAnimationFrame -> idle` scheduler, adaptive tiny Full Tree batches, first-paint expansion gate, and connector-after-multiple-frames gate. Full Tree returns to the proven Phase 8.2 idle progressive scheduler (`64/48` config ceiling) while retaining safe indexing/routing optimizations.

### Moments

- The admin moderation listener is stable for the active family while the app is active.
- It no longer closes/reopens for every Moments tab visit.
- Comment/reaction realtime remains bounded to visible cards and only runs while Moments is focused.
- Focused visible-card work resumes after one animation frame, not an additional idle wait.

### Planner

- The active-family month/list listener is stable while the app is active and its mode needs it.
- Admin moderation listener is stable while the app is active.
- Tab focus is retained only for performance tracing, not to toggle Firestore listeners.

### Family pending-review badges

The two bounded `limit(1)` pending-review listeners now live for the active admin family while the app is active instead of reopening every time the Family tab is selected.

This intentionally accepts a few stable bounded listeners in exchange for eliminating subscription churn on every tab press.

## Expected device behavior

- Typical tab switches should return toward the earlier ~150–250 ms range after warm-up.
- Listener count may be higher than the previous five-listener idle baseline for admin accounts, but it should remain stable and must not grow after repeated tab switching.
- 300/500 Person Full Tree should not regress versus the Phase 8.2/8.3–8.5 device baseline because the rejected 8.2B scheduler is removed.

## Data / deploy impact

- No Firestore schema change.
- No migration.
- No Rules change.
- No Functions deployment.
- No native dependency change.
- `USE_CLOUD_FUNCTIONS=false` remains unchanged.
