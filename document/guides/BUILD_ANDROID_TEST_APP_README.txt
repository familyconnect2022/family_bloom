FAMILY BLOOM — ANDROID RELEASE TEST BUILD
Date: 2026-10-01

ROOT CLEANUP STANDARD
- Build helpers are no longer stored in the project root.
- Android BAT files: scripts\android\
- Firebase BAT files: scripts\firebase\
- Maintenance BAT files: scripts\maintenance\
- Device checklists: reports\device\
- Validation reports: reports\validation\
- Historical patch notes: document\history\patches\

NORMAL RELEASE TEST BUILD
Double-click:
  scripts\android\Family_Bloom_Android_Test_App_RELEASE.bat

The script resolves the Family Bloom root automatically, so it is safe to run from its folder.
It runs static gates, Expo prebuild, Gradle assembleRelease, exports the APK, installs it on the connected phone, and launches the app.
If the inherited package-lock is older than package.json, the BAT automatically runs npm install once to repair/synchronize it instead of failing at npm ci.

APK OUTPUT
  dist\android\Family_Bloom_Release_Test_LATEST.apk

You can copy that APK to another Android phone and install it without Metro or source code.

BUILD APK WITHOUT A USB PHONE
  scripts\android\Family_Bloom_Android_Build_APK_ONLY.bat

This performs the same RELEASE build but skips ADB/device installation.

CLEAN NATIVE RELEASE BUILD
Use after native/plugin/app.json changes:
  scripts\android\Family_Bloom_Android_Test_App_CLEAN_RELEASE.bat

INSTALL LAST APK WITHOUT REBUILDING
  scripts\android\Family_Bloom_Android_Install_Last_APK.bat

MANUALLY SYNCHRONIZE NPM LOCK/DEPENDENCIES
  scripts\setup\Family_Bloom_Sync_Dependencies.bat

Normally you do not need this because the RELEASE BAT repairs a stale lock automatically. Use it if you want npm ci to work before building.

FIREBASE HELPERS
  scripts\firebase\Family_Bloom_Deploy_Firestore_Rules.bat
  scripts\firebase\Family_Bloom_Deploy_Firestore_Indexes.bat
  scripts\firebase\Family_Bloom_Deploy_Functions.bat

IMPORTANT
- RELEASE test APK bundles JavaScript/assets and does not require Metro after installation.
- Package: com.familybloom.android
- If Android reports a signature mismatch, do not uninstall an existing app that contains local-only data until the signing situation has been reviewed.
