# Phase 11 Performance Hotfix — 2026-09-27

Baseline report: Final Gate 13/13 completed; JS stall p95 383ms, max 3108ms; Graph 500 first paint 5734ms/full mount 6178ms/layout adapter 1809ms.

Changes:
- FamilyGraph progressive batches now always yield through one animation frame before idle work. This prevents multiple progressive batches from monopolizing JS before Android presents a frame.
- Family graph layout reuses a single Vietnamese Intl.Collator rather than repeatedly invoking localeCompare with a locale during large sort workloads.
- Progressive graph order uses a lightweight deterministic string comparison for tie-breaking.

Safety:
- No Firebase schema/rules changes.
- No notification/Event/Moment behavior changes.
- No package/app.json changes.
- Existing Phase 8.2 progressive + viewport-culling architecture remains intact.

Verification:
- Phase 11 Final Performance Gate contract: PASS.
- Phase 11.2B harness safety/regression contract: PASS.
- Phase 11.2B Firebase E2E safety contract: PASS.
