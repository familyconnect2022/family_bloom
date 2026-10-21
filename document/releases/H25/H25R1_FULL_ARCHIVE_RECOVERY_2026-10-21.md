# Family Bloom H25R1 — FULL archive recovery (2026-10-21)

## Problem / root cause

The original H25 ZIP contained the root Windows BAT launchers but omitted **all** `scripts/android/` helper BATs and **all** `modules/family-bloom-overlay/android/` native source and media. Running `Family_Bloom_AUTO_UPDATE_FULL.bat` immediately printed `Missing Family Bloom automatic updater`. Extracting again cannot repair the original archive.

## Corrective actions

- Restored 66 missing source files from the H23R3 full-source baseline (H25's stated parent); includes 18 Android BAT helpers, 47 native Kotlin/Gradle/assets/audio files, and Android script documentation.
- Synchronized native Kotlin identity, Build & Share/EAS helper messages, APK install/device verifier to H25 version 1.3.29 / versionCode 143039 / native `P2.37R2C-H25-native-1`.
- Wired H25 Firebase invitation and mock-Admin regression tests into CLEAN APPLY, Build & Share, direct release and EAS build preflight.
- Added `scripts/test-h25-source-package.cjs` for cross-folder BAT/native source completeness; automatic updater now checks it before making any changes.
- Existing H25 Chess/Xiangqi game and Firestore/server invitation logic is carried byte-for-byte from the original H25 ZIP. No change to APK applicationId or Firebase project.

## Usage

Extract the entire H25R1 FULL archive to a *separate* folder, outside the existing Family Bloom project. Run `Family_Bloom_AUTO_UPDATE_FULL.bat` from this extracted directory, select the existing Family Bloom project and confirm. Build/Share only after update and CLEAN APPLY report PASS.

## Scope of verification

Static Node.js regression checks and archive file inspection may execute without Windows/Android. Actual Windows BAT update flow, Gradle release APK and device gameplay must still be verified on Windows and Android.
