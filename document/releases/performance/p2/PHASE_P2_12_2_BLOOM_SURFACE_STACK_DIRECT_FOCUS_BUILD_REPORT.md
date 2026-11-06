# Family Bloom — Performance Architecture P2.12.2
## Bloom Surface Stack + Direct Persistent Focus Surface

Date: 2026-10-11
Baseline: P2.12.1 FULL CODE

## Why this phase exists

Device video 6290 showed a global regression: after P2.12 moved Family Graph Focus out of the native Modal, Focus no longer presented for any topology. The branch request and BSH scene path were still being reached, but the route-local custom Focus portal was not a reliable app-level native presentation plane. Chess already owns a root persistent surface with high local z-index, so a route-local Focus host could not establish deterministic ordering against it.

## Root presentation architecture

P2.12.2 introduces one App Root `BloomSurfaceStack` with structural layers:

- navigation/base routes
- game = 100
- focus = 200
- modal = 300
- globalOverlay = 400

Chess full and mini persistent surfaces now live inside the `game` plane. Family Graph Focus lives inside the higher `focus` plane. Local child z-index values inside Chess cannot escape the lower game parent, so Focus ordering is deterministic.

## Direct persistent Focus surface

The old `FamilyGraphFocusPortalProvider` and `FamilyGraphFocusPortal.tsx` are removed.

Family Graph now talks directly to a root external Focus surface store. The root Focus host subscribes with `useSyncExternalStore` and stays mounted for the app session.

`present(content)` atomically commits content + visibility. `hide()` changes presentation visibility only and preserves the retained Focus subtree. `clear()` is a separate lifecycle operation used when the owning graph route unmounts.

## Back critical path

Back remains cancel-first:

1. invalidate/cancel in-flight Focus work;
2. hide the root Focus surface immediately;
3. defer graph-owner state reconciliation;
4. do not teardown the retained Scene/node/connector tree on the interaction path.

## Native Detail handoff

The P2.12.1 native Detail Modal handoff is retained. Detail closes before the root Focus plane is presented; Android keeps the two-native-frame fallback with no artificial fixed delay.

## BSH retained rendering remains unchanged

P2.12.2 does not change:

- GraphModel
- GraphLayout
- GraphGeometry
- GraphScene
- GraphRuntime
- retained spatial regions
- Full / 3-gen / 5-gen / Focus progressive loading
- semantic spacing
- Focus camera 0.95 / 42% viewport anchor

## Copy-over cleanup

Because P2.12.2 removes `src/components/familyGraph/FamilyGraphFocusPortal.tsx`, both pre-copy cleanup and post-copy overlay cleanup explicitly delete that obsolete file. This is required for safe overlay installation over P2.12/P2.12.1 projects.

## Validation

Primary P2.12.2 gate covers:

- one root Bloom Surface Stack;
- game/focus/modal/global ordering;
- Focus above Chess full and mini surfaces;
- direct external Focus store;
- atomic presentation;
- hidden subtree retention;
- Back hide-before-owner-work;
- branch shell visibility before Scene hydration;
- P2.12.1 Detail handoff preservation;
- retained BSH preservation;
- TS/TSX transpilation;
- package/BAT registration.

Inherited P2.12/P2.11.x/Phase14F/Phase14J gates remain required.

## Device validation priority

1. Open Person Detail -> Mở nhánh for Liên, Lan and Đôn. Focus shell must appear after Detail closes.
2. Verify Focus appears above any persistent Chess full/mini surface.
3. Load a heavy Lan branch, Back once, and verify immediate hide without retained-tree teardown delay.
4. Reopen the same branch and verify retained Scene reuse.
5. Pan 3-gen / 5-gen / Full Tree to new regions and back; loaded nodes/connectors must remain stable.
