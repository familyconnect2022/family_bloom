# Family Bloom R3R14R3R7 — Build & Share: Expo Doctor on Windows

## Reported issue (28 October 2026)

`npm run doctor:native-check` stopped the Android APK release build when TWO checks failed:

1. `Directory check failed with unexpected server response` — transient upstream React Native Directory service check.
2. Four SDK 57 packages had newer recommended **patch** releases (`@expo/ui`, `expo`, `expo-notifications`, `expo-router`).

This was reported BEFORE Android Gradle compilation. It does not establish a Kotlin/Java build failure.

## Controlled fix

- `scripts/setup/run-expo-doctor-native-policy.js`: the first run is unchanged. Only if the output includes the exact React Native Directory remote-server error, rerun the locally pinned Expo Doctor exactly once with `EXPO_DOCTOR_ENABLE_DIRECTORY_CHECK=0` *scoped to that subprocess*. Every other check stays enabled. Any unrelated failed check still blocks build.
- A patch mismatch is advisory ONLY when Expo Doctor reports exactly the same number of dependency rows as out-of-date packages, every row is a **major/minor match with patch-only drift**, and all other checks pass. SDK major/minor mismatches still block.
- `test-phase-p2_15_5_1-build-share-doctor-patch-drift.js` and `test-phase-p2_12_6-build-dependency-contract.js`: no more hardcoded maximum patch; enforce Expo SDK 57 and a minimum known-good patch. Supports later safe `npx expo install --fix` without falsifying these gates.
- Updated the legacy Doctor test to verify the actual `__dirname` source path.

This release does **not** change Android app code, Web, Render, Firebase Rules or Vercel. Android identity and app version remain unchanged.

## Windows instructions

In the UPDATED Family Bloom project (the folder that contains `package.json`, `.env` and `google-services.json`), open CMD:

```bat
npx expo install --fix
npx expo install --check
node scripts\setup\check-expo-dependencies.js
node scripts\setup\check-package-lock.js
npm run doctor:native-check
```

If these succeed (or the controlled Doctor wrapper reports only a compatible patch advisory), open `scripts\android\Family_Bloom_MENU.bat` and select Build & Share.

Do not delete `.env`, `google-services.json`, credentials, keystore, or the real Android project. The ZIP deliberately does not bundle private credentials.

## Checks available offline

```
node scripts/tests/history/test-phase-p2_15_5_1-build-share-doctor-patch-drift.js
node scripts/tests/history/test-phase-p2_12_6-build-dependency-contract.js
node scripts/tests/history/test-phase15a2-native-doctor-policy.js
node scripts/tests/history/test-phase15a3-windows-doctor-launch.js
node scripts/tests/history/test-phase-p2_12_8-windows-expo-doctor-node-cli-launch.js
```

Limits: These are source and mock tests. The actual Expo Doctor with installed dependencies, Windows BAT execution, Gradle APK build, and physical Android device have NOT been executed in this environment. Network patch updates need to run on Windows where package installation works.
