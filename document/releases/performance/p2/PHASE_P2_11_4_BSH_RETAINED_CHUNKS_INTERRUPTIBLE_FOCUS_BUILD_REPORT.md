# Family Bloom P2.11.4 — BSH Retained Chunks / Interruptible Focus

Date: 2026-10-11  
Baseline: P2.11.3 BSH Cancel-first Focus / Immediate Back FULL CODE

## Device evidence

Video 6283 shows that topology/layout correctness is now substantially improved, but two presentation-runtime problems remain:

1. Back can still take seconds even when the close handler itself is immediate, because JavaScript is busy doing progressive graph work and connector recalculation.
2. Panning/zooming visibly reconstructs mostly connector lines. Nodes that were already visited are not being treated as a fully stable retained surface.

P2.11.4 addresses those problems without changing the P2.11 topology rules or the P2.11.2 camera contract.

## Runtime contract: load once, retain for the Scene lifetime

Focus no longer treats camera movement as a render/cull loop.

The new contract is:

`UI-thread pan/pinch -> spatial discovery only when camera reaches a new region -> append unseen IDs -> retain forever for this Scene`

If the current region was already loaded:

- no node-set mutation;
- no connector routing;
- no connector viewport culling;
- no Person remount;
- camera movement remains a UI-thread canvas transform.

Focus also stops auto-expanding its branch while idle. The old `28 -> +24 -> +24...` Focus batch behavior is disabled. The prepared Scene is retained as an in-memory discovery index, not automatically mounted React content.

## BSH now has an explicit Geometry stage

P2.11.4 extends the architecture to:

`GraphModel -> GraphLayout -> GraphGeometry -> GraphScene -> GraphRuntime -> Renderer`

`GraphGeometry` is revision-keyed and independently cached. It owns:

- partner-unit classification;
- shared-child union membership;
- single-parent link classification;
- the connector routing plan.

The Scene includes a stable Geometry object and Geometry key. Scene version is bumped so runtime state from the older presentation contract cannot be silently reused as if it had prepared Geometry.

Profile-only visual hydration can reuse Model/Layout/Geometry when layout-affecting fields do not change.

## Semantic spacing is deterministic

The device question about spacing was checked directly against the layout engine. It does not assign a random gap to each Person. Spacing is relationship-aware:

- partner gap: `16 px`;
- sibling family-unit gap: `30 px`;
- independent family-unit gap: `72 px`;
- vertical generation step: `216 px`.

A visual unit can contain one Person or a partner pair, so center-to-center distances can differ depending on unit width. The inter-unit gap itself remains deterministic by relationship class. P2.11.4 regression locks these values so pan/zoom cannot alter geometry.

## Focus connector retention

The Focus renderer no longer passes moving viewport bounds into prepared connectors.

Prepared Geometry is rendered as memoized primitives:

- `PreparedPartnerConnector`;
- `PreparedUnionStemConnector`;
- one `PreparedUnionChildConnector` per shared child;
- one `PreparedSingleParentConnector` per single-parent route.

When a new retained region adds a connector, only the new primitive mounts. Existing primitives retain stable object/number props and React memoization can skip them.

Legacy Full Tree routing remains isolated to the old viewport-bounded path for compatibility; this change is intentionally scoped to the Focus runtime proven problematic by video 6283.

## Focus node retention

For Focus, `viewportPersonIds` is now the monotonic `retainedFocusPersonIds` set itself. It is no longer recomputed as a moving union of current viewport IDs on every render.

Spatial discovery only appends missing Person IDs. If no new IDs are found, the state setter returns the existing Set object unchanged.

Person nodes also use a semantic React memo comparator. Relation metadata is cached for retained Persons so an old card does not receive a newly allocated relationship object merely because another region became visible.

## Camera/runtime scheduling

The Reanimated camera still moves continuously on the UI thread.

For Focus, crossing a coarse camera cell calls spatial discovery rather than committing a React camera snapshot. React camera state remains reserved for meaningful final user-camera persistence. This removes the previous `pan -> cameraSnapshot -> viewport bounds -> connector route plan -> line redraw` chain.

Loading a newly discovered retained region is wrapped in `startTransition()`, so Back is an urgent update and can preempt/discard that non-urgent presentation work.

## Back behavior

The P2.11.3 close contract remains unchanged:

- invalidate request;
- cancel Focus scheduled work;
- cancel active BSH token/animations;
- `setFocusOverlay(null)` immediately.

P2.11.4 improves the practical responsiveness of that handler by removing the recurring long JS tasks that previously delayed the Back event from reaching JavaScript in the first place.

The interruptible BSH builder now has an additional boundary around Geometry:

`yield -> Model -> yield -> Layout -> yield -> Geometry -> yield -> Scene`

## Regression gate

New gate:

`scripts/test-phase-p2_11_4-bsh-retained-chunks-interruptible-focus.js`

It verifies:

- Geometry stage exists and is independently cached;
- Scene carries Geometry and Geometry revision;
- Geometry route plan is built outside React;
- semantic spacing invariants (partner/sibling/generation);
- profile-only changes can reuse Layout/Geometry;
- Focus idle auto-expansion is disabled;
- Focus mount set is retained-only and monotonic;
- discovery appends unseen IDs only;
- new-region discovery uses transition priority;
- Focus camera-cell reactions call spatial discovery rather than React camera commits;
- Focus prepared connectors receive no moving `renderBounds`;
- prepared connector path never calls the routing planner;
- partner/stem/child/single-parent line primitives are memoized independently;
- retained relationship labels are cached;
- Person cards have semantic memo comparison;
- immediate Back contract is preserved;
- Geometry is part of the interruptible BSH stage boundaries;
- Geometry cache participates in graph cache cleanup;
- copy-over and Android build helpers invoke the P2.11.4 gate;
- changed TS/TSX transpiles cleanly.

## Historical gate compatibility

P2.11's old assertion expected the render set to be recomputed as a moving union of retained + current viewport IDs. P2.11.4 intentionally supersedes that implementation with a strictly monotonic retained set. The historical assertion was updated to preserve the intended invariant (visited nodes never disappear) while accepting the stronger retained-only successor contract.

P2.11.2's Scene-version assertion was also updated from exact `2` to `>=2`, because P2.11.4 correctly bumps the Scene version again for the new Geometry/runtime contract.

## Packaging

- FULL CODE copy-over release.
- Root `.gitignore` retained.
- Root copy-over BAT entrypoints retained.
- No Markdown/TXT files at project root.
- New documentation is stored under `document/releases/performance/p2/`.
- No Firebase/Render/native dependency deployment change is required solely by P2.11.4.
