@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
for %%I in ("%~dp0..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"
title Family Bloom - Standalone APK Build + Share

if not defined FAMILY_BLOOM_SHARE_DIR set "FAMILY_BLOOM_SHARE_DIR=C:\FamilyBloomShare\apk"
set "SHARE_DIR=%FAMILY_BLOOM_SHARE_DIR%"
set "LOCAL_LATEST=%PROJECT_ROOT%\dist\android\Family_Bloom_Release_LATEST.apk"

echo.
echo ============================================================
echo   FAMILY BLOOM - STANDALONE APK BUILD + SHARE
echo   Phase  : P2.29 (P2.28 independent-game baseline)
echo   Phone  : NOT required during build
echo   Metro  : NOT required after install
echo   Share  : %SHARE_DIR%
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH.
  goto :fail
)

if not exist "%SHARE_DIR%" (
  echo [share] Creating %SHARE_DIR% ...
  mkdir "%SHARE_DIR%" 2>nul
  if errorlevel 1 (
    echo [ERROR] Cannot create share output folder: %SHARE_DIR%
    echo         Override it before running if needed:
    echo         set FAMILY_BLOOM_SHARE_DIR=D:\Your\Shared\Folder
    goto :fail
  )
)

echo [1/4] Checking P2.28 baseline + P2.29 share-build contract...
node scripts\test-phase-p2_12_5-remote-apk-share-build.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_12_6-build-dependency-contract.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_12_7-expo-asset-peer-contract.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_12_8-windows-expo-doctor-node-cli-launch.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_28-independent-focus-board-game-lifecycle.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_29-stable-waiting-independent-games.js
if errorlevel 1 goto :fail

echo [2/4] Building standalone Release APK - no Android device/ADB required...
call "%~dp0Family_Bloom_Android_Test_App_RELEASE.bat" --apk-only --no-pause
if errorlevel 1 goto :fail

if not exist "%LOCAL_LATEST%" (
  echo [ERROR] Release build finished but latest APK was not found:
  echo         %LOCAL_LATEST%
  goto :fail
)

echo [3/4] Copying APK to remote-share folder...
set "BUILD_STAMP=latest"
for /f "delims=" %%T in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss" 2^>nul') do set "BUILD_STAMP=%%T"
set "SHARE_LATEST=%SHARE_DIR%\Family_Bloom_LATEST.apk"
set "SHARE_VERSIONED=%SHARE_DIR%\Family_Bloom_Release_!BUILD_STAMP!.apk"
copy /Y "%LOCAL_LATEST%" "!SHARE_LATEST!" >nul
if errorlevel 1 goto :fail
copy /Y "%LOCAL_LATEST%" "!SHARE_VERSIONED!" >nul
if errorlevel 1 goto :fail

set "SHA256="
for /f "delims=" %%H in ('powershell -NoProfile -Command "(Get-FileHash -Algorithm SHA256 -LiteralPath ''!SHARE_LATEST!'').Hash.ToLower()" 2^>nul') do if not defined SHA256 set "SHA256=%%H"
if defined SHA256 (
  >"%SHARE_DIR%\Family_Bloom_LATEST.sha256" echo !SHA256!  Family_Bloom_LATEST.apk
)
>"%SHARE_DIR%\Family_Bloom_LATEST.txt" echo Family Bloom standalone Release APK - P2.29 (P2.28 independent-game baseline)
>>"%SHARE_DIR%\Family_Bloom_LATEST.txt" echo Built: !BUILD_STAMP!
>>"%SHARE_DIR%\Family_Bloom_LATEST.txt" echo APK: !SHARE_LATEST!
if defined SHA256 >>"%SHARE_DIR%\Family_Bloom_LATEST.txt" echo SHA256: !SHA256!

echo [4/4] Done.
echo.
echo ============================================================
echo   APK BUILD + SHARE SUCCESS
echo   No phone/emulator was required during build.
echo   Metro is not required after installation.
echo.
echo   Local latest : %LOCAL_LATEST%
echo   Share latest : !SHARE_LATEST!
echo   History copy : !SHARE_VERSIONED!
if defined SHA256 echo   SHA-256      : !SHA256!
echo.
echo   If C:\FamilyBloomShare is shared as "FamilyBloom":
echo   \\YOUR-PC-NAME\FamilyBloom\apk\Family_Bloom_LATEST.apk
echo ============================================================
echo.
pause
exit /b 0

:fail
echo.
echo ============================================================
echo   APK BUILD + SHARE FAILED
if exist "%LOCAL_LATEST%" echo   Existing local APK remains: %LOCAL_LATEST%
echo ============================================================
echo.
pause
exit /b 1
