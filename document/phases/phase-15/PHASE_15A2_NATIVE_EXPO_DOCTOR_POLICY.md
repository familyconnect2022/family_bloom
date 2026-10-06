# Phase 15A.2 — Native Expo Doctor Policy Hotfix

Date: 2026-10-05 (VN)

## Problem
Android Debug/Release helpers stopped at Expo Doctor with 20/21 checks because the repository intentionally contains native Android project folders while `app.config.js` / `app.json` also retain native Expo configuration fields. The build helpers subsequently run `expo prebuild --platform android --clean`, so this single non-CNG sync warning is expected for this workflow and should not block the build.

## Fix
- Added `scripts/setup/run-expo-doctor-native-policy.js`.
- Expo Doctor still runs normally and its output is printed.
- Exit 0 is accepted normally.
- A nonzero Doctor result is tolerated only when exactly one check fails and it is the known `Check for app config fields that may not be synced in a non-CNG project` warning with the expected native-folder / Prebuild explanation.
- Any unknown Doctor failure, multiple failures, or unclassifiable failure remains build-blocking.
- Debug, Release, Install/Doctor and legacy setup all use the same policy.
- Added `npm run doctor:native-check` and `npm run phase15a2:check`.

## Validation
- Phase 15A.2 native Doctor policy: 12/12 PASS.
- Phase 15A structure/UI: 30/30 PASS.
- Release readiness: 11/11 PASS.
- Current Chess aggregate gates: 14/14 PASS.
- Phase 14N current Focus/catalog: 13/13 PASS.

## Scope
No gameplay, UI, Firebase contract, Chess authoritative state, Hint/Motion/FX, promotion, or result-overlay behavior changed in this hotfix.
