Family Bloom Phase 14R.4G - RELEASE GRADLE DEBUG-SUFFIX HOTFIX
Date: 2026-10-01
Base: Phase 14R.4F

FIXED
- Release prebuild no longer inserts applicationIdSuffix '.dev' into signingConfigs.debug.
- The plugin now locates buildTypes first, then the debug block inside buildTypes using brace-balanced block lookup.
- The plugin is idempotent and removes a stale exact '.dev' suffix line before inserting it in the correct place.
- Added a generated-native guard after Expo prebuild. RELEASE must have exactly one '.dev' suffix inside buildTypes.debug; DEV must have none.
- Added Phase 14R.4G regression gate with an Expo-style Gradle fixture that contains both signingConfigs.debug and buildTypes.debug.

WHY THE PREVIOUS BUILD FAILED
The old plugin searched for the first `debug {` block. Expo-generated Gradle puts signingConfigs.debug before buildTypes.debug, so the suffix was inserted into SigningConfig. AGP then reported:
  Could not find method applicationIdSuffix() ... on SigningConfig

USAGE
Overlay PATCH on Phase 14R.4F, then run:
  scripts\android\Family_Bloom_Android_Test_App_RELEASE.bat

The release script clean-prebuilds Android, so the previously malformed generated android/app/build.gradle is replaced automatically.
