# Family Bloom — Phase 8 Polish / Reliability TODO

Status: **IMPLEMENTED IN PHASE 8.3–8.5 · AWAITING DEVICE ACCEPTANCE**

These three items were originally deferred from the Phase 7 device test so they could be fixed together after the Phase 8.1 baseline. They are now implemented on top of the Phase 8.2 optimized base, but remain open until real-device retest.

## TODO-1 — Offline Moment retry

Observed previously:

```text
network lost
→ pending / failed Moment appears
→ tap Thử lại
→ post remains failed / retry flow does not recover correctly
```

Implemented in Phase 8.3:
- successful media files are checkpointed in the pending task;
- retry uploads only missing media;
- if all media are already uploaded and Firestore publish failed, retry only republishes the original reserved Moment;
- Cloudinary-success / media_assets-metadata-failure is checkpointed and repaired without binary re-upload;
- captured `familyId`, postId and creator identity remain immutable for that task;
- worker fan-out is bounded and each selected family is queued sequentially;
- successful checkpoint assets go to cleanup only when the user explicitly discards the pending Moment.

Device retest still required with actual network loss/recovery.

## TODO-2 — Button / card spacing

Observed in Phase 7 screenshots: some Bloom buttons/cards were visually too close together.

Implemented in Phase 8.4:
- shared `SPACING` tokens introduced;
- Family Switcher, family membership manager, Moments composer/feed actions and failed-pending actions normalized;
- no broad Graph layout spacing change, protecting Phase 8.2 benchmark comparability.

Device visual acceptance still required.

## TODO-3 — Immediate family-switch splash

Observed previously and measured by Phase 8.1:

```text
family_switch total ≈ 2820 ms
transition_state_requested = 0 ms
first bootstrap frame ≈ 249 ms
```

Implemented in Phase 8.4:

```text
tap target family
→ synchronously request transition
→ yield two animation frames / paint Bloom bootstrap
→ only then verify authoritative membership over network
→ switch FamilyScope
```

The native Family Switcher modal is also closed immediately after starting the transition so it cannot cover the global bootstrap while waiting for Firestore.

Device Performance Lab should verify `transition_painted_before_network` and perceived immediate feedback.

## Persistent test harness policy

Keep all Phase 8 automated performance-test files during optimization/reliability work. Synthetic 50/100/200/300/500 Person data stays RAM-only and never writes Firebase. Disable/remove the user-facing Performance Lab only when preparing the official production/release build.
