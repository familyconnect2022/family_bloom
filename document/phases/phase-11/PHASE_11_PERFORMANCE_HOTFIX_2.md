# Phase 11 Performance Hotfix #2

Base: `Family_Bloom_Phase_11_PERFORMANCE_HOTFIX_FULL_2026-09-27.zip` (official user-approved base).

Changes:
- Interaction JS-stall probe changed from 100ms `setInterval` to a 250ms self-scheduling `setTimeout`, preventing overlapping timer pressure during real tab usage.
- Adds `Tab switch p95` and `Tab switch cancelled` metrics scoped to the interaction probe.
- Automated regression prefers actual tab-switch p95 over the Performance Lab button's `UI press -> next frame` metric.
- Renames misleading `Stress initial visible batch` to `Stress first viewable callback`; the first callback is not treated as the complete visible window.
- Family Graph production/render optimization from Hotfix #1 is preserved unchanged.
- No Firebase, notification, package, app.json, or production feature behavior changes.
