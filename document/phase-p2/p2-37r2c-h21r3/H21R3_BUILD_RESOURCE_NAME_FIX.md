# Family Bloom H21R3 — Gradle AAPT2 resource filename fix

Date: 2026-10-19
Source baseline: H21R2 FULL (1.3.21, Android versionCode 143031)
Scope: build system / native SoundPool assets only. **Chess/Xiangqi gameplay, server, Firebase, Firestore, UI and game protocol are unchanged.**

## Confirmed real Windows failure

Gradle failed at `:family-bloom-overlay:packageReleaseResources`:

`.../res/raw/com.familybloom.keep.xml: Error: '.' is not a valid file-based resource name character`

The H21R1 audio-protection update accidentally added `com.familybloom.keep.xml` in `res/raw/`, which is an invalid Android file-based resource name. H21R2 changed a verification test but did not fix the invalid resource in the APK build inputs.

## Fixes

1. Rename the Android resource shrinker keep file to `modules/family-bloom-overlay/android/src/main/res/raw/keep.xml`, preserving its `tools:keep` references to all 11 `R.raw.fb_board_*` MP3s.
2. Update `scripts/setup/stage-board-audio-native.js` to copy `keep.xml` into `android/app/src/main/res/raw/`, preserving checksums for all MP3s and deleting legacy `com.familybloom.keep.xml` from both module and generated app.
3. Update `scripts/setup/check-board-audio-apk.js` to check `keep.xml` and still reject missing compiled SoundPool resources. The guard still runs after Gradle and before any APK is shared.
4. Add `scripts/setup/check-android-resource-names.js` to reject invalid filenames in native module and generated app before running Gradle.
5. Remove stale invalid raw resource during PRE_COPY_CLEAN, CLEAN_APPLY and release preflight, so FULL copy-over onto H21R1/H21R2 does not retain the obsolete XML.
6. Align P2.12.5 and H21R1 audio gate expectations with valid Android resource names; add `scripts/tests/history/test-phase-p2_37r2c_h21r3-android-aapt-audio.cjs`, which reproduces the invalid filename failure and verifies audio staging in an isolated simulated generated Android project.

## Tests in code environment

- H21R3 resource regression: 9/9 PASS
- P2.12.5 APK/share build contract: 31/31 PASS
- P2.12.4 asset/build contract: 27/27 PASS
- H21 authoritative invite/away: 32/32 PASS
- H20 Mini/premove: 16/16 PASS
- H14 side authority: 20/20 PASS
- Real Windows Gradle/Android SDK build: **NOT RUN** (tools not available in this environment).

## Update procedure

1. Back up the existing H21R2 project folder.
2. Run `Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` from the extracted H21R3 FULL package, selecting your current project folder.
3. Copy all H21R3 source over the existing folder.
4. Run `Family_Bloom_CLEAN_APPLY_FULL.bat` from the root.
5. Run `Family_Bloom_BUILD_APK_TO_SHARE.bat` to create a new Android APK.
6. If the APK passes build and validation, install it and check Chess sound/moves/reconnect normally.

This is a client Native-resource/build-only change. **No Render redeploy is necessary.** Native assets require a new APK; OTA alone cannot repair this.

### Targeted source validation

Run before the expensive build:

`node scripts/setup/check-android-resource-names.js --source-only`

Run after Expo prebuild and audio staging:

`node scripts/setup/check-android-resource-names.js`

Expected: `PASS Android AAPT2 resource filename gate...`
