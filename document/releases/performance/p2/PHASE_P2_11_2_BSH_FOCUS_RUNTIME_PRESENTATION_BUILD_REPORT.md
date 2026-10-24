# Family Bloom P2.11.2 — BSH Focus Runtime / Presentation

Date: 2026-10-11  
Baseline: P2.11.1 Bloom Scene Hydration (BSH) FULL CODE

## Runtime evidence

Device video 6281 showed a useful separation of failure domains. Large Focus branches were opening faster than before, and their graph scene could be seen rendered. The remaining failure happened after Scene construction: the viewport could point at a deeper descendant instead of the selected Person, the preparation UI could remain alive after graph paint, and Back could visually reveal/move the graph during teardown.

This supports the BSH diagnosis: GraphModel / GraphLayout / GraphScene are producing usable data, while Stage 4 runtime/presentation still had camera-validity and lifecycle coupling bugs.

## Root cause 1 — automatic camera poisoning

`commitCameraSnapshot()` previously persisted every Focus camera into BSH runtime cache. The same function was called from automatic camera initialization and from a coarse `useAnimatedReaction`. Therefore a bootstrap/transitional camera could become the next reopen camera without any user Pan/Pinch.

P2.11.2 adds `userCameraValid` to GraphRuntimeState. Automatic camera snapshots still update current React/culling state, but they do not enter the restorable runtime camera cache. Only explicit user interaction may validate/persist a camera.

Pan and Pinch additionally commit the exact final transform on gesture finalize. This keeps coarse viewport-cell reactions as an optimization while preserving precise user camera restore behavior.

## Root cause 2 — readiness coupled to progressive culling

P2.11.1 removed the worst culling dependency, but the visual-ready effect still depended on changing progressive/viewport sets. On a wide/deep branch those dependencies could repeatedly clean up scheduled RAF callbacks while the graph was already paintable.

P2.11.2 replaces this with a bounded first-paint contract:

1. prepared GraphScene exists;
2. graph viewport has non-zero measured size;
3. initial camera has been applied;
4. two presentation frames complete.

Focus readiness no longer depends on `visibleNowPersonIds`, `viewportPersonIds`, bootstrap retained-set growth, or progressive batch completion.

## Root cause 3 — loader/native overlay lifetime

The preparation layer previously remained mounted after readiness and was only faded. It also had a high z-index/elevation. Even with `pointerEvents="none"`, leaving an elevated transparent layer over an Android hardware-accelerated Modal adds unnecessary compositing ambiguity.

P2.11.2 conditionally unmounts the preparation layer after `visualReady`. It remains compact, graph-viewport centered and non-interactive while active, but it has no Android elevation.

## Root cause 4 — Focus surface moved during Back

The Focus card previously used the same progress value for entry and exit, applying a translate and near-1 scale. During Back the overlay therefore moved while the frozen base graph remained behind it, creating the observed sink/rise impression.

P2.11.2 fixes the Focus card transform at translate `(0,0)` and scale `1` for the native Modal lifetime. Exit is short and non-collapsing; the graph geometry does not move before unmount.

## Cache compatibility

`FAMILY_GRAPH_SCENE_VERSION` is bumped from 1 to 2. Scene/runtime keys therefore cannot reuse P2.11.1 Focus camera state. Model and Layout cache architecture remains independent and reusable according to its own revision keys.

## New P2.11.2 regression gate

`scripts/tests/history/test-phase-p2_11_2-bsh-focus-runtime-presentation.js`

The gate verifies, among other invariants:

- fresh runtime camera is invalid/null;
- retained-node hydration cannot validate a camera;
- explicit runtime camera update marks `userCameraValid`;
- Focus entry remains 0.95 scale and 42% vertical anchor;
- canonical coordinate mapping round-trips the selected Person to exactly 50% viewport width / 42% viewport height;
- automatic camera persistence is guarded by explicit user interaction;
- both Pan and Pinch finalize persist exact final transform;
- readiness is independent from Focus culling sets;
- loader unmounts at ready and has no Android elevation;
- Focus card geometry remains fixed during dismissal;
- Scene version 2 invalidates P2.11.1 runtime camera identity;
- copy-over and Android build BATs invoke the new gate.

## Historical gate updates

Several older gates intentionally encoded superseded implementation details (waiting for mounted viewport Focus IDs, delayed hydration until point-to-card travel completed, and translate/scale Focus exit). Their assertions were updated to accept the stronger P2.11.2 successor contracts. Behavioral invariants such as no fit-all Focus, native Modal isolation, two-frame presentation readiness, request race guards, pan/pinch availability and topology correctness remain enforced.

## Packaging

- FULL CODE copy-over package.
- Root `.gitignore` retained.
- Root copy-over BAT entrypoints retained.
- No Markdown/TXT files at project root.
- New documentation stored under `document/releases/...` only.
- No Firebase/Render/native dependency deployment change required solely by P2.11.2.
