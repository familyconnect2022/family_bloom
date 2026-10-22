# Family Bloom H25R2R6R1 — Auto Update folder reselection

## Scope

This is a **FULL CODE release** based on H25R2R6 (Family Bloom Education Reader + Cloud Manager) with updater-only changes. Runtime app identity stays **1.3.30 / versionCode 143040**, as no APK/runtime source was changed. Existing Firebase, Firestore rules, Chess/Xiangqi server, education reader, Kotlin modules, signing config, and device data were not intentionally modified.

## Root cause of user screenshot

The old updater read `%LOCALAPPDATA%\FamilyBloom\updater\last-target.txt`, e.g. `D:\Project Family Bloom\Family_bloom_V2`, and used it without checking whether the source had moved. When `package.json` was absent, the updater failed before backup with `Existing Family Bloom project is missing: package.json`. This is a path/target-selection failure, not a Gradle failure.

## New workflow

1. Read explicit target argument (if provided) or saved target.
2. Run the Node `target` validation **without writing any files**. It checks required files, project identity `family-bloom`, versionCode safety, and source-target separation.
3. If invalid, show the reason and open a Windows directory chooser. If that is unavailable/cancelled, allow typing or pasting the current path manually. If another invalid path is entered, repeat. The user can cancel with `Q`.
4. Only for a valid project: check full release integrity and preflight before any cleanup; show the chosen path and ask for confirmation.
5. Back up old project source, run PRE_COPY_CLEAN_OLD, overlay full source, verify, run CLEAN APPLY, then **remember the new target path only after CLEAN APPLY succeeds**.

The chooser never modifies a project and does not alter saved target paths by itself. Existing updater preservation of `.env`, Firebase configuration, Android native files and signing assets remains unchanged.

## Files updated/added

- `scripts/android/maintenance/Family_Bloom_AUTO_UPDATE_FULL.bat` — validate/reselect target before mutations.
- `scripts/android/maintenance/Select-FamilyBloomProjectFolder.ps1` — GUI folder picker with terminal fallback.
- `scripts/maintenance/auto-update-full.cjs` — read-only `target` mode and source regression gate.
- `scripts/test-h25r2r6r1-target-reselection.cjs` — 15 independent checks for moved paths, mistaken folder, version safety, no premature writes.

## Validation performed

- `node scripts/test-h25r2r6r1-target-reselection.cjs` → 15/15 PASS.
- `FB_SOURCE=... FB_TARGET=... node scripts/maintenance/auto-update-full.cjs check` with a synthetic existing project → PASS (before mutations).
- Existing H25 preflight/source structure tests → PASS.
- ZIP contents and hashes verified after extraction separately.

**Not verified:** executing the BAT/PowerShell picker on Windows, performing a real project overlay, Gradle APK build, or Android device runtime. Please test on Windows with the real current Family Bloom root (the one containing `package.json`, `app.config.js`, and `app.json`). Do not select the newly extracted FULL folder as old target. **Do not build an APK if Auto Update fails.**

## Installation

1. Extract `FAMILY_BLOOM_H25R2R6R1_AUTO_UPDATE_TARGET_RESELECT_FULL_CODE_2026-10-22.zip` to a **new, separate directory**.
2. Run `Family_Bloom_AUTO_UPDATE_FULL.bat` from that new directory.
3. When the previous folder is missing, choose your current Family Bloom root using the folder picker. The actual path may differ from the previously saved path. Confirm the selected project.
4. After `[PASS]` on automatic FULL update and clean apply, build with `Family_Bloom_BUILD_APK_TO_SHARE.bat` inside the updated project.
5. Existing device APK can stay installed; this release is an updater repair rather than an APK feature change.
