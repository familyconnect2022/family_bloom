# Family Bloom P2.11.1 — Bloom Scene Hydration (BSH) Family Graph

Date: 2026-10-11
Baseline: P2.11 FULL CODE

## Goal

P2.11 regression gates were green while device video 6279 still showed two real runtime failures: the Focus preparation UI remained visible for a large branch and pan/pinch was unavailable. The phase therefore stops treating topology, layout, camera/readiness and rendering as one coupled React path and establishes **Bloom Scene Hydration (BSH)** as an explicit staged architecture.

## BSH pipeline implemented

1. `GraphModel` — topology/select scope only. Focus branch extraction happens here exactly once.
2. `GraphLayout` — computes all Person world/canvas `x/y`, generations, canvas dimensions and bounds before React rendering.
3. `GraphScene` — hydrates current profile fields onto the valid cached layout and supplies renderer metadata: bootstrap IDs, bounds, scene identity and entry camera.
4. `GraphRuntimeState` — stores presentation-only state (camera + retained visited Person IDs) independently from graph correctness.
5. `FamilyGraphPrototype` renderer — consumes the prepared Scene. Production Focus no longer assembles branch topology or computes node positions while drawing.

## Cache/invalidation contract

BSH uses bounded in-memory caches with explicit version/revision keys:

- Model cache: family + topology revision + mode + focus Person.
- Layout cache: Model identity + layout-relevant revision.
- Scene cache: Layout identity + current visual/data revision.
- Runtime cache: Scene identity only; camera and retained IDs cannot cross into a different Scene revision.

A profile-only update (tested with avatar change) keeps the same topology and layout revisions and preserves every node coordinate while producing a fresh hydrated Scene. A Person/relationship topology change generates new Model/Layout/Scene identities.

The cache contract is intentionally one-way: **cache may accelerate, never decide correctness**.

## Runtime readiness / gesture repair

- The Focus loading layer has `pointerEvents="none"`.
- Prepared graph content is always visible; `visualReady` no longer controls graph opacity.
- Selected Person + partner(s) + one direct-parent context generation are precomputed by GraphScene as `bootstrapPersonIds` and pinned into the first mount batch.
- Focus readiness requires measured graph viewport, initialized camera and mounted bootstrap set, then waits two presentation frames before releasing the compact loader.
- Loader is an inline spinner + short copy centered by absolute-fill alignment inside `focusOverlayGraph`, not a large card below the header.
- The production initial Focus camera comes from `GraphScene.initialCamera`: selected Person canvas center, viewport anchor 50% x / 42% y, scale 0.95. It executes before all legacy auto-fit logic and never fit-alls Focus.

## Retained rendering

Focus viewport culling remains an optimization only. Every visited visible ID is unioned into a retained Set and mirrored into `GraphRuntimeState`. Reopening the same valid Scene can hydrate both retained IDs and the last Focus camera without rebuilding topology/layout.

## Directional topology remains generic

No production source contains `Nguyễn Thị Lan`, `Nguyễn Vũ Đôn` or `Nguyễn Thị Bích`. Those names are regression fixtures only. Production selection uses `focusPersonId`, parent/child/partner relationships and revisioned graph snapshots.

## Main source changes

- `src/components/familyGraph/familyGraphSceneBuilder.ts`
  - explicit `buildFamilyGraphModel`, `buildFamilyGraphLayout`, `buildFamilyGraphScene`, `buildFamilyGraphRenderScene`.
- `src/components/familyGraph/familyGraphBshCache.ts`
  - independent Model/Layout/Scene/Runtime bounded caches.
- `src/components/familyGraph/familyGraphRevision.ts`
  - pure visual and layout fingerprinting, decoupled from AsyncStorage warm-cache code.
- `src/components/familyGraph/FamilyGraphPrototype.tsx`
  - production `scene` input; precomputed bootstrap/camera consumption; runtime retained/camera hydration; non-blocking loader.
- `src/app/(family)/(graph)/family-graph.tsx`
  - Full Tree and Focus both use the same BSH facade; retired duplicate per-screen Focus cache.
- `src/components/familyGraph/familyGraphWarmCache.ts`
  - revision helpers moved to pure module; BSH caches clear with the existing graph privacy cleanup.

## Regression result before packaging

- P2.11.1 BSH: 45/45 PASS
- P2.11: 31/31 PASS
- P2.10: 38/38 PASS
- P2.8: 33/33 PASS
- P2.7: 35/35 PASS
- P2.6: 21/21 PASS
- Phase14F: 21/21 PASS
- Phase14J: 18/18 PASS
- Family Graph Query Engine: PASS
- Family Graph dense layout: PASS
- Project structure: 18/18 PASS
- Whole `src/` TypeScript/TSX transpile gate: PASS

## Device validation needed

Static/runtime-node gates cannot emulate Android Gesture Handler/Reanimated frame presentation. Device validation should focus on the exact 6279 symptoms: open Lan/Don/Bich Focus, verify small centered loader, verify pan/pinch remains available, verify topology, and reopen a previously visited branch to observe BSH hydration.
