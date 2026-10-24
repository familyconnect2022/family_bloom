# Family Bloom P2.12 — BSH Persistent Surfaces & Retained Graph

Date: 2026-10-11  
Baseline: P2.11.4 BSH Retained Chunks / Interruptible Focus FULL CODE

## Device evidence

Videos 6287 and 6288 isolate three remaining presentation/lifecycle costs after P2.11.4:

1. Cold startup can expose a white bottom-tab strip before the persistent tabbar has actually painted.
2. Back is immediate on small Focus branches but still delayed on a heavily retained branch such as Nguyễn Thị Lan. That size-dependent delay means the handler is not the bottleneck; React/native teardown of the already-mounted branch is on the close critical path.
3. Retained loading works well in Focus and should become the common renderer contract for the initial 3-generation view, 5-generation view, and Full Tree.

P2.12 changes those lifecycle contracts without changing the P2.11 topology rules, semantic spacing, or the 0.95 Focus entry camera.

## 1. Persistent Focus Surface

Focus no longer depends on a native `Modal` lifecycle for its graph subtree.

A route-level `FamilyGraphFocusPortalProvider` owns one persistent absolute host. Its content stays mounted when hidden. Visibility changes only the host opacity/touch gate.

Back contract:

`Back -> cancel in-flight Focus work -> hide portal host -> return control immediately`

The expensive retained graph is not destroyed on this critical path.

The owning graph state update is deliberately deferred to a later task/React transition so it cannot be batched with the lightweight portal hide. A second Android Back received after the portal is already detached is allowed to propagate to the route navigator instead of being swallowed while deferred owner state settles.

Reopening the same Focus person reuses the same `sceneKey`, prepared Scene, retained node/line tree, and runtime camera where valid.

## 2. One retained renderer contract for 3-gen / 5-gen / Full / Focus

The previous Full Tree path still had background progressive expansion. P2.12 removes that policy.

Every graph mode now follows the same presentation contract:

`prepared BSH Scene -> initial viewport + overscan -> mount discovered IDs -> stop`

When the user pans/zooms into a never-visited spatial region:

`new region -> spatial discovery -> append unseen IDs in a transition -> retain`

When the user returns to an already-loaded region:

- no Person remount;
- no connector reroute;
- no retained-set mutation;
- no spatial query for that visited region key;
- camera movement remains a Reanimated/UI-thread transform.

The retained set is monotonic for the mounted Scene. The app does not idle-load the rest of a branch/tree just because the user is standing still.

## 3. Visited spatial-region index

P2.11.4 already avoided React state updates when discovery found no new IDs. P2.12 makes this stronger with a visited-region key set.

A region key contains:

- Scene identity;
- graph mode;
- anchor Person;
- coarse camera X/Y cell;
- zoom bucket;
- viewport-size buckets.

If that region key has already been visited, discovery returns before querying the spatial index. This makes `B2 -> B3 -> B2` a true retained return path rather than `query -> discover nothing -> no state update`.

## 4. Prepared Geometry remains authoritative

P2.12 preserves the BSH pipeline:

`GraphModel -> GraphLayout -> GraphGeometry -> GraphScene -> GraphRuntime -> Renderer`

The renderer does not recompute topology, node coordinates, semantic spacing, or connector routing during pan/zoom.

Existing semantic spacing remains locked:

- partner gap: 16 px;
- sibling family-unit gap: 30 px;
- independent family-unit gap: 72 px;
- generation step: 216 px.

Prepared connectors receive `renderBounds={null}` in production BSH scenes and are emitted as memoized primitives. New retained regions can append new primitives; existing primitives keep stable props.

## 5. Full-tree first-frame bootstrap

The prepared Full Tree Scene now carries deterministic bootstrap IDs around the current anchor:

- anchor Person;
- direct parent context;
- partner(s).

This ensures the first retained viewport has meaningful content before the user begins spatial discovery. The 3-gen and 5-gen filters still select their own logical candidate sets, but presentation below that boundary uses the same retained renderer.

## 6. Startup tabbar first-frame readiness

The native splash no longer releases from only:

`identity/native boot + critical visual assets + active surface`

P2.12 additionally requires a real persistent-tabbar paint signal.

`PersistentBloomTabBarHost` reports chrome readiness only after:

`tabbar onLayout -> requestAnimationFrame -> requestAnimationFrame`

Root splash release now requires:

`nativeBootReady + criticalVisualAssetsReady + activeSurfaceReady + tabBarVisualReady`

There is no fixed artificial tabbar delay in the normal path. Ionicons/font readiness remains part of critical visual assets; the new gate proves the bottom chrome itself has reached a native frame before splash removal.

## 7. Regression coverage

New gate:

`scripts/tests/history/test-phase-p2_12-bsh-persistent-surfaces-retained-graph.js`

It verifies:

- Scene version/runtime compatibility;
- deterministic Full Tree bootstrap IDs;
- Focus 0.95 / 42% camera contract;
- shared retained path for Full / 3-gen / 5-gen / Focus;
- no idle graph batch expansion;
- monotonic retained IDs;
- no React update when discovery adds nothing;
- visited region keys skip repeated spatial queries;
- UI-thread camera-cell reaction calls retained discovery only;
- prepared Geometry and memoized node/line primitives;
- route-level persistent Focus portal stays mounted while hidden;
- Back hides portal before deferred owner work;
- Back does not tear down Focus Scene;
- second Android Back can propagate after detach;
- same Focus Scene can reopen without remount;
- tabbar `onLayout + 2 RAF` first-frame readiness;
- root splash requires `tabBarVisualReady`;
- no fake fixed startup delay;
- P2.12 gate is wired into copy-over, Debug and Release flows;
- changed TS/TSX transpiles cleanly.

Historical gates were updated only where they asserted the superseded native-Modal/idle-batch implementation. Their behavioral invariants remain: topology correctness, isolation, visual readiness, no fit-all Focus, stable geometry, and immediate cancellation.

## 8. Validation status before packaging

Passing source-tree gates include:

- P2.12: 44/44;
- P2.11.4: 40/40;
- P2.11.3: 31/31;
- P2.11.2: 30/30;
- P2.11.1: 45/45;
- P2.11: 31/31;
- P2.10: 38/38;
- P2.8: 33/33;
- P2.7: 35/35;
- P2.6: 21/21;
- P2.5: 20/20;
- Phase14F: 21/21;
- Phase14J: 18/18;
- Family Graph Query Engine: PASS;
- dense Family Graph Layout: PASS;
- project structure: 18/18.

## 9. Packaging rules

- FULL CODE copy-over release.
- Root `.gitignore` retained.
- Root copy-over BAT entrypoints retained and labeled P2.12.
- No `.md`/`.txt` documentation at project root.
- New documentation lives under `document/releases/performance/p2/`.
- No Firestore Rules/index, Cloud Function, Render game-server, or new native dependency deployment is required solely for P2.12.
