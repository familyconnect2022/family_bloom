# Family Bloom — Phase 12 Bloom Supper + Reliability

Checkpoint date: 2026-09-28

## Scope

This checkpoint deliberately combines the Phase 12 visual-system pass with the remaining reliability/polish work so the real-device acceptance can be done once.

### Bloom Supper visual system

- Rich, purpose-aware hero artwork for Event, Moment, Family/Tree and relationship flows.
- Full-bleed hero headers own the top safe area/status-bar surface.
- Family Graph uses the tree hero at route level and leaves only graph controls below it, avoiding duplicate page titles.
- Family Graph controls and viewport receive explicit horizontal spacing so copy/actions do not touch screen edges.
- Shared input surfaces are brighter and use a stronger border/focus state so editable fields are visually distinct from the blush page background.
- Product-level confirmations and information dialogs use `BloomDialogProvider` / `BloomConfirmDialog` instead of `Alert.alert`; operating-system permission prompts remain native by design.

### Reliability hardening

- Moment retry uses `pendingRef` as the immediate source of truth so a retry tapped immediately after reconnect cannot observe a one-render stale task.
- Successful media-upload checkpoints continue to be reused; retry resumes missing work rather than intentionally restarting completed uploads.
- When Android returns the app to foreground, automatic retry waits 900 ms before resuming failed Moment jobs, giving Wi-Fi/mobile data time to become usable. Manual retry remains immediate.
- Family-switch transition behavior from the Phase 11 base is preserved: the transition overlay is raised synchronously before async verification and is only released after the Tabs workspace reports ready.
- Existing Phase 11 performance and E2E regression infrastructure remains in the repository unchanged.

## Important limits

The Moment queue in this checkpoint remains an in-memory session queue. It improves reconnect/foreground retry behavior but does not claim force-stop/process-death persistence.

## Real-device acceptance bundle

1. Visual: opening/login/home, Event/Moment, Family Tree/Build Tree, Profile/Family flows follow Bloom Supper and inputs are visually obvious.
2. Dialogs: back out of a dirty Event/Moment and verify a Bloom-styled confirmation (not a plain Android alert).
3. Family Graph: hero is full bleed, content is padded, controls are not duplicated, graph interaction still works.
4. Family switch: switching A → B → C shows the transition overlay immediately and lands in the correct family.
5. Moment reconnect: start a media Moment, remove connectivity until it fails, restore connectivity, retry (or foreground the app) and verify the task resumes without redoing already checkpointed media.
6. Regression: run the Phase 11 Final Performance Gate once; no notification re-test is required unless behavior changed.
