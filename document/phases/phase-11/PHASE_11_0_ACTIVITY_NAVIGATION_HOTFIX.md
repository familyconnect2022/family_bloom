# Phase 11.0 Activity Navigation Hotfix

This build preserves the existing Family Graph add-person UI/behavior from the prior Activity Badge/Deep-link hotfix.

Changes retained in this hotfix:
- Activity Center paints a Bloom transition before cross-family/deep-link work.
- Exact Moment deep-link is prefetched by id into a short-lived in-memory cache.
- Moments screen consumes prefetched Moment first and keeps a lightweight loading fallback.
- No new realtime listener was added.

Graph add-person UI is intentionally unchanged from the prior baseline.
