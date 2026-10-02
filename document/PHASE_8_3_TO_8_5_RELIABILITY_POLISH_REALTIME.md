# FAMILY BLOOM — PHASE 8.3 → 8.5
## Offline Reliability · Multi-Family Moments · UX Polish · Realtime Hardening

Build date: 2026-09-25  
Base: **Phase 8.2 Graph Performance Optimized**  
Status: **IMPLEMENTED · AWAITING USER DEVICE TEST**

> Phase 8.2 Graph optimizations remain authoritative and are preserved. Phase 8.3–8.5 must not regress the 8.2 relationship index, bounded pre-layout mount, progressive 64/48 budget, viewport working-set connector routing, or persistent automated performance harness.

## Phase 8.3 — Moment reliability + opt-in multi-family share

### Resumable retry

Pending Moment now checkpoints every successful media upload. If a later upload or the Firestore publish step fails:

```text
failed upload
→ keep already uploaded assets
→ Thử lại
→ upload only missing files
→ publish original reserved postId
```

If Cloudinary succeeds but the `media_assets` metadata write fails, the provider result is retained as a checkpoint. Retry repairs the small metadata record first and **does not upload the binary again**.

Successful uploads are marked `cleanup_pending` only when the user explicitly discards the failed pending Moment. A normal retry never cleans up its reusable checkpoint.

The publish queue waits for every bounded media worker to settle before starting the next family task, preventing a sibling upload from continuing in the background while another family publish begins.

### Multi-family Moment share

Moment composer now has an explicit section:

```text
Chia sẻ thêm tới nhà khác
[ ] Family B
[ ] Family C
```

Contract:

- default = OFF; current family only;
- user explicitly selects extra houses;
- maximum 3 additional families per publish (4 total including source);
- each target family receives an **independent Moment** with its own reserved post id and durable `media_assets` lifecycle;
- target families are queued one at a time so selecting B/C does not multiply upload concurrency;
- current-family `personIds` are **not copied** to other houses because FamilyPerson IDs are family-scoped;
- Firestore membership/rules remain authority. A stale target membership simply fails safely instead of bypassing permission;
- independent Cloudinary/media copies are intentional: deleting a post in one house cannot delete the provider binary used by another house.

This design favors family isolation/data safety over cross-family media deduplication.

## Phase 8.4 — UX polish

### Immediate family transition

Family switch now requests transition state synchronously, yields two animation frames so the Bloom bootstrap can paint, **then** starts network membership verification.

Native Family Switcher modal also closes immediately after `switchFamily()` is started instead of remaining above the global bootstrap until the network call finishes.

Target lifecycle:

```text
tap target family
→ transition visible
→ next painted frame
→ verify authoritative membership
→ switch activeFamilyId
→ rebuild target FamilyScope
→ reveal target family when startup gate is ready
```

The Performance Lab keeps the `transition_painted_before_network` marker so the device report can verify the improvement.

### Spacing

A shared `SPACING` token was added and applied to the most visible Phase 7/8 problem areas:

- Family Switcher;
- family membership manager;
- Moments composer/feed actions;
- failed Pending Moment actions.

This avoids scattering unrelated one-off margins across the whole app while preserving Bloom visual language.

## Phase 8.5 — Firestore / realtime hardening

### Focus-gated listeners

Planner still performs its initial bounded warm-up behind the startup splash. Once warm, local month/past/list listeners live only while Planner is focused. Hidden moderation listeners in Planner and Moments are also focus-gated.

The Performance Lab now tracks those local listeners explicitly so listener leakage can be seen in the generated report.

### Graph read dedupe

Concurrent identical Person-directory reads in `familyGraphService` share one in-flight request. This is **in-flight-only**, not a persistent cache: the entry is deleted as soon as Firestore resolves, so graph edits cannot be hidden by stale cache data.

## Cross-family graph bridge — safe foundation only

User proposed a future optional view connecting two family trees they belong to, such as their own family and spouse's family.

This build adds a pure/read-only foundation:

```text
buildCrossFamilyIdentityBridge([...snapshots])
```

Only the same `linkedUid` appearing as a Person in two accessible family snapshots can form an identity bridge. The bridge:

- does NOT persist anything;
- does NOT create `parent_child` / `partner` edges across families;
- does NOT merge Firestore collections;
- does NOT enable itself automatically.

Feature flags:

```text
CROSS_FAMILY_GRAPH_BRIDGE_AVAILABLE = true
CROSS_FAMILY_GRAPH_BRIDGE_DEFAULT_ENABLED = false
```

The actual combined-tree UI remains deferred until Phase 8.2 device performance is accepted and a dedicated privacy/performance decision gate is approved. It must remain explicit opt-in.

## Deploy / data impact

```text
Firestore schema        unchanged
migration               none
firestore.rules         unchanged for this build
Cloud Functions         unchanged / not required
Blaze                    not required
native dependency        none
USE_CLOUD_FUNCTIONS      false
Performance Test Lab     retained intentionally
```

## Device acceptance

Prioritize:

1. lose network during multi-media Moment → restore network → `Thử lại` succeeds without duplicate Moment;
2. fail after some media have uploaded → retry resumes instead of uploading successful files again;
3. post from Family A and opt-in B/C → one independent Moment appears in each selected family, no post in unselected family;
4. switch family while publish queue is running → every task stays bound to its captured target family;
5. discard a failed pending Moment → checkpoint assets move to cleanup path;
6. Family A→B switch → splash/transition becomes visible before network verification work;
7. tab/listener report stays bounded after repeated tab/family switching;
8. Phase 8.2 Graph 100/300/500 benchmark still behaves at least as well as the 8.2 candidate.

Do not mark Phase 8.2 or Phase 8.3–8.5 CLOSED until user device acceptance.
