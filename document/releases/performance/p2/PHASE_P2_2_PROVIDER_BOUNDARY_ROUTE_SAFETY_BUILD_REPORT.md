# Family Bloom P2.2 — Provider Boundary Route Safety

Date: 2026-10-10
Base: `FAMILY_BLOOM_PERFORMANCE_ARCHITECTURE_P2_1_CODE_AUDIT_FIX_COPY_OVER_FULL_2026-10-10.zip`
Trigger: real-device video `6237.mp4`

## Real-device failure reproduced from video

At roughly 51.1s, opening an Event detail route produced:

`Render Error — TabRuntimeProvider is missing`

The stack pointed to `src/context/TabRuntimeContext.tsx` and `src/app/(activity)/event/[eventId].tsx`.

This was not an Event data/schema problem. It was a route/provider ownership bug introduced by the P2 lifecycle refactor.

## Root cause

`TabRuntimeProvider` intentionally lives inside `src/app/(tabs)/_layout.tsx`, because ACTIVE/WARM/SUSPENDED lifecycle belongs to the five persistent main tabs.

`useFamilyMembers()` is shared by both:

- persistent main tabs; and
- transient/detail routes outside `(tabs)`.

P2.1 correctly gave transient routes a normal mount-scoped member listener, but the same hook still invoked:

`useTabLiveEffect(runtimeTabId ?? "home", ...)`

unconditionally. On a transient route there is no `TabRuntimeProvider`, so the strict hook threw before the transient listener could operate.

## Fix

### 1. Strict tab runtime remains strict

`useTabLiveEffect()` still requires `TabRuntimeProvider`. This keeps actual tab-only misuse visible instead of silently hiding it.

### 2. Added an optional lifecycle bridge

`useOptionalTabLiveEffect(tabId, effect, deps)` now:

- participates in tab lifecycle when a `TabRuntimeProvider` exists and a real `runtimeTabId` is supplied;
- becomes a no-op outside `(tabs)`;
- does not invent a fake `home` lifecycle for transient routes.

### 3. Shared family-member hook now uses the optional bridge

Main-tab behavior remains:

`ACTIVE tab -> live members listener -> WARM/SUSPENDED -> listener stops`

Transient/detail behavior becomes:

`route mounted -> normal route-owned members listener -> route unmounted -> listener stops`

No root feature listener was restored.

## Routes/components covered by the same fix

The audit found these current consumers of `useFamilyMembers()` outside main-tab ownership:

- `src/app/(activity)/event/[eventId].tsx`
- `src/app/(home)/(time-capsule)/home-time-capsule-compose.tsx`
- `src/app/(family)/(graph)/family-graph-admin.tsx`
- `src/app/(family)/(graph)/family-graph-person-editor.tsx`
- `src/app/(family)/(graph)/family-graph-proposals.tsx`
- `src/app/(family)/member/[uid].tsx`
- `src/components/familyGraph/FamilyGraphPersonSheet.tsx`

The fix is in the shared hook, so these consumers do not require route-by-route patches.

## Similar-error audit

A full native provider-boundary review found:

- `TabRuntimeProvider` is the only native provider with a hard-missing-provider hook that is intentionally scoped below the root route tree.
- Auth, Bloom Dialog, Media Viewer, Home Music, Moment Publish, Family Realtime and Chess Realtime providers are root-owned.
- No transient route directly imports `TabRuntimeContext`.
- No transient route reaches a strict tab-runtime hook through a relative-import dependency chain.
- Known strict lifecycle modules (`useFamilyEvents`, `useFamilyDashboard`, `usePendingFamilyReviews`, `useFamilyMoments`, `HomeActivityBell`) remain tab-owned.

This specifically closes the class of regression shown by video 6237.

## Historical gate compatibility

Three inherited assertions were updated to recognize the newer P2 ownership model without reintroducing old root listeners:

1. P2 members ownership gate accepts the safe optional lifecycle bridge.
2. Phase 17 lifecycle gate accepts ACTIVE-tab **or transient-route** member ownership.
3. Phase 17.8D Event gate accepts the P2 cache-only root + ACTIVE Planner live ownership instead of demanding retired root upcoming/yearly listeners.

The old Phase 10 `Graph branch transition overlay` assertion still fails identically on untouched P2.1 and P2.2. It is a pre-existing historical gate superseded by the newer Family Tree architecture and is not part of the current copy-over/build gate chain.

## Verification

- P2.2 provider-boundary gate: 14/14 PASS
- P2.1 architecture audit: 32/32 PASS
- P2 ten-bottleneck gate: 49/49 PASS
- Planner stable architecture: 45/45 PASS
- Shared Event/UI-thread navigation: 52/52 PASS
- Moments optimization: 42/42 PASS
- Five-tab lifecycle: 56/56 PASS
- P1.2 opaque tab handoff: 26/26 PASS
- Release readiness: 11/11 PASS
- Web W3: 34/34 PASS
- Chess/Xiangqi smoothness: 50/50 PASS
- A17 native persistent tabbar: 33/33 PASS
- A18 single-icon tabbar: 15/15 PASS
- Whole `src` transpile: 322 TS/TSX, 0 syntax errors

## Build/copy-over integration

P2.2 gate is registered as:

`npm run phaseP2_2:check`

and runs from:

- `Family_Bloom_CLEAN_APPLY_FULL.bat`
- Android Debug build BAT
- Android Release build BAT

The PRE-COPY and post-copy scripts identify P2.2 and retain Windows CRLF formatting.

## Backend impact

No Render/server protocol changes.
No Firestore Rules changes.
No Firestore index changes.
No new native dependency.

## Recommended device regression

After copy-over, verify at minimum:

1. Planner -> Event card -> Event detail opens without provider error.
2. Family -> Member detail opens.
3. Family Graph -> person sheet/admin/editor/proposals open.
4. Time Capsule compose opens and member selection loads.
5. Return from each transient route to its previous tab without losing tab lifecycle state.
6. Rapidly switch main tabs afterward to confirm persistent-tab lifecycle remains intact.
