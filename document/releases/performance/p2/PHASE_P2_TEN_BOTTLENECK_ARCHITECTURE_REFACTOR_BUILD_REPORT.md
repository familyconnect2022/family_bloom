# Family Bloom - Performance Architecture P2
## Ten-Bottleneck Refactor Foundation / Containment Report

**Date:** 2026-10-10  
**Base:** Android Performance Foundation P1.2  
**Delivery:** FULL CODE, safe copy-over  
**Scope:** Android architecture/performance. Web W3 is preserved. No native dependency, Firestore Rules/index, Cloud Functions, or game-server deployment change is required solely for P2.

## Executive status

P2 implements the **foundation and containment layer across all 10 agreed performance problems**. It deliberately avoids pretending that every deep optimization is finished in one rewrite. The goal of this checkpoint is to remove root/global fan-out, establish lifecycle/scheduler/bootstrap/signal/ownership boundaries, and add feature-level projection/canonicalization points that later phases can deepen without another architectural rewrite.

**Automated architecture gate:** 49/49 PASS.  
**P1/P1.1/P1.2 compatibility:** PASS.  
**Five-tab lifecycle / Moments / Planner / Tabbar:** PASS.  
**Chess/Xiangqi:** all 20 current constituent gates PASS when executed separately. The one-command aggregate exceeds the execution window because it is long; no constituent gate failed.  
**Release readiness:** 11/11 PASS.  
**Web W3:** 34/34 PASS.

---

## Problem 1 - Root Firebase listeners / cache-first ownership

### Implemented in P2
- `FamilyRealtimeProvider` no longer owns physical feature Firestore listeners for Members, Moments, upcoming Events, or yearly Events.
- Root provider is now a **uid/family-scoped warm-cache bridge only**.
- ACTIVE feature hooks/surfaces own live Firestore work.
- Existing narrow contexts are retained temporarily as a migration compatibility layer so screens can be converted safely instead of breaking the app in one pass.
- Warm cache remains split by feature/family and v1 cache migration is retained.

### Main files
- `src/context/FamilyRealtimeContext.tsx`
- `src/services/bootstrap/familyHomeWarmCache.ts`
- `src/hooks/family/useFamilyMembers.ts`
- `src/hooks/family/useFamilyEvents.ts`
- `src/hooks/moments/useFamilyMoments.ts`

### What this solves now
A mounted app root no longer means four feature Firestore subscriptions stay physically live all the time.

### Still to deepen later
- Replace remaining compatibility-context consumers with direct fine-grained feature selectors/store subscriptions.
- Add the full lightweight family sync/invalidation manifest if/when its Firestore write/read tradeoff is approved for production.

### Real-device test
1. Open Home, then leave Moments/Planner/Family hidden.
2. Switch repeatedly between tabs.
3. Verify no full-screen loading is introduced and cached content still paints immediately.

---

## Problem 2 - Persistent tabs doing too much work while hidden

### Implemented in P2
- Surface lifecycle now exposes `ACTIVE / WARM / SUSPENDED / RESTORING`.
- Per-surface cost profiles control warm retention rather than one identical timer for every tab.
- Memory-pressure level is represented in the lifecycle manager.
- Freeze barrier fields `dirtyVersion` / `appliedDirtyVersion` are part of each runtime snapshot.
- `BloomTaskScheduler` establishes priorities:
  `INTERACTION > VISIBLE > SYNC > PREFETCH > IDLE`.
- Low-priority work yields during interaction/critical navigation windows.

### Main files
- `src/context/TabRuntimeContext.tsx`
- `src/services/performance/bloomTaskScheduler.ts`

### What this solves now
Persistent does not automatically mean fully active. Work can be gated at the source and scheduled below interaction priority.

### Still to deepen later
- Connect real Android memory-pressure callbacks to the lifecycle manager instead of relying only on the current policy interface.
- Migrate every remaining feature-specific timer/derive/prefetch path to the scheduler.

### Real-device test
Leave each heavy tab hidden for 10-20 seconds, then return. Verify state survives but there is no obvious catch-up burst or full rebuild flash.

---

## Problem 3 - Moments feed / image churn

### Implemented in P2
- Canonical Moment entity cache keyed by family/id/version.
- `useFamilyMoments` canonicalizes warm-cache, live and paginated results, reducing duplicate object identity churn.
- Cloudinary media requests use fixed size buckets.
- Moment avatar requests use thumbnail transformations instead of oversized assets.
- Existing P1/P17.7 visible-card/lifecycle behavior is preserved.

### Main files
- `src/services/moments/momentEntityCache.ts`
- `src/hooks/moments/useFamilyMoments.ts`
- `src/components/moments/MomentCard.tsx`
- `src/app/(tabs)/moments.tsx`
- `src/components/media/MediaViewerProvider.tsx`

### What this solves now
The same logical Moment can preserve canonical identity across cache/live/page paths, and media requests have more predictable cache keys/sizes.

### Still to deepen later
- Full `FeedProjection` with queued new-items chip and anchor-based restore.
- Explicit memory/disk image budget + request deduplication across every Home/Moments surface.
- Video ACTIVE/PREPARED/RELEASED lifecycle if video Moments are expanded.

### Real-device test
Scroll a long Moments feed, leave the tab, return, open/close media, and watch for increasing lag or image reload bursts.

---

## Problem 4 - Family Tree graph recomputation

### Implemented in P2
- Graph layout fingerprint is separated from full profile-data fingerprint.
- Profile-only changes can refresh node data without automatically invalidating layout geometry.
- Existing viewport/spatial virtualization remains active.
- Pan/zoom continues on SharedValues/UI-thread paths.
- Warm graph cache is preserved.

### Main files
- `src/components/familyGraph/familyGraphLiveAdapter.ts`
- `src/components/familyGraph/familyGraphWarmCache.ts`
- `src/app/(tabs)/family.tsx`

### What this solves now
A profile-only data change does not have to be treated as a structural graph topology change.

### Still to deepen later
- Fully normalized PersonStore / RelationshipStore / TopologyStore / LayoutStore slices.
- Incremental affected-branch layout instead of whole topology recompute when structural changes occur.
- More explicit LOD tiers for far/medium/near zoom if 300-500 node real-device tests require it.

### Real-device test
Pan/zoom Tree, return to another tab, then back. Change a profile-only field and verify there is no obvious full-layout flash/recenter.

---

## Problem 5 - Home as a god consumer / dashboard fan-out

### Implemented in P2
- Home remains a projection over feature hooks/cache instead of introducing new Home-owned Firestore listeners.
- Members, Events and Moments paths are memo-isolated as separate render islands.
- Activity badge moved to `HomeActivityBell`, an external signal consumer; badge changes no longer need to live in Home parent state.

### Main files
- `src/app/(tabs)/index.tsx`
- `src/components/home/HomeActivityBell.tsx`
- `src/hooks/family/useFamilyDashboard.ts`
- `src/services/activity/activityBadgeSignalStore.ts`

### What this solves now
High-frequency activity badge changes are isolated, and Home feature paths are more independent.

### Still to deepen later
- A formal standalone `HomeProjectionStore` with output-level versioning for every widget.
- Priority-tier hydration for every decorative/secondary Home island.

### Real-device test
Trigger activity/badge changes and verify the whole Home dashboard does not visibly refresh or jump.

---

## Problem 6 - Planner / Calendar derived-state churn

### Implemented in P2
- Introduced `CalendarMonthProjection` and `DaySummary`.
- Day summaries include compact UI output such as event count, important/reminder/birthday flags and dominant type.
- Unchanged summaries preserve object identity.
- Calendar day cells consume `DaySummary` instead of repeatedly scanning the full event array.
- Selected agenda resolves IDs through the month projection.
- Historical 17.8B gate was intentionally updated to accept the stronger P2 DaySummary successor to the old precomputed Set invariant.

### Main files
- `src/services/calendar/calendarIndex.ts`
- `src/app/(tabs)/planner.tsx`
- `src/hooks/family/useFamilyEvents.ts`

### What this solves now
A non-summary Event edit can preserve calendar cell summary identity instead of invalidating every day cell.

### Still to deepen later
- Persistent incremental byDay/byMonth indexes across all cached ranges.
- Recurrence materialization cache keyed by ruleVersion + monthKey.
- Full prev/current/next month UI-thread carousel if real-device testing shows month switching is still expensive.

### Real-device test
Select dates, switch calendar/list, edit only an event title, then move an event to another date. Watch which cells/agenda regions update.

---

## Problem 7 - Startup / bootstrap contention

### Implemented in P2
- Added a staged bootstrap coordinator/state machine:
  `COLD -> IDENTITY -> FIRST_PAINT -> INTERACTIVE -> SYNCING -> SETTLED`.
- Startup task contracts carry priority, cost, cancellation, network/family dependency and first-paint blocking metadata.
- Root session explicitly marks identity / first paint / interactive milestones.
- Deferred graph prewarm is scheduled as IDLE work.

### Main files
- `src/services/bootstrap/bootstrapCoordinator.ts`
- `src/app/_layout.tsx`
- `src/components/system/DeferredFamilyPrewarm.tsx`

### What this solves now
There is now one architectural place to decide what may compete with first paint instead of every provider independently starting work on mount.

### Still to deepen later
- Register every startup/deferred task through the coordinator; some older feature initialization paths remain outside it.
- Add measurement telemetry for stage durations on real devices without restoring the intrusive old lab overlay.

### Real-device test
Cold start, then background/foreground warm resume. Check that warm resume does not behave like a second cold bootstrap.

---

## Problem 8 - Global overlays / modal / toast / chrome fan-out

### Implemented in P2
- Toast context value is stable across host presentation state.
- Toast queue supports dedupe keys.
- Added `OverlayCoordinator` with priority, dedupe, scope and generation semantics.
- Priority ordering protects critical/game/challenge presentation from low-priority toast work.

### Main files
- `src/components/ui/BloomToast.tsx`
- `src/services/overlay/overlayCoordinator.ts`

### What this solves now
Overlay coordination no longer has to be expressed as broad screen/root state, and duplicate toast work can be suppressed.

### Still to deepen later
- Migrate every legacy modal/bottom-sheet/challenge/result host to the coordinator contract.
- Add blocking-overlay integration to every surface work gate.

### Real-device test
Trigger repeated toasts and game/challenge/result overlays. Verify duplicate toast stacking is reduced and underlying screens do not visibly rerender.

---

## Problem 9 - Realtime signals causing micro-render storms

### Implemented in P2
- Generic keyed signal store coalesces writes per key and notifies only subscribers of that exact key.
- Activity badge uses a key-scoped signal store.
- Chess presence no longer mutates `ChessRealtimeContext` state.
- Chess lobby subscribes directly to `chessPresenceStore`.

### Main files
- `src/services/realtime/uiSignalStore.ts`
- `src/services/activity/activityBadgeSignalStore.ts`
- `src/services/chess/chessPresenceStore.ts`
- `src/context/ChessRealtimeContext.tsx`
- `src/hooks/chess/useChessLobby.ts`

### What this solves now
Presence/badge packets can update narrowly without forcing a large realtime context and its unrelated consumers to rerender.

### Still to deepen later
- Move any remaining high-frequency unread/presence/activity signals to keyed stores.
- Tune coalescing windows per signal type based on real-device traces.

### Real-device test
Keep Chess lobby/presence active while navigating unrelated tabs. Confirm no visible global refresh when users go online/offline.

---

## Problem 10 - Navigation / route ownership

### Implemented in P2
- Added explicit route ownership contracts for:
  - persistent surfaces,
  - transient routes,
  - global overlays.
- Detail routes are declared non-owners of durable feature data.
- Chess/Xiangqi surfaces are declared persistent model/engine owners.

### Main files
- `src/services/navigation/routeOwnership.ts`

### What this solves now
Navigation ownership is documented and machine-testable instead of implicit. It becomes possible to reject future routes that accidentally own feature data/engines they should only view.

### Still to deepen later
- Migrate every existing detail/editor route to enforce contracts at runtime rather than only declaration/test level.
- Continue separating model lifetime from route lifetime where older features still couple them.

### Real-device test
Open/close Moment/Event/detail/settings routes and verify returning does not erase feature cache/state or remount persistent game/tab surfaces unexpectedly.

---

# Automated verification summary

| Gate | Result |
|---|---:|
| P2 architecture | **49/49 PASS** |
| P1 performance foundation | **32/32 PASS** |
| P1.1 native-feel tab surface | **25/25 PASS** |
| P1.2 opaque handoff | **26/26 PASS** |
| Five-tab lifecycle | **56/56 PASS** |
| Moments 17.7 | **42/42 PASS** |
| Planner 17.8B | **45/45 PASS** |
| Tabbar 17.8E | **39/39 PASS** |
| Release readiness | **11/11 PASS** |
| Web W3 | **34/34 PASS** |
| Chess/Xiangqi current constituent gates | **20/20 groups PASS** |

Notable game results include A11 **31/31**, A12 **20/20**, A15 **27/27**, A16 **44/44**, A17 **33/33**, A18 **15/15**.

# Recommended real-device test order

1. **Cold start / warm resume** - first paint, no second bootstrap on resume.
2. **Rapid 5-tab switching** - continuity, no white flash, no catch-up burst.
3. **Home badge/activity** - badge update without whole-dashboard visual refresh.
4. **Moments** - long scroll, media open/close, leave/return, no increasing lag.
5. **Planner** - select day, edit title, move date, switch inner panels.
6. **Family Tree** - pan/zoom, leave/return, profile-only edit.
7. **Chess/Xiangqi** - challenge, game entry, tab away/return, reconnect, result/rematch.
8. **Family switching** - A -> B -> A and verify stale callbacks do not overwrite the current family UI.

# Known limitations / next performance phase

P2 is the **architecture foundation/containment checkpoint**, not the final endpoint of every ambitious optimization discussed in the architecture PDF. The following deep work remains appropriate for later measured phases if real-device traces justify it:
- full fine-grained selector migration away from compatibility contexts;
- complete FeedProjection/new-item queue/anchor restore;
- incremental branch-only Tree layout + stronger LOD;
- persistent incremental CalendarIndex and recurrence cache;
- runtime migration of all overlays/detail routes to their new coordinators/contracts;
- real Android memory-pressure integration;
- low-overhead diagnostic counters in Settings for developer account only.

This staging is intentional: first remove global fan-out and establish ownership boundaries, then use real-device measurements to deepen only the remaining hotspots.
