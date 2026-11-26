@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
for %%I in ("%~dp0..\..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"
rem Fail before expensive tests if Android Firebase configuration is absent/incorrect.
call "%PROJECT_ROOT%\scripts\android\build\Family_Bloom_ENSURE_FIREBASE_ANDROID_CONFIG.bat" "%PROJECT_ROOT%"
if errorlevel 1 (
  goto :fail
)
node "%PROJECT_ROOT%\scripts\android\build\resolve-build-target.cjs" firebase "%PROJECT_ROOT%"
if errorlevel 1 goto :fail
rem U1R3R2: a Release APK must never fall back to the template Debug certificate.
node "%PROJECT_ROOT%\scripts\android\build\fb-release-signing.cjs" check
if errorlevel 1 goto :fail
rem H21R3: copy-over installs may retain the invalid H21R1/H21R2 raw XML file.
rem Delete ONLY that obsolete filename before any tests or Expo/Gradle work.
if exist "modules\family-bloom-overlay\android\src\main\res\raw\com.familybloom.keep.xml" del /f /q "modules\family-bloom-overlay\android\src\main\res\raw\com.familybloom.keep.xml" >nul 2>nul
if exist "android\app\src\main\res\raw\com.familybloom.keep.xml" del /f /q "android\app\src\main\res\raw\com.familybloom.keep.xml" >nul 2>nul
set "NO_PAUSE=0"
set "APK_ONLY=0"
for %%A in (%*) do (
  if /I "%%~A"=="--no-pause" set "NO_PAUSE=1"
  if /I "%%~A"=="--apk-only" set "APK_ONLY=1"
)
echo ============================================================
echo FAMILY BLOOM H22R5 - ANDROID LOCAL RELEASE APK
echo com.familybloom.android - versionCode 143082
 echo No phone or Metro is required for release APK compilation.
echo ============================================================
where node >nul 2>&1
if errorlevel 1 goto :fail
where npm >nul 2>&1
if errorlevel 1 goto :fail
node scripts\tests\release\test-m3r4r5r1-avatar-build-deps.cjs
if errorlevel 1 goto :fail
call npm run phase15a4:check
if errorlevel 1 goto :fail
node scripts\tests\release\test-a3-render-backend-urls.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h22r3-windows-build-preflight.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-u1r3r2-release-signing.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h23r3-typescript-bootstrap.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h25-firebase-invitation.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h25-source-package.cjs
if errorlevel 1 goto :fail
call "%PROJECT_ROOT%\scripts\android\maintenance\Family_Bloom_ENSURE_GATE_DEPENDENCIES.bat"
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
node scripts\tests\release\test-r3r12-family-intro-letter-radical.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h25r2r6r2-chess-ready-vm.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h25-runtime-claims.cjs
if errorlevel 1 goto :fail
rem H25R2R1: prevent regressions in legacy Chess AppState controller VM mocks and READY gate.
node scripts\tests\release\test-h25r2r1-build-share-regression.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h25r2r4-touch-feedback.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h25r2r5-internet-connectivity.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h25r2-xiangqi-black-turn-reconnect.cjs
if errorlevel 1 goto :fail
rem H21R6: Direct release APK compile also checks bundled server sources.
echo [INFO] Render server independently verified/deployed from its own repository.
node scripts\tests\release\test-h22r2-cleanup-retention.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h22-xiangqi-parity.cjs
if errorlevel 1 goto :fail
node scripts\tests\release\test-h22r1-bot-invite-countdown.cjs
if errorlevel 1 goto :fail
if not exist "google-services.json" (
  echo [FAIL] google-services.json is missing.
  goto :fail
)
if not exist "node_modules\expo\package.json" (
  if exist "package-lock.json" (
    call npm ci
    if errorlevel 1 (
      echo [WARN] npm ci could not use the existing lock; repairing dependencies with npm install...
      call npm install
    )
  ) else (
    call npm install
  )
  if errorlevel 1 goto :fail
)
if not exist "node_modules\expo-audio\package.json" goto :need_install
if not exist "node_modules\expo-asset\package.json" goto :need_install
if not exist "package-lock.json" goto :need_install
node scripts\setup\check-package-lock.js >nul 2>nul
if errorlevel 1 goto :need_install
node scripts\setup\check-p2_37r2-local-install.js >nul 2>nul
if errorlevel 1 goto :need_install
goto :deps_ready
:need_install
echo [1] Repairing stale/missing npm lock, Expo dependencies, and local native module...
call npm install
if errorlevel 1 goto :fail
:deps_ready
rem R3 TypeScript regression gate: fail before Expo prebuild and Gradle.
echo [TS-GATE] Checking the entire Android TypeScript project...
call npm run typecheck
if errorlevel 1 (
  echo [FAIL] TypeScript errors found. No APK will be released.
  goto :fail
)
node scripts\setup\check-expo-dependencies.js
if errorlevel 1 goto :fail
node scripts\setup\check-package-lock.js
if errorlevel 1 goto :fail
call npm run phaseP2_12_6:check
if errorlevel 1 goto :fail
call npm run phaseP2_12_7:check
if errorlevel 1 goto :fail
call npm run phaseP2_12_4:check
if errorlevel 1 goto :fail
node scripts\setup\check-effective-expo-config.js
if errorlevel 1 goto :fail
node scripts\setup\check-board-audio-integrity.js
if errorlevel 1 goto :fail
node scripts\tests\history\test-phase-p2_37r2c_h15-chess-authority-dev-release.js
if errorlevel 1 goto :fail
node scripts\tests\history\test-phase-p2_37r2c_h16-chess-smooth-motion.js
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
node scripts\tests\history\test-phase-p2_37r2c_h21r1-audio-packaging.cjs
if errorlevel 1 goto :fail
node scripts\tests\history\test-phase-p2_37r2c_h21r3-android-aapt-audio.cjs
if errorlevel 1 goto :fail
call npm run phaseP2_15_5_1:check
if errorlevel 1 goto :fail
call npm run phaseP2_12_8:check
if errorlevel 1 goto :fail
call npm run doctor:native-check
if errorlevel 1 goto :fail

echo [1b] Validating Android resource filenames before expensive build...
node scripts\setup\check-android-resource-names.js --source-only
if errorlevel 1 goto :fail

echo [2] Expo clean prebuild of Android project...
call npx expo prebuild --platform android --clean --no-install
if errorlevel 1 goto :fail
rem Android is regenerated by prebuild --clean; inject credentials by env only.
node scripts\android\build\fb-release-signing.cjs apply
if errorlevel 1 goto :fail
if not exist "android\gradlew.bat" (
  echo [FAIL] Android Gradle wrapper was not generated.
  goto :fail
)
node scripts\setup\check-p2_37r2c-native-package.js --require-node-module --require-resolve --require-generated-project --require-gradle-project
if errorlevel 1 goto :fail
echo [2b] Staging protected Chess SoundPool audio inside generated Android app...
node scripts\setup\stage-board-audio-native.js
if errorlevel 1 goto :fail
node scripts\setup\check-android-resource-names.js
if errorlevel 1 goto :fail

echo [3] Compile offline-installable Release APK...
rem A previous successful APK must NEVER satisfy this build's output check.
set "APK_SOURCE=%PROJECT_ROOT%\android\app\build\outputs\apk\release\app-release.apk"
if exist "%APK_SOURCE%" del /f /q "%APK_SOURCE%" >nul 2>nul
if exist "%APK_SOURCE%" (
  echo [FAIL] Cannot remove old compiled APK. Close any process holding it.
  goto :fail
)
if exist "%PROJECT_ROOT%\build-output\Family_Bloom_Release_LATEST.apk" del /f /q "%PROJECT_ROOT%\build-output\Family_Bloom_Release_LATEST.apk" >nul 2>nul
if exist "%PROJECT_ROOT%\build-output\Family_Bloom_Release_LATEST.apk" (
  echo [FAIL] Old published build-output APK could not be removed.
  goto :fail
)
pushd android
call gradlew.bat :app:assembleRelease --no-daemon --console=plain
set "GRADLE_RC=!errorlevel!"
popd
if not "!GRADLE_RC!"=="0" goto :fail
set "APK_SOURCE=%PROJECT_ROOT%\android\app\build\outputs\apk\release\app-release.apk"
if not exist "%APK_SOURCE%" (
  echo [FAIL] Expected release APK missing: %APK_SOURCE%
  goto :fail
)
set "BOARD_MP3_COUNT=11"
echo [4] Verifying compiled Android SoundPool resources (AAPT2 table + APK entries)...
node scripts\setup\check-board-audio-apk.js "%APK_SOURCE%"
if errorlevel 1 goto :fail
node scripts\setup\check-p2_37r2c-apk-native-proof.js "%APK_SOURCE%"
if errorlevel 1 goto :fail
if not exist "build-output" mkdir "build-output"
copy /Y "%APK_SOURCE%" "%PROJECT_ROOT%\build-output\Family_Bloom_Release_LATEST.apk" >nul
if errorlevel 1 goto :fail
echo [PASS] Release APK is ready: build-output\Family_Bloom_Release_LATEST.apk
if "%NO_PAUSE%"=="0" pause
exit /b 0
:fail
echo.
echo [FAIL] Release APK build stopped. Read the FIRST error above; no stale APK was accepted.
if "%NO_PAUSE%"=="0" pause
exit /b 1
