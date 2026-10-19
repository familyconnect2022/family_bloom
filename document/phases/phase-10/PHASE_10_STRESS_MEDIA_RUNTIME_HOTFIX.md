# Phase 10 — Stress Media Runtime Hotfix

Date: 2026-09-26
Base: `Family_Bloom_Phase_10_UX_RESPONSIVENESS_STICKY_HEADERS_FULL_2026-09-26.zip`

## Why this hotfix exists

Android device testing found two crashes inside the developer-only whole-app Performance Lab:

- Timeline stress rows crashed while rendering synthetic media.
- Memory Book stress rows crashed while rendering synthetic media.

Both stacks pointed at calls to the imported `syntheticMediaUriFor(...)` helper from `performance-data-test.tsx`. Production Timeline/Memory Book data paths were not implicated; Events stress continued to run and the crashes happened only in synthetic test rows.

## Fix

`performance-data-test.tsx` now owns a small array of bundled local image sources via static `require(...)`. Timeline and Memory Book stress rows select directly from those bundled sources. This removes the runtime dependency on the named helper export while still exercising actual image decode/render work.

The synthetic source service is left intact because production-like Moment stress data still uses its URI fields and existing contracts depend on it.

## Regression scope

No changes to:

- Firestore / Cloudinary
- listener registry or runtime singleton architecture
- Graph layout algorithm
- Moment production feed
- Timeline production projection
- Memory Book production reader/editor

## Validation

- Phase 10 stress-media runtime hotfix contract: PASS
- Phase 10 Performance Lab hotfix contract: PASS
- Phase 10 UX responsiveness / sticky-header contract: PASS
- Phase 10 reliability / offline / whole-app performance contract: PASS
- Phase 8.5B runtime singleton contract: PASS
- Phase 8.2C tab regression / first-frame contracts: PASS
- Shared realtime registry contract: PASS
- Phase 8.7A Timeline foundation contract: PASS
- Phase 9.0+9.1 memory intelligence contract: PASS
- Phase 9.2A+9.2B Memory Book contract: PASS
- 153 TS/TSX syntax transpile: PASS

## Device retest

Retest only the failed whole-app stress screens first:

1. Timeline 100 / 200
2. Memory Book 100 / 200

Then run Moments and Events if desired. Graph does not need to be retested for this hotfix because the Graph code was not modified.
