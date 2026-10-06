# Phase 11 Performance Hotfix #3 — Final Gate Instrumentation

Base: `Family_Bloom_Phase_11_PERFORMANCE_HOTFIX_2_FULL_2026-09-28.zip` (user-approved current basecode).

Scope: instrumentation/gate only. Production Graph rendering, Firebase, notifications, Event/Moment behavior, packages and app config are unchanged.

Changes:
- Separates the automated Final Gate event-loop probe from the explicit 60-second real-interaction probe.
- Renames ambiguous `JS stall` metrics to normalized `event-loop delay`; the expected 250ms timer interval is explicitly excluded.
- Records p50 / p95 / max, counts >=100ms and >=500ms, top-3 delays, and callback sample coverage.
- Final Gate uses stress-specific guardrails because it intentionally renders Graph 50→500 plus eight 100/200-item list workloads.
- The 60-second real-use probe keeps stricter thresholds and remains the only probe that scores tab-switch p95/cancelled navigation.
- Synthetic stress-screen button timings are no longer used as the app-wide navigation verdict in Final Gate.
- Final Gate still fails on missing Graph/stress coverage, step timeout/error, missing event-loop probe, catastrophic long blocks, duplicate navigator mounts, or material listener regressions.

Expected outcome:
- Preserve the Hotfix #1/#2 Graph gains.
- Remove false FAIL caused by comparing automated synthetic-render timer delay to real-interaction thresholds.
- Keep long JS blocks visible rather than hiding them by raising thresholds globally.
