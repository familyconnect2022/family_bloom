# Family Bloom P2.37R2C — Binary Identity Lock

Date: 2026-10-17
Base: P2.37R2 FULL copy/import/native integrity

## Why this refresh exists
Device video 6411 proved that P2.37R2 JavaScript was running on an older Android binary (`versionCode 143010`). Because the old binary cannot contain `FamilyBloomOverlay`, Surface testing was not yet valid.

## R2B binary identity
- App version: `1.3.6`
- Android versionCode: `143016`
- Native module package: `family-bloom-overlay@1.3.1`
- Native identity: `P2.37R2C-native-1`
- Android package: `com.familybloom.android`

## EAS hardening
- `eas.json` sets `cli.appVersionSource = local`, so the checked-in `app.json` versionCode is authoritative.
- `scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat` no longer offers `--no-wait`; it waits for the exact new build and always uses `--clear-cache`.
- EAS post-install proves the local Expo module, autolinking resolver and effective Expo config before native compilation continues.
- EAS on-success inspects the built APK. The APK must report package `com.familybloom.android`, versionCode `143016`, and DEX must contain `FamilyBloomOverlayModule`, `FamilyBloomOverlayHostView`, and `P2.37R2C-native-1`.

## In-app binary gate
Game Foundation shows EXPECTED and ACTUAL binary identity separately. Chess/Xiangqi Surface probes stay disabled until:
- actual versionCode = `143016`;
- `FamilyBloomOverlay = YES`;
- native identity = `P2.37R2C-native-1`.

This prevents a fresh JS bundle on an old APK from being misread as a Surface failure.

## Scope
No server, Chess protocol, Xiangqi protocol, recovery or authoritative gameplay behavior changed. This refresh only hardens Android binary identity, native module packaging verification and test diagnostics.
