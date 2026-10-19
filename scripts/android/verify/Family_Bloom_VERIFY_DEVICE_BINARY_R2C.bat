@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
for %%I in ("%~dp0..\..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"

echo ============================================================
echo FAMILY BLOOM P2.37R2C-H12 - VERIFY INSTALLED ANDROID BINARY
echo Expected package     : com.familybloom.android
echo Expected versionCode : 143036
echo Expected native ID   : P2.37R2C-H22R8-native-1
echo ============================================================
echo.

where adb >nul 2>&1
if errorlevel 1 (
  echo [ERROR] adb not found in PATH.
  echo Open Android Studio SDK Platform-Tools or add adb to PATH.
  pause
  exit /b 1
)

adb get-state >nul 2>&1
if errorlevel 1 (
  echo [ERROR] No Android device connected/authorized via ADB.
  pause
  exit /b 1
)

set "TMP=%TEMP%\family_bloom_r2c_dumpsys_%RANDOM%.txt"
adb shell dumpsys package com.familybloom.android > "%TMP%" 2>nul
findstr /R /C:"versionCode=143036\>" "%TMP%" >nul 2>&1
if errorlevel 1 (
  echo [FAIL] Installed package is NOT versionCode 143036.
  echo.
  echo Android reports:
  findstr /I /C:"versionCode=" /C:"versionName=" "%TMP%"
  del /q "%TMP%" >nul 2>&1
  echo.
  echo Do NOT start Metro yet. Install the R2C development-client APK first.
  pause
  exit /b 1
)

echo [PASS] Android package versionCode = 143036
findstr /I /C:"versionCode=" /C:"versionName=" "%TMP%"
del /q "%TMP%" >nul 2>&1
echo.
echo Native identity is verified inside the app after launch:
echo   FamilyBloomOverlay: YES
echo   native identity: P2.37R2C-H22R8-native-1
echo   Binary gate: PASS
echo.
pause
exit /b 0
