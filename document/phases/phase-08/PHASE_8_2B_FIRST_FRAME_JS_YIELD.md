> **SUPERSEDED 2026-09-25:** Phase 8.2B scheduling/yield behavior was rejected after real-device tab regression. Current authority is Phase 8.2C. Keep this file only as historical evidence.

# Family Bloom — Phase 8.2B First Frame & JS Yield Optimization

Date: 2026-09-25  
Base: **Phase 8.3–8.5 FULL, itself built on the Phase 8.2 optimized Graph base**  
Status: **IMPLEMENTED · AWAITING REAL-DEVICE RETEST**

## Why this pass exists

The real Android report after Phase 8.2 confirmed the optimization direction was effective, but exposed one remaining class of bottleneck:

```text
300 Person first paint: ~5765ms -> 3626ms
300 Person full progressive: ~7872ms -> 4097ms
500 Person first paint: ~9258ms -> 5917ms
500 Person full progressive: ~18571ms -> 6741ms
```

The same report also recorded one very large JS timer drift (~6372ms) and intermittent Planner/Moments/Family tab transitions in the ~380–556ms range. The Phase 8.2 layout optimization is therefore preserved; this pass targets **paint ordering, cooperative JS yielding and focus-time work** instead of replacing Graph architecture.

## Changes

### 1. Full Tree cannot auto-expand before first viewport paint

Before this pass, progressive batches could begin immediately after the first commit. On large trees that background expansion could compete with the first useful native frame.

Now:

```text
initial bounded logical graph
→ viewport layout
→ two paint frames
→ first viewport marked ready
→ only then background Full Tree expansion begins
```

### 2. Every automatic progressive batch yields through a paint boundary

`schedulePaintYieldTask()` forces the next batch through `requestAnimationFrame` before idle scheduling. This prevents a chain of background state updates from monopolising Hermes while the user is waiting for visual feedback.

Phase 8.2 config remains the ceiling (`64/48`). For very large graphs the runtime window is adaptively smaller:

```text
<250 Person: existing 64 / 48 ceiling
250–399: initial <=48, batch <=40
400+: initial <=40, batch <=36
```

This changes only runtime render scheduling. It does not hide or delete graph data.

### 3. Nodes paint before connector decoration

The first useful card viewport is allowed to paint before `GraphConnectors` starts collision-routing and connector element creation. Connector rendering is enabled one additional frame later.

This intentionally prioritizes immediate readable content over completing all decoration before the first frame.

### 4. Partner atomicity no longer rescans every relationship for every batch

A stable `partnerIdsByPerson` adjacency index is created once per snapshot. Both progressive partner-component expansion and viewport partner pinning reuse that index.

Graph truth is unchanged: partner components remain atomic.

### 5. Connector routing metadata is more tightly viewport-scoped

The router still derives canonical parent sets from the full graph, but lane geometry and routed-connector work are limited to the requested viewport connection IDs. Bottom-port ownership checks remain based on all relevant child-family groups for routed parents.

No `parent_child` / `partner` meaning changed.

### 6. Planner / Moments focus work yields a frame

Phase 8.5 intentionally focus-gated local listeners. This pass ensures those listeners are not re-enabled synchronously in the same frame as the tab press:

```text
tab press
→ route/focus
→ one paint boundary
→ idle callback
→ focused realtime work enabled
```

Performance traces now mark:

```text
screen_focus
focus_frame_yielded
focused_work_enabled
listener_open:<listener name>
```

This lets the next report distinguish navigation/render delay from subscription work.

## Preserved from Phase 8.2

- relationship indexing in the live adapter;
- bounded pre-layout node mount;
- viewport spatial culling;
- working-set connector routing;
- progressive Full Tree architecture;
- Graph Truth / DG-11;
- all automated Performance Lab files.

## Preserved from Phase 8.3–8.5

- resumable/offline Moment publish checkpoints;
- optional A+B/C multi-family Moment publishing, OFF by default;
- independent media lifecycle per family;
- immediate family-transition architecture;
- spacing tokens/polish changes;
- focus-gated realtime hardening;
- cross-family identity-bridge foundation, OFF by default.

## Data / deploy impact

```text
Firestore schema: unchanged
Firestore Rules: unchanged
Migration: none
Cloud Functions: not required
Blaze: not required
Native/npm dependency: none
USE_CLOUD_FUNCTIONS=false
```

## Device retest requested

Run the existing Performance Lab; do not create manual large datasets:

```text
100 Person
300 Person
500 Person
30-second interaction probe
```

Also verify the functional items still awaiting device acceptance:

```text
offline Moment retry
Moment publish A+B/C
family-switch splash response
```

The Performance Lab stays in the project until the production/release build.
