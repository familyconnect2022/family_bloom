Family Bloom Phase 14R.4F — DEV DEVICE TARGETING HOTFIX
Date: 2026-10-01
Base: Phase 14R.4E

Problem fixed
-------------
The DEV build script detected an Android phone correctly with adb, then passed that adb serial to:
  npx expo run:android --device <ADB_SERIAL>
On some Expo CLI/device combinations the value is resolved as a device name rather than the adb serial, producing:
  CommandError: Could not find device with name: <serial>

Fix
---
- DEV build no longer passes the adb serial through Expo --device.
- After Expo prebuild, Gradle assembles app-debug.apk directly.
- The APK is installed with adb -s <serial>, so the exact connected phone is always targeted.
- The selected phone is revalidated immediately before build/install.
- Metro is started in a separate DEV window after installation.
- adb reverse tcp:8081 is applied only to the selected phone.
- RELEASE + DEV side-by-side verification is preserved.
- RELEASE build path remains unchanged.

How to use
----------
From the project root run:
  scripts\android\Family_Bloom_Android_DEV_Build_And_Run.bat

Do NOT use the old command containing:
  expo run:android --device <ADB_SERIAL>

Expected packages
-----------------
Release: com.familybloom.android
Dev:     com.familybloom.android.dev
