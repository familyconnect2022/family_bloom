# Phase 14R.1 — Dual Android variants (RELEASE + DEV/Metro)

Date: 2026-10-01
Base: Phase 14R Time Capsule Functional V1 clean-root FULL

## User-approved behavior

Family Bloom now supports two Android apps installed side-by-side from one source tree:

- RELEASE
  - display name: `Family Bloom`
  - package: `com.familybloom.android`
  - scheme: `familybloom`
  - launcher/adaptive/themed/notification icon assets use the user-supplied Family Bloom family/house artwork
  - standalone APK, Metro not required after installation
  - Firebase config remains root `google-services.json`

- DEV / Metro
  - display name: `Family Bloom Dev`
  - package: `com.familybloom.android.dev`
  - scheme: `familybloom-dev`
  - launcher/adaptive/themed/notification icon assets use an Expo-style default black/white icon so DEV is visually unmistakable
  - debug/dev-client build intended for Metro workflow
  - Firebase config is separate: `config/firebase/google-services.dev.json`

Both apps may connect to the same Firebase project/database, but Android treats them as separate installed apps. Local storage, cache, app permissions and locally scheduled notifications are therefore separate per variant.

## Implementation

`app.config.js` selects the variant using `APP_VARIANT`:

- missing / `production` => RELEASE
- `development`, `dev`, or `metro` => DEV

The static `app.json` remains a safe RELEASE default.

Brand assets live under:

- `assets/branding/release/`
- `assets/branding/dev/`

Android helpers live under `scripts/android/`:

- `Family_Bloom_Android_Test_App_RELEASE.bat`
- `Family_Bloom_Android_Build_APK_ONLY.bat`
- `Family_Bloom_Android_Install_Last_APK.bat`
- `Family_Bloom_Android_DEV_Build_And_Run.bat`
- `Family_Bloom_Android_DEV_Metro_Only.bat`
- `Family_Bloom_Android_Print_DEV_SHA.bat`

A clean Expo prebuild is intentional whenever building a native DEV or RELEASE variant. Package ID, launcher resources and Firebase configuration differ between variants, so clean regeneration prevents stale native resources from one variant leaking into the other.

## Firebase DEV setup gate

Before the first DEV native build, register Android package `com.familybloom.android.dev` in Firebase project `family-connect-4184f`, add the local Android debug SHA-1 and SHA-256, download its `google-services.json`, rename it to `google-services.dev.json`, and place it in `config/firebase/`.

The RELEASE Firebase file must remain unchanged at root as `google-services.json`.

## Build-script reliability fixes carried forward

- no unsupported Expo `--output` argument
- no `npm ci` dependency on a stale lockfile in Android build helpers
- if node_modules is missing/incomplete, Android helpers use `npm install --no-audit --no-fund`, which also repairs package-lock on the user's online Windows machine
- RELEASE APK output is `dist/android/Family_Bloom_Release_LATEST.apk`
- Android BAT files remain outside project root and resolve the root automatically

No Firestore schema, Rules, Functions, Time Capsule permission, or persisted-data semantics are changed by Phase 14R.1.
