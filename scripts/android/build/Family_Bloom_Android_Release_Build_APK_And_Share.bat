@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
for %%I in ("%~dp0..\..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"
rem H25R2R7R2R3R2: stop early when a clean extracted ZIP is built directly.
call "%PROJECT_ROOT%\scripts\android\build\Family_Bloom_ENSURE_FIREBASE_ANDROID_CONFIG.bat" "%PROJECT_ROOT%"
if errorlevel 1 (
  echo [STOP] Chua co cau hinh Firebase Android hop le.
  exit /b 1
)
node "%PROJECT_ROOT%\scripts\android\build\resolve-build-target.cjs" firebase "%PROJECT_ROOT%"
if errorlevel 1 (
  echo [STOP] Build from the UPDATED Family Bloom project instead of the clean FULL ZIP.
  echo        Use scripts\android\build\Family_Bloom_BUILD_APK_TO_SHARE.bat for project selection.
  pause
  exit /b 1
)
set "SHARE_DIR=%FAMILY_BLOOM_SHARE_DIR%"
if not defined SHARE_DIR set "SHARE_DIR=C:\FamilyBloomShare\apk"
if not "%~1"=="" set "SHARE_DIR=%~1"
echo ============================================================
echo Family Bloom H25 Firebase Invitations - Build and Share (APK guarded)
echo Phone  : NOT required
echo Metro  : NOT required
echo Output : %SHARE_DIR%
echo ============================================================
rem P0: prevent Hook order crashes on login from lazy theme style factories.
node scripts\tests\release\test-r3r3d7r2r3r3r1-hook-safety.cjs
if errorlevel 1 goto :fail
rem Appearance 3.0: compiler-visible base primitives must pass before Release.
node scripts\tests\release\test-appearance3-core-integration.cjs
if errorlevel 1 goto :fail
rem Appearance 3.0: font picker and semantic card icon regression.
node scripts\tests\release\test-appearance3-font-picker-card-icons.cjs
if errorlevel 1 goto :fail
rem Appearance 3.0: hero reading veil colors, RGBA alpha and reactive text contract.
node scripts\tests\release\test-appearance3-hero-reading-veil.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-m3r4r5r1-avatar-build-deps.cjs
if errorlevel 1 goto :fail
node scripts\setup\check-expo-route-uniqueness.cjs
if errorlevel 1 goto :fail
rem Mandatory current Android journey gate. Does not need node_modules.
node scripts\tests\release\test-r2r4-preflight.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-m3r4r6-root-avatar-lifecycle.cjs
if errorlevel 1 goto :fail
rem Family CV R7: camera, gallery, presets, UID-gated onboarding and stable white cards.
node scripts\tests\release\test-family-cv-r7-contract.cjs
if errorlevel 1 goto :fail
rem P0: bootstrap fallback, UID/profile/membership isolation and Welcome-to-Home first-frame gate.
node scripts\tests\release\test-m3r4r8-bootstrap-navigation-p0.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-r8r2-profile-welcome-save-flow.cjs
if errorlevel 1 goto :fail
rem P0: auth/connectivity and welcome are stable under retry.
node scripts\tests\release\test-r8r4r4r3r4r3-auth-connectivity-p0.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-r8r4r4r3r4r3r2-cold-start-proof.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-r8r4r4r3r4r3r3-membership-metadata.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-r3r3d1-auth-diagnostics.cjs
if errorlevel 1 goto :fail
rem R3R3D2: Welcome hien tren native Session Gate, khong xuyen Home gate.
node scripts\tests\release\test-r3r3d2-welcome-native-gate.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-r3r3d3-native-visual-probe.cjs
if errorlevel 1 goto :fail
rem D4: Phong bi anh tinh va thu doc phai nam tren mat phang native an toan.
node scripts\tests\release\test-r3r3d4-welcome-android-render.cjs
if errorlevel 1 goto :fail
rem D5: Thu Ngo la khung noi giua Session Gate; nut vao nha luon nhin thay.
node scripts\tests\release\test-r3r3d5-welcome-centered-modal.cjs
if errorlevel 1 goto :fail
rem D6: background continous across the opening animation, compact centered reader.
node scripts\tests\release\test-r3r3d6-welcome-no-white-centered.cjs
if errorlevel 1 goto :fail
rem D7: 1 anh giay, vung chu theo toa do artwork, khong crop/chuyen canh.
node scripts\tests\release\test-r3r3d7-welcome-single-paper.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-r3r3d7r1-cover-safe-font.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h25r2r7r2r3r5-script-layout.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-r9-android-only-build-contract.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h22r3-windows-build-preflight.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h23r3-typescript-bootstrap.cjs
if errorlevel 1 goto :fail
rem H25R2R7R2R3R4 - kiem thu phuc hoi Firebase an toan, offline.
node scripts\tests\release\test-h25r2r7r2r3r4-firebase-recovery.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h25-firebase-invitation.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h25-source-package.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h25r2r2-release-preflight.cjs
if errorlevel 1 goto :fail
rem H21R6: No APK release while included Chess server source cannot compile.
node scripts\tests\release\test-h22r2-cleanup-retention.cjs
if errorlevel 1 goto :fail
call "%PROJECT_ROOT%\scripts\android\maintenance\Family_Bloom_ENSURE_GATE_DEPENDENCIES.bat"
if errorlevel 1 goto :fail
rem R3 TypeScript regression gate: fail before creating/overwriting any Release APK.
echo [TS-GATE] Checking the entire Android TypeScript project...
call npm run typecheck
if errorlevel 1 (
  echo [FAIL] TypeScript errors found. No APK will be released.
  goto :fail
)
node scripts\tests\release\test-h25-learning-bridge.cjs
if errorlevel 1 goto :fail
rem Current behavior gates run with installed local TypeScript; no cloud access.
node scripts\tests\release\test-r2r4-journey.cjs
if errorlevel 1 goto :fail
rem H25R2R6R3R1: the two-stage READY Chess VM needs TypeScript.
rem It MUST run after ENSURE_GATE_DEPENDENCIES, not during no-deps Auto Update preflight.
node scripts\tests\release\test-h25r2r7r2r3r3-compound-formulas.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-super-bloom-native-math-lessons.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-super-bloom-math-reactions-r3r7.cjs
if errorlevel 1 goto :fail
rem R3R8: deterministic chemistry validation; never auto-fix ambiguous formula.
node scripts\tests\release\test-super-bloom-chemistry-safe-r3r8.cjs
if errorlevel 1 goto :fail
rem R3R9: nhap O2 ngay sau phan so, xem truoc an toan.
node scripts\tests\release\test-super-bloom-inline-chemical-follow-r3r9.cjs
if errorlevel 1 goto :fail
rem R3R10 structured explanatory blocks and mathematical implication/equivalence.
node scripts\tests\release\test-super-bloom-solution-blocks-r3r10.cjs
if errorlevel 1 goto :fail
rem R3R11: mathematical limit/matrix/radical/vector regression.
node scripts\tests\release\test-super-bloom-math-typesetting-r3r11.cjs
if errorlevel 1 goto :fail
rem R3R13: optional Cloud Features must be secure and off by default.
node scripts\tests\release\test-r3r13-blaze-ready.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-r3r14r3r2-dev-platform-menu.cjs
if errorlevel 1 goto :fail
rem R3R14: approved envelope animation assets, scroll safety and TypeScript syntax.
node scripts\tests\release\test-r3r14-welcome-envelope-motion.cjs
if errorlevel 1 goto :fail
rem R3R14R1: topmost touch plane and real runtime opening flow, after dependencies.
node scripts\tests\release\test-r3r14r1-welcome-touch-static.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-r3r14r1-welcome-touch-runtime.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-r3r12-family-intro-letter-radical.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h25r2r6r2-chess-ready-vm.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h25-runtime-claims.cjs
if errorlevel 1 goto :fail
rem H25R2R1: prevent regressions in legacy Chess AppState controller VM mocks and READY gate.
node scripts\tests\release\test-h25r2r1-build-share-regression.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h25r2r3-windows-npm-preflight.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h25r2r4-touch-feedback.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h25r2r5-internet-connectivity.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h25r2-xiangqi-black-turn-reconnect.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h22-xiangqi-parity.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h22r6-xiangqi-bloom-motion.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h22r7-royal-bloom-modals.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h22r8-xiangqi-ux-draw.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h22r9-chess-assets-royal-highlight.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h23-family-game-hubs.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h23r2-dual-app-presence.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h22r1-bot-invite-countdown.cjs
if errorlevel 1 goto :fail
echo [INFO] Render server independently verified/deployed from its own repository.
node scripts\setup\check-render-chess-protocol.cjs
rem Informational only: offline APK builds are permitted; server deploy is separate.
node scripts\tests\history\test-phase-p2_12_5-remote-apk-share-build.js
if errorlevel 1 goto :fail
node scripts\tests\history\test-phase-p2_12_7-expo-asset-peer-contract.js
if errorlevel 1 goto :fail
node scripts\tests\history\test-phase-p2_37r2c_h17-chess-optimistic-authority.js
if errorlevel 1 goto :fail
node scripts\tests\history\test-phase-p2_37r2c_h18-chess-network-resync.js
if errorlevel 1 goto :fail
node scripts\tests\history\test-phase-p2_37r2c_h19-recovery-offline.js
if errorlevel 1 goto :fail
node scripts\tests\history\test-phase-p2_37r2c_h20-mini-premove-isolation.js
if errorlevel 1 goto :fail
node scripts\tests\history\test-phase-p2_37r2c_h21-invite-away-authority.cjs
if errorlevel 1 goto :fail
node scripts\tests\history\test-phase-p2_37r2c_h21r5-durable-recovery.cjs
if errorlevel 1 goto :fail
node scripts\tests\history\test-phase-p2_37r2c_h21r4-ready-build-share.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-a3-render-backend-urls.cjs
if errorlevel 1 goto :fail
call "%~dp0Family_Bloom_Android_Test_App_RELEASE.bat" --apk-only --no-pause
if errorlevel 1 goto :fail
set "APK_SOURCE=%PROJECT_ROOT%\build-output\Family_Bloom_Release_LATEST.apk"
if not exist "%APK_SOURCE%" goto :fail
if not exist "%SHARE_DIR%" mkdir "%SHARE_DIR%"
if errorlevel 1 goto :fail
for /f %%T in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "BUILD_STAMP=%%T"
if not defined BUILD_STAMP goto :fail
rem Publish only after native/binary/AAPT proof and byte-for-byte transfer verification.
rem Never overwrite LATEST with an unverified/incomplete copy.
set "PENDING_APK=%SHARE_DIR%\Family_Bloom_LATEST.apk.pending"
if exist "!PENDING_APK!" del /f /q "!PENDING_APK!" >nul 2>nul
copy /Y "%APK_SOURCE%" "!PENDING_APK!" >nul
if errorlevel 1 goto :fail
node scripts\setup\verify-apk-copy-sha256.cjs "%APK_SOURCE%" "!PENDING_APK!"
if errorlevel 1 goto :fail
copy /Y "%APK_SOURCE%" "%SHARE_DIR%\Family_Bloom_Release_!BUILD_STAMP!.apk" >nul
if errorlevel 1 goto :fail
node scripts\setup\verify-apk-copy-sha256.cjs "%APK_SOURCE%" "%SHARE_DIR%\Family_Bloom_Release_!BUILD_STAMP!.apk"
if errorlevel 1 goto :fail
move /Y "!PENDING_APK!" "%SHARE_DIR%\Family_Bloom_LATEST.apk" >nul
if errorlevel 1 goto :fail
node scripts\setup\verify-apk-copy-sha256.cjs "%APK_SOURCE%" "%SHARE_DIR%\Family_Bloom_LATEST.apk"
if errorlevel 1 goto :fail
set "SHARE_SHA_PATH=%SHARE_DIR%\Family_Bloom_LATEST.sha256"
powershell -NoProfile -Command "$ErrorActionPreference='Stop'; (Get-FileHash -LiteralPath (Join-Path $env:SHARE_DIR 'Family_Bloom_LATEST.apk') -Algorithm SHA256).Hash | Set-Content -Encoding ascii -LiteralPath $env:SHARE_SHA_PATH"
if errorlevel 1 goto :fail
>"%SHARE_DIR%\Family_Bloom_LATEST.txt" echo Family Bloom H25 Firebase Invitations Chess Xiangqi v1.3.81 versionCode 143091 Native P2.37R2C-H25-native-3
>>"%SHARE_DIR%\Family_Bloom_LATEST.txt" echo Built: !BUILD_STAMP!
>>"%SHARE_DIR%\Family_Bloom_LATEST.txt" echo Package: com.familybloom.android
>>"%SHARE_DIR%\Family_Bloom_LATEST.txt" echo Client source: H25 Firebase invitations for Chess and Xiangqi. Render deployment stays separate.
>>"%SHARE_DIR%\Family_Bloom_LATEST.txt" echo SHA256 stored in Family_Bloom_LATEST.sha256
echo [PASS] APK, timestamped backup, SHA256 and metadata verified in %SHARE_DIR%
pause
exit /b 0
:fail
if defined PENDING_APK if exist "!PENDING_APK!" del /f /q "!PENDING_APK!" >nul 2>nul
echo [FAIL] APK build/share stopped. Old LATEST, if present, is NOT from this attempt.
echo [FAIL] Do NOT distribute the previous LATEST as the new build.
pause
exit /b 1
