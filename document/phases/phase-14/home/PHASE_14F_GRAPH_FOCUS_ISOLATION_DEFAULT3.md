# Family Bloom — Phase 14F: Graph Focus Isolation + Default 3 Generations

## Product contract

The normal genealogy canvas and Focus View are now two separate visual responsibilities. The base canvas is the user's stable context. Focus View is a temporary bounded projection built above that context.

### Base canvas invariant

Opening or closing a branch must not:

- change the base `viewAnchorPersonId`;
- change the selected/highlighted Person because of the branch request;
- dim non-branch nodes or connectors;
- recalculate an in-place branch;
- recenter, rescale or reset the background camera;
- replace the current 3 / 5 / all mode.

The only graph built for a branch request is the independently laid-out bounded graph inside Focus View. If a bounded Focus visual cannot be produced, the base canvas remains untouched; there is no legacy fallback.

### Default entry

The standard graph opens in **3 thế hệ**. The Person linked to the current account is used as the initial scope/camera anchor so that Person is moved to the center region of the viewport and visually highlighted. It is not treated as an active branch focus.

Consequently, there is no default `Nhánh đang xem` banner, no default relation-badge pass, no connector fading and no automatic selected-state sheet.

### Focus View

Focus View remains available while the background is in 3 generations, 5 generations or all genealogy. It owns its pan/pinch gestures and an interaction shield blocks the background. Tapping B while A is focused swaps the bounded branch inside the same overlay.

### Performance

The base graph keeps the same loaded snapshot and visual coordinates while Focus View is open. Expensive graph memo dependencies are not changed by the overlay state. Person nodes/connectors retain stable props, so memoized graph elements can bail out while the focus overlay animates independently.

A route-level branch-layout cache stores bounded visuals by `mode:personId` for the lifetime of the current query-engine snapshot. Re-opening the same branch can therefore reuse its computed layout. A new snapshot yields a new cache.

No Firestore listener or network query is introduced.
