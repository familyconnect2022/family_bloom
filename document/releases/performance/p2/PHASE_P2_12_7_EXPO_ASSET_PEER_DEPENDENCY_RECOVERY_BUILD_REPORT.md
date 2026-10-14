# Family Bloom P2.12.7 — Expo Asset Peer Dependency Recovery

## Scope

P2.12.7 is a build-system recovery release on top of P2.12.6. It fixes the real Expo Doctor failure reported on Windows: `expo-audio` requires `expo-asset` to be installed directly.

## Changes

- Adds `expo-asset ~57.0.19` as a direct dependency for Expo SDK 57.
- Keeps `expo-audio ~57.0.5`.
- Does **not** add the `expo-asset` config plugin for M4A files; board SFX continue to use Metro static `require()` assets.
- Adds `expo-asset` to installed dependency and package-lock contracts.
- Debug, Release, CLEAN APPLY and standalone APK/share build all verify/bootstrap `expo-asset`.
- Adds P2.12.7 regression gate.

## Expected Windows recovery

After copy-over, `npm install` should resolve `expo-asset`, and `npx expo-doctor` should no longer fail the `Missing peer dependency: expo-asset / Required by: expo-audio` check.
