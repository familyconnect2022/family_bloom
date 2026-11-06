# Family Bloom — P2.1 Whole-Code Architecture Audit Fix

Date: 2026-10-10
Base: Performance Architecture P2 Ten-Bottleneck Refactor

## Why P2.1 exists

P2 passed its architecture/regression gates, but a second whole-code review was intentionally performed because the ten agreed performance changes affect lifecycle, cache ownership, async invalidation, and scheduler behavior where text/static gates can miss runtime races. The review found real defects and incomplete wiring. P2.1 fixes the confirmed defects and adds a dedicated regression gate.

## Confirmed defects fixed

### 1. Home members runtime reference
`HomeMembersIsland` referenced `visibleMembers` after the render-island split without declaring it locally. This could crash the Home members section. P2.1 restores a bounded local projection using `DATA_LIMITS.dashboard.visibleMembers`.

### 2. BloomTaskScheduler correctness races
A PREFETCH/IDLE task could be removed from the pending map while waiting for `InteractionManager`, making later cancellation ineffective. A later delayed low-priority task could also move the global wake later than an earlier ready task. In addition, `canCancel:false` was not actually protected from a same-key replacement, and a rejected background task could surface as an unhandled promise rejection. P2.1 keeps claimed tasks tracked/cancellable, gives every task `readyAt`, preserves the earliest wake, protects non-cancellable key ownership, and contains per-task errors while allowing the queue to continue.

### 3. Members warm cache freshness
After feature Firestore listeners moved out of the root, the active member listener did not write fresh results back to the per-family warm cache. P2.1 persists sorted member snapshots from the feature listener.

### 4. Cross-family/stale pagination and bridge races
Moments and Planner pagination requests could resolve after a family/head-data switch and append stale results into the new surface. P2.1 captures family + head generation/version and discards late results. It also prevents duplicate same-frame pagination requests. Moments bridge pagination now uses a request token so an old bridge `finally` cannot clear a newer family bridge state. Planner explicitly clears pagination-loading state during a family switch. Member listener callbacks also verify current family/user ownership before updating UI state.

### 5. Warm-cache and signal memory bounds
Visual/layout warm caches were not bounded strongly enough, and full graph/family feature warm records could grow with every family visited during a long session. P2.1 adds LRU-style RAM limits for graph visuals/layouts/full graph warm records and family feature warm records while preserving disk rehydration. The keyed UI signal store also removes empty subscriber buckets after unsubscribe.

### 6. Family Graph connector type debt
Connector route types were referenced without declarations. This was pre-existing and normally hidden because Expo/Babel erases type-only names, but a proper semantic TypeScript pass flags it. P2.1 declares the missing route/strategy types.

## New P2.1 regression gate

`npm run phaseP2_1:check` verifies structural fixes and executes scheduler runtime races:
- delayed IDLE cannot postpone ready VISIBLE work;
- claimed IDLE work remains cancellable;
- same-key replacement suppresses stale claimed work;
- Home member projection exists;
- member cache persistence exists;
- Moment/Planner stale-family pagination guards exist;
- Graph caches are bounded;
- connector route types are declared;
- changed TypeScript/TSX syntax is clean.

The gate is wired into post-copy cleanup as well as Android Debug/Release scripts.

## Verification after fixes

- P2.1 audit gate: 32/32 PASS.
- P2 architecture gate: 49/49 PASS.
- Five-tab lifecycle: 56/56 PASS.
- Moments 17.7: PASS.
- Planner 17.8B: 45/45 PASS.
- P1.2 tab handoff: 26/26 PASS.
- Home functional gate: 44/44 PASS.
- Release Readiness: 11/11 PASS.
- Web W3: 34/34 PASS.
- Chess/Xiangqi smoothness 16B15: 50/50 PASS.
- Native persistent tabbar A17: 33/33 PASS.
- Single-icon tabbar A18: 15/15 PASS.
- Whole source transpile scan: 337 TS/TSX files, 0 syntax errors.

## Architecture gaps intentionally NOT misreported as complete

These are not immediate correctness defects, but P2 currently provides foundations rather than full app-wide migration:

1. `OverlayCoordinator` exists but legacy modals/challenges have not all been migrated to it.
2. Route ownership contracts exist but are not yet runtime-enforced across every route.
3. Freeze-barrier `dirtyVersion` APIs exist, but broad mark/ack call-site migration remains.
4. Memory-pressure API exists, but there is not yet a native OS memory-pressure bridge.
5. Bootstrap staging is active for session/identity/first paint; full `registerTask`-driven hydration of every feature is still future work.
6. Members/Chess identity freshness can be improved further with the final normalized MemberStore; P2.1 fixes cache freshness but does not claim that final migration is complete.

## Deployment impact

P2.1 changes client architecture only. No Render/server redeploy, Firestore Rules/index deployment, Cloud Functions deployment, or new native dependency is required solely for P2.1.
