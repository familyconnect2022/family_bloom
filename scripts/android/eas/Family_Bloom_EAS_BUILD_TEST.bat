@echo off
setlocal EnableExtensions
title Family Bloom - EAS Test Build P2.37R2C-H21

for %%I in ("%~dp0..\..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"

echo ============================================================
echo  FAMILY BLOOM P2.37R2C-H21 - EAS ANDROID TEST BUILD
echo  Profile : family-bloom-test
echo  EXPECTED: app 1.3.22 / versionCode 143032
echo  Native   : P2.37R2C-H22-native-1
echo  This helper ALWAYS waits for the new build and clears EAS cache.
echo ============================================================
echo.

if not exist "eas.json" (
  echo [ERROR] Khong tim thay eas.json.
  echo BAT da duoc gom tai scripts\android\eas; PROJECT_ROOT duoc tu dong nhan dien.
  pause
  exit /b 1
)

findstr /I /C:"family-bloom-test" "eas.json" >nul 2>&1
if errorlevel 1 (
  echo [ERROR] eas.json chua co profile family-bloom-test.
  pause
  exit /b 1
)

findstr /I /C:"appVersionSource" "eas.json" >nul 2>&1
if errorlevel 1 (
  echo [ERROR] eas.json chua khoa appVersionSource=local.
  pause
  exit /b 1
)

findstr /I /C:"developmentClient" "eas.json" >nul 2>&1
if errorlevel 1 (
  echo [ERROR] family-bloom-test phai co developmentClient=true de dung voi Metro dev-client workflow.
  pause
  exit /b 1
)

where eas >nul 2>&1
if errorlevel 1 (
  set "EAS_CMD=npx eas-cli@latest"
) else (
  set "EAS_CMD=eas"
)

node scripts\test-h22r3-windows-build-preflight.cjs
if errorlevel 1 goto :fail
node scripts\setup\check-source-import-integrity.js
if errorlevel 1 goto :fail

set "NEED_NATIVE_INSTALL=0"
node scripts\setup\check-p2_37r2-local-install.js >nul 2>nul
if errorlevel 1 set "NEED_NATIVE_INSTALL=1"
if "%NEED_NATIVE_INSTALL%"=="1" (
  echo [P2.37R2C-H21] Installing/updating local native module dependency...
  call npm install --no-audit --no-fund
  if errorlevel 1 goto :fail
)

node scripts\setup\check-ts-syntax-transpile.js
if errorlevel 1 goto :fail
call "%PROJECT_ROOT%\scripts\android\maintenance\Family_Bloom_VERIFY_SERVER_TYPES.bat"
if errorlevel 1 goto :fail
node scripts\test-h22r2-cleanup-retention.cjs
if errorlevel 1 goto :fail
node scripts\test-h22-xiangqi-parity.cjs
if errorlevel 1 goto :fail
node scripts\test-h22r1-bot-invite-countdown.cjs
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2-full-copy-integrity.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c-binary-identity-lock.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c_h6-decor-rail-isolation.js
if errorlevel 1 exit /b 1
node scripts\test-phase-p2_37r2c_h7-tab-navigator-flex-layout.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c_h8-native-chess-tap-move.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c_h9a-mini-lifecycle-performance.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c_h9b-bloom-super-hero-ui.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c_h10-chess-native-latency.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c_h13-bloom-results-return.js
if errorlevel 1 goto :fail
node scripts\setup\check-board-audio-apk.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c_h21r1-audio-packaging.cjs
if errorlevel 1 goto :fail
node scripts\setup\check-p2_37r2c-native-package.js --require-node-module --require-resolve --require-effective-config
if errorlevel 1 goto :fail

echo.
echo ------------------------------------------------------------
echo PRE-BUILD IDENTITY VERIFIED
echo   app version : 1.3.22
echo   versionCode : 143032
echo   native ID   : P2.37R2C-H22-native-1
echo ------------------------------------------------------------
echo.
echo EAS will now build a NEW APK and wait until the build finishes.
echo Do NOT install an older artifact from the dashboard.
echo.

call %EAS_CMD% build -p android --profile family-bloom-test --clear-cache
set "ERR=%ERRORLEVEL%"

if not "%ERR%"=="0" goto :buildfail

echo.
echo ============================================================
echo [OK] EAS reports the P2.37R2C-H21 build completed successfully.
echo Install ONLY the APK produced by THIS build.
echo After install, Game Foundation MUST show:
echo   ACTUAL versionCode: 143032
echo   FamilyBloomOverlay: YES
echo   native identity: P2.37R2C-H22-native-1
echo ============================================================
echo.
pause
exit /b 0

:buildfail
echo.
echo [ERROR] EAS Build failed. Exit code: %ERR%
echo The R2C binary was NOT accepted.
echo.
pause
exit /b %ERR%

:fail
echo.
echo [ERROR] P2.37R2C-H21 pre-build gate failed. Build cancelled.
echo Fix the first error above before trying EAS again.
echo.
pause
exit /b 1
