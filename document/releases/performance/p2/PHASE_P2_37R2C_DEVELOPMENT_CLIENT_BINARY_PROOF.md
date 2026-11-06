# Family Bloom P2.37R2C — Development Client Binary Proof

Date: 2026-10-17
Base: P2.37R2B authenticated native sibling presentation

## Why R2C exists
Real-device testing showed JS P2.37R2B could run through Metro while the installed Android development client was still an older native binary. The R2B EAS profile built an internal APK but did not explicitly set `developmentClient: true`, while the actual test workflow uses Metro + a development client. R2C aligns the build artifact with that workflow and adds device-level proof independent of JS.

## Binary identity
- App version: `1.3.6`
- Android versionCode: `143016`
- Local module package: `family-bloom-overlay@1.3.2`
- Native identity: `P2.37R2C-native-1`
- Android package remains `com.familybloom.android`.

## EAS profile correction
`family-bloom-test` now explicitly uses `developmentClient: true`, `distribution: internal`, Android APK output, and `cli.appVersionSource: local`. This makes the EAS test APK the same kind of binary the Metro workflow expects.

`scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat` always waits for the new build, clears EAS cache, verifies source/import/native identity first, and contains no malformed TAB path separators.

## Device-level proof
Two root helpers were added:
- `scripts/android/install/Family_Bloom_INSTALL_R2C_APK.bat` — install the exact APK supplied by the user through ADB with `adb install -r`.
- `scripts/android/verify/Family_Bloom_VERIFY_DEVICE_BINARY_R2C.bat` — read Android `dumpsys package com.familybloom.android` and require `versionCode=143016` before Metro testing.

This proof is independent of JS/Metro, so a new JS bundle cannot make an old native client look current.

## Native module proof
The existing native proof remains mandatory:
- Expo Autolinking must resolve `FamilyBloomOverlayModule`.
- Generated Gradle project must contain the local module.
- Built APK manifest must use versionCode `143016`.
- APK DEX must contain `FamilyBloomOverlayModule`, `FamilyBloomOverlayHostView`, and `P2.37R2C-native-1`.

## Copy-over integrity
PRE_COPY and post-overlay cleanup retain the active presentation/socket directories. Source import scanning after cleanup remains 291 files / 1710 literal imports / 0 missing.

## Validation
- P2.37R2C binary identity lock: 14/14 PASS
- P2.37R2C FULL copy/import/native integrity: 31/31 PASS
- P2.37 authenticated native sibling: 28/28 PASS
- P2.35 recovery: 37/37 PASS
- P2.34 session/presentation: 42/42 PASS
- Project structure: 18/18 PASS
- Build BAT audit: 27 BAT PASS
- Release readiness: 11/11 PASS
- TS/TSX syntax transpile: 291/291 PASS
- Post-clean import graph: 1710 imports / 0 missing
- `server/` tree is byte-identical to R2B.

## Device acceptance sequence
1. Run PRE_COPY, overlay the entire R2C FULL tree, then CLEAN APPLY.
2. Build with `scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat`.
3. Install only the APK produced by that build; `scripts/android/install/Family_Bloom_INSTALL_R2C_APK.bat` can install it through ADB.
4. Run `scripts/android/verify/Family_Bloom_VERIFY_DEVICE_BINARY_R2C.bat` and require PASS / versionCode 143016.
5. Start Metro and open the R2C development client.
6. Game Foundation must show `FamilyBloomOverlay: YES`, native identity `P2.37R2C-native-1`, and Binary gate PASS before testing Native Host/Surface.
