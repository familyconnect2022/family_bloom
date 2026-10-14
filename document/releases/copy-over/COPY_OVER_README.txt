FAMILY BLOOM
P2.15.5.1 BUILD SHARE DOCTOR PATCH DRIFT RECOVERY
================================================

CURRENT FIX
- Expo Doctor is no longer launched through expo-doctor.cmd, npx.cmd, cmd.exe, or shell:true.
- The launcher derives the Family Bloom project root from its own script location, not from the current Command Prompt directory.
- It reads node_modules/expo-doctor/package.json, resolves the pinned CLI bin, and invokes that JavaScript file with process.execPath (node.exe).
- The child process cwd is always the Family Bloom project root, so paths containing spaces are supported.
- P2.12.7 expo-asset peer dependency recovery, P2.12.6 semver dependency contract, P2.12.5 remote APK share, and P2.12.4 Chess audio recovery are preserved.

COPY-OVER
1. Run Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat from the existing project.
2. Copy the entire P2.15.5.1 FULL package over the project and replace files.
3. Run Family_Bloom_CLEAN_APPLY_FULL.bat.
4. Run the normal Debug/Release build BAT.

WINDOWS DOCTOR NOTE
Do not call node_modules\.bin\expo-doctor.cmd directly from Node. The supported launcher is:
  npm run doctor:native-check
It resolves the pinned Expo Doctor JavaScript CLI and runs it via node.exe from project root.

-------------------------------------
HISTORICAL NOTES BELOW
-------------------------------------


P2.12.5 REMOTE STANDALONE RELEASE APK SHARE BUILD
-----------------------------------
New one-click entrypoint at project root:
  Family_Bloom_BUILD_APK_AND_SHARE.bat

It does NOT require an Android phone or ADB. It calls the canonical Release APK builder in APK-only mode (clean Expo Android prebuild, Gradle assembleRelease, board-audio payload verification), then writes:
  dist\android\Family_Bloom_Release_LATEST.apk
  C:\FamilyBloomShare\apk\Family_Bloom_LATEST.apk
  C:\FamilyBloomShare\apk\Family_Bloom_Release_<timestamp>.apk
  C:\FamilyBloomShare\apk\Family_Bloom_LATEST.sha256
  C:\FamilyBloomShare\apk\Family_Bloom_LATEST.txt

Override the share target before launching if required:
  set FAMILY_BLOOM_SHARE_DIR=D:\MyShare\apk
  Family_Bloom_BUILD_APK_AND_SHARE.bat

The BAT creates the folder when absent, but intentionally does not change Windows SMB/Tailscale permissions. Share C:\FamilyBloomShare separately using Windows Advanced Sharing/Tailscale.

FAMILY BLOOM - PERFORMANCE ARCHITECTURE P2.12.4
BUILD INTEGRITY + CHESS AUDIO RECOVERY
2026-10-12

BASELINE
- Direct successor to P2.12.3 FULL CODE.
- Family Graph P2.12.3 native-Modal recovery + BSH retained graph is preserved.
- Android identity remains com.familybloom.android.

WHAT P2.12.4 FIXES
- app.config.js now explicitly carries the expo-audio config plugin into the effective CNG config while preserving inherited plugins.
- Playback-only audio config disables microphone/background audio services that Family Bloom does not need.
- Chess/board SFX no longer use a 1600ms fake-ready timeout.
- Native source attachment retries if replace/load does not succeed.
- A first sound requested while loading is queued instead of silently dropped.
- Chess visual readiness does not wait for audio; audio recovers independently.
- Debug/Release/Clean/Setup paths validate effective Expo config, audio assets and expo-audio package version.
- Release build verifies the native M4A payload after Gradle.
- expo-doctor is pinned at 1.20.4 and build scripts run only the local binary after dependency bootstrap.
- Legacy scripts/setup/settup.bat is retired.

PACKAGE-LOCK NOTE
- The supplied baseline did not include a root package-lock.json and this build environment cannot resolve npm registry metadata to generate a trustworthy one.
- P2.12.4 does NOT ship a fabricated lock.
- CLEAN APPLY / Debug / Release treat a missing lock as dependency-stale and run npm install first; npm then creates the real lock on your machine and check-package-lock.js must pass before build continues.
- Keep the generated root package-lock.json in source control after that first successful install.

SAFE COPY-OVER
1. Run Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat from this package against the EXISTING project.
2. Copy the entire P2.12.5 FULL package over the existing project and replace files.
3. Run Family_Bloom_CLEAN_APPLY_FULL.bat inside the updated project.
4. Because app config/native audio configuration changed, rebuild the Android native app. Do not rely only on `expo start -c`.
5. Recommended device test: scripts\android\Family_Bloom_Android_Debug_Build_And_Run.bat.

AUDIO VALIDATION
- npm run audio:integrity
- npm run phaseP2_12_4:check
- Release BAT also checks that at least 11 M4A board sounds are present in the generated/APK payload.
- All BAT entrypoints are normalized to Windows CRLF.
- Build entrypoint audit checks every shipped BAT, npm script reference, and Node script reference before native build.

SOURCE GOVERNANCE
- All .md/.txt documentation stays under document/<group>/.
- Keep root .gitignore.
- Keep both copy-over BAT entrypoints in the FULL package.

REPORT
- document/releases/performance/p2/PHASE_P2_12_4_BUILD_INTEGRITY_CHESS_AUDIO_RECOVERY_BUILD_REPORT.md
