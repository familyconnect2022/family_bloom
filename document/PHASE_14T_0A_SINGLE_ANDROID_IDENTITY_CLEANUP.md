# Phase 14T.0A — Single Android Identity + Project Root Hygiene

## Why this cleanup exists

The experimental side-by-side Android setup (`Family Bloom` + `Family Bloom Dev`) is retired by product decision. Testing will use two physical devices or an OS clone/profile when simultaneous accounts are required.

## Current Android identity

- App name: `Family Bloom`
- Package: `com.familybloom.android`
- Scheme: `familybloom`
- Firebase Android config: root `google-services.json`
- Debug and Release use the same app identity.

There is no `APP_VARIANT`, `.dev` applicationId suffix, DEV branding tree, DEV Firebase config, or side-by-side installation contract in current code.

## Removed active infrastructure

- legacy DEV build/Metro/SHA scripts;
- DEV Firebase validation helper and config;
- native debug applicationId suffix plugin/guard;
- old dual-app-only static gates;
- DEV branding assets.

Historical reports remain as historical evidence only. They are superseded by this checkpoint.

## Build helpers now

- `scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat`
- `scripts/android/Family_Bloom_Android_Metro_Only.bat`
- `scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat`
- `scripts/android/Family_Bloom_Android_Build_APK_ONLY.bat`

The Debug helper targets `com.familybloom.android` too. On one Android user/profile it may update/replace the installed copy; use another device or a supported clone/profile for simultaneous testing.

## Root hygiene

Root `.txt` files are moved into managed locations:

- patch notes -> `document/history/patches/`
- device checklists -> `reports/device/`
- implementation/validation reports -> `reports/validation/`

`npm run phase14t0a:check` fails if a root `.txt` file is reintroduced.

## Chess handoff

This cleanup is the baseline before the realtime Chess module. The confirmed architecture is recorded at the top of `document/FAMILY_BLOOM_MASTER_HANDOFF_PROMPT_CURRENT.md`.
