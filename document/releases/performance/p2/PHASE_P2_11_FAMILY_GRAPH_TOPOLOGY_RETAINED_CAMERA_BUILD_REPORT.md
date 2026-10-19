# Family Bloom — Performance Architecture P2.11

## Family Graph Topology + Retained Camera

**Build date:** 2026-10-11  
**Baseline:** P2.10 FULL CODE  
**Delivery:** FULL CODE ZIP, safe copy-over

## Scope

P2.11 is intentionally limited to the Family Graph Focus experience and its regression coverage. It does not change the Family Bloom Android package identity, Firebase schema/rules, Cloud Functions, Render chess server, or add a native dependency.

The primary regression case is the branch around **Nguyễn Thị Lan / Nguyễn Vũ Đôn**. **Nguyễn Thị Bích** is retained as the control topology because her branch already had the expected visual hierarchy.

## 1. Directional Focus topology

Focus View no longer uses the generic full-depth subgraph expansion for this branch mode. It now uses a dedicated directional Focus query:

- the selected person is the branch root;
- direct parents above the selected person are included as **one generation of context only**;
- those context ancestors are terminal for Focus extraction: their partners, other children, sibling branches and cousin branches are not traversed back into the graph;
- the selected person's valid partners are retained;
- descendants are traversed downward from the selected branch;
- valid descendant partners may be retained without reopening ancestor-side branches.

This prevents the Nguyễn Thị Lan / Nguyễn Vũ Đôn topology from expanding backward into unrelated sibling branches while preserving the lineage that is actually being inspected.

## 2. Local generation / rebase without clamp

Focus layout now seeds branch-local generations independently of the base canvas. The visible branch is rebased from its highest included ancestor and each parent-to-child step advances exactly one generation.

The Focus branch path is not clamped to the standard 3/5-generation canvas range. Deep descendants therefore keep their real local row instead of collapsing onto the same generation.

The P2.11 regression fixture exercises a deep branch through generation 9 to guard against accidental clamping.

## 3. One coordinate contract for layout and camera

P2.11 adds canonical canvas/viewport helpers in `familyGraphViewport.ts` for:

- canvas point -> viewport point;
- viewport point -> canvas point;
- pan required to place a canvas anchor at a viewport anchor;
- camera snapshot derived from the same transform.

Focus centering, locate behavior, viewport frame calculations and camera snapshot derivation now share this transform contract instead of duplicating coordinate formulas.

## 4. Focus viewport and initial zoom

Focus remains a native full-window portal but its graph card is now near full-screen:

- horizontal safety gutter: 3.5% per side (~93% screen width);
- vertical safety gutter: 4% per side (~92% screen height).

Initial Focus scale is fixed at **0.95**. It intentionally does **not** fit the whole branch. The selected person is anchored around 42% of graph viewport height so the person card stays readable while still leaving useful ancestor context above.

## 5. Progressive retained rendering

Focus viewport culling now has two sets:

- `visibleNow`: people intersecting the current viewport working area;
- `retained`: the union of people that have already entered the rendered working set during this Focus session.

The render tree uses `retained ∪ visibleNow`. Once a node has been reached by panning, it remains mounted for the rest of that Focus session, so panning back does not remount the card.

Current-viewport relationship solving can still use `visibleNow`, keeping expensive current-view work bounded without sacrificing mounted-node continuity.

## 6. Preparing loader

The preparation layer remains above the branch until visual readiness completes, but the loader is now a compact centered card inside the **graph viewport**:

- small ActivityIndicator;
- short `Đang chuẩn bị nhánh…` label;
- no large explanatory block under the header;
- error state keeps its own larger treatment.

## 7. Regression fixtures

Dedicated P2.11 gate:

`scripts/test-phase-p2_11-family-graph-topology-retained-camera.js`

It covers three topology cases:

1. **Nguyễn Thị Lan** — one parent-context generation only, sibling/ancestor-side branches excluded, descendants retained, deep generations unclamped.
2. **Nguyễn Vũ Đôn** — symmetric directional behavior and no ancestor-side leakage.
3. **Nguyễn Thị Bích** — control branch preserves the expected hierarchy: Lan/Đôn above Bích, then downstream generations.

The gate also verifies coordinate round-trip/anchor behavior, scale 0.95, retained-ID accumulation, compact centered loader, near-full-screen Focus geometry and TS/TSX transpilation for the touched path.

## Verification

Validated during P2.11 build:

- `test-phase-p2_11-family-graph-topology-retained-camera.js` — **31/31 PASS**
- `test-phase-p2_10-branch-camera-chess-actions-audio-xiangqi-icon.js` — **38/38 PASS**
- `test-phase-p2_8-stabilization-audio-moments-branch-tabbar.js` — **33/33 PASS**
- `test-phase-p2_7-hard-isolated-tabbar-branch-visual-ready.js` — **35/35 PASS**
- `test-phase-p2_6-interaction-detail-scroll-polish.js` — **21/21 PASS**
- `test-phase14f-graph-focus-isolation.js` — **21/21 PASS**
- `test-phase14j-fullscreen-focus-locate.js` — **18/18 PASS**
- `test-familyGraphQueryEngine.js` — PASS
- `test-familyGraphLayout.js` — PASS
- `scripts/maintenance/check-project-structure.js` — **18/18 PASS**

Historical static gates that encoded superseded P2.7/P2.10 implementation constants were updated only to accept the approved successor contracts (near-full Focus frame, stable non-collapsing Focus exit, canonical camera transform, and compact loader). Their behavioral invariants remain enforced.

A project-wide `tsc --noEmit` is not a valid verification signal inside this supplied FULL archive because its packaged dependency tree does not contain `expo/tsconfig.base`. The Family Bloom source gates use TypeScript `transpileModule` and whole-`src` syntax scans instead; the P2.7/Phase14F/Phase14J scans each cover the complete TS/TSX source tree.

## Copy-over

1. From this release, run `scripts/android/maintenance/Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` against the existing Family Bloom folder.
2. Copy the entire P2.11 FULL CODE package over the existing project and replace files.
3. Run `scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat` inside the updated project.
4. Start Android with `npx expo start -c` or the normal Family Bloom Android build/run BAT.

The root intentionally keeps only required project/tooling files plus the two copy-over entrypoint BAT files. All generated `.md` and `.txt` documentation remains under `document/`.
