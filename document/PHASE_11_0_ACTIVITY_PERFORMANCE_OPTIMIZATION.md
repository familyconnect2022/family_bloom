# Phase 11.0 — Activity Performance Optimization

Date: 2026-09-26
Base: `Family_Bloom_Phase_11_0_ACTIVITY_NAVIGATION_HOTFIX_FULL_2026-09-26.zip`

## Why

The first Activity Center build calculated the Home bell badge by downloading recent family and targeted Activity pages for every family, then repeated the refresh after Moment/Event head changes. On multi-family accounts this produced unnecessary Firestore reads, parsing and React state churn even though Home only needs a small unread badge number.

## What changed

- Added tiny cumulative badge-summary documents for family-wide and targeted badge-eligible Activity.
- Badge summary increments are transactional and idempotent: deterministic Activity retries do not increment twice.
- Home badge now reads only the member checkpoint + two tiny summary docs per family instead of Activity pages.
- Added a 12s in-memory badge cache.
- Replaced the old 850ms + 2800ms double refresh with one 1200ms debounced refresh while Home is focused.
- Family-wide Activity authored by the current user is excluded from their own badge through cumulative self-authored counters.
- Activity -> Moment navigation no longer waits for the exact Moment fetch before routing. The exact read starts after the Bloom transition paints and runs in parallel with family switching; the Moments screen reuses the same in-flight promise.
- No new realtime listener was added. The Phase 10 `10 listeners ×1` target remains unchanged.

## Firestore

New presentation-only metadata paths:

- `families/{familyId}/activityMeta/badge`
- `families/{familyId}/members/{uid}/activityMeta/badge`

Member checkpoints now may include:

- `activityFamilySeenCount`
- `activityTargetSeenCount`
- `activitySelfAuthoredBadgeCount`
- `activitySelfAuthoredSeenCount`

These fields and summary docs are only notification UX metadata and are not authorization sources.

## Deployment

Publish the updated `firestore.rules` before testing this build:

```bash
firebase deploy --only firestore:rules
```

## Validation

- Phase 11 Activity Center contracts: PASS
- Phase 11 Activity badge/deep-link hotfix contracts: PASS
- Phase 11 Activity performance optimization contracts: PASS
- Phase 10 UX responsiveness: PASS
- Phase 10 reliability/performance: PASS
- Phase 8/9 regression contracts: PASS
- Shared realtime registry: PASS
- 157 TS/TSX static transpile: 0 syntax diagnostics
- Direct/Cloud Rules brace check: PASS

Full TypeScript project typecheck is not certified from the standalone ZIP because project dependencies/node_modules are not bundled.
