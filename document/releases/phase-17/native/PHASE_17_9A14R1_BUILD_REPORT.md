# Family Bloom Phase 17.9A14R1 — Copy-over Gate Hotfix

## Base
Phase 17.9A14 Instant Home + Firebase Data Source Cleanup.

## Reason for hotfix
The legacy Phase 17.1 verification gate checked the root Chess provider using the exact literal `<ChessRealtimeProvider>`. A14 correctly added the prop `bootReady={backgroundWarmReady}`, so the runtime became `<ChessRealtimeProvider bootReady={backgroundWarmReady}>`. The provider remained at the root, outside the Tabs runtime scope, but the brittle string check reported a false failure (55/56).

## Fix
Updated `scripts/test-phase17-five-tab-runtime-lifecycle.js` to accept a `ChessRealtimeProvider` opening tag with or without props while preserving the architectural check that `TabRuntimeProvider` is not in the root layout.

No app runtime code, Firestore rules/indexes, Chess server code, or Firebase schema was changed by this hotfix.

## Verification
- Phase 17.1 Five-Tab Runtime Lifecycle Hotfix: 56/56 PASS.
- Phase 17.9A14 Instant Home + Firebase data source cleanup gate: PASS.
