@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
for %%I in ("%~dp0..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"
title Family Bloom - Android Release APK Build

set "APP_PACKAGE=com.familybloom.android"
set "OUTPUT_DIR=%PROJECT_ROOT%\dist\android"
set "APK_ONLY=0"
set "NO_PAUSE=0"
for %%A in (%*) do (
  if /I "%%~A"=="--apk-only" set "APK_ONLY=1"
  if /I "%%~A"=="--no-pause" set "NO_PAUSE=1"
)

echo.
echo ============================================================
echo   FAMILY BLOOM - ANDROID RELEASE APK BUILD
echo   Build   : RELEASE
echo   App     : Family Bloom
echo   Package : %APP_PACKAGE%
echo   Project : %PROJECT_ROOT%
echo   Output  : %OUTPUT_DIR%
echo   Metro is NOT required after installation.
echo ============================================================
echo.

call :require_file package.json || goto :fail
call :require_file app.json || goto :fail
call :require_file app.config.js || goto :fail
call :require_file google-services.json || goto :fail

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH.
  echo Install Node.js LTS, reopen this window, then run again.
  goto :fail
)
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found in PATH.
  goto :fail
)

if not defined JAVA_HOME (
  if exist "%ProgramFiles%\Android\Android Studio\jbr\bin\java.exe" (
    set "JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr"
  )
)
if defined JAVA_HOME set "PATH=%JAVA_HOME%\bin;%PATH%"
where java >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Java was not found.
  echo Install Android Studio, or set JAVA_HOME to its JBR/JDK.
  goto :fail
)

if not defined ANDROID_HOME (
  if exist "%LOCALAPPDATA%\Android\Sdk" set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
)
if not defined ANDROID_SDK_ROOT if defined ANDROID_HOME set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
if defined ANDROID_HOME set "PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\emulator;%PATH%"

set "ADB=adb"
if not "!APK_ONLY!"=="1" (
  where adb >nul 2>nul
  if errorlevel 1 (
    if defined ANDROID_HOME if exist "%ANDROID_HOME%\platform-tools\adb.exe" set "ADB=%ANDROID_HOME%\platform-tools\adb.exe"
  )
  "!ADB!" version >nul 2>nul
  if errorlevel 1 (
    echo [ERROR] adb was not found.
    echo Open Android Studio ^> SDK Manager and install Android SDK Platform-Tools.
    goto :fail
  )
)

echo [overlay] Cleaning legacy files from FULL-over-old updates...
node scripts\setup\cleanup-overlay-routes.js
if errorlevel 1 goto :fail

echo [1/9] Checking Android device...
if "!APK_ONLY!"=="1" (
  echo       APK-only mode: no USB device is required.
) else (
  "!ADB!" start-server >nul 2>nul
  set /a DEVICE_COUNT=0
  set "DEVICE_SERIAL="
  for /f "skip=1 tokens=1,2" %%A in ('"!ADB!" devices') do (
    if "%%B"=="device" (
      set /a DEVICE_COUNT+=1
      set "DEVICE_SERIAL=%%A"
    )
  )
  if !DEVICE_COUNT! EQU 0 (
    echo.
    "!ADB!" devices
    echo.
    echo [ERROR] No authorized Android device was found.
    echo - Connect the phone by USB.
    echo - Enable Developer options and USB debugging.
    echo - Accept the RSA authorization popup on the phone.
    goto :fail
  )
  if !DEVICE_COUNT! GTR 1 (
    echo More than one Android device/emulator is connected:
    "!ADB!" devices
    echo.
    set /p "DEVICE_SERIAL=Enter target phone serial: "
    if "!DEVICE_SERIAL!"=="" goto :fail
    "!ADB!" -s "!DEVICE_SERIAL!" get-state >nul 2>nul
    if errorlevel 1 (
      echo [ERROR] Invalid or unavailable device serial.
      goto :fail
    )
  )
  for /f "delims=" %%M in ('"!ADB!" -s "!DEVICE_SERIAL!" shell getprop ro.product.model 2^>nul') do set "DEVICE_MODEL=%%M"
  echo       Device: !DEVICE_MODEL!  [!DEVICE_SERIAL!]
)

echo [2/9] Checking npm dependencies...
set "DEPENDENCIES_READY=1"
if not exist "node_modules\expo\package.json" set "DEPENDENCIES_READY=0"
if not exist "node_modules\expo-notifications\package.json" set "DEPENDENCIES_READY=0"
if not exist "node_modules\expo-application\package.json" set "DEPENDENCIES_READY=0"
if not exist "node_modules\expo-audio\package.json" set "DEPENDENCIES_READY=0"
if not exist "node_modules\expo-asset\package.json" set "DEPENDENCIES_READY=0"
if not exist "node_modules\expo-doctor\package.json" set "DEPENDENCIES_READY=0"
if not exist "node_modules\@react-native-firebase\app\package.json" set "DEPENDENCIES_READY=0"
if "!DEPENDENCIES_READY!"=="1" (
  node scripts\setup\check-expo-dependencies.js >nul 2>nul
  if errorlevel 1 set "DEPENDENCIES_READY=0"
  node scripts\setup\check-package-lock.js >nul 2>nul
  if errorlevel 1 set "DEPENDENCIES_READY=0"
)
if "!DEPENDENCIES_READY!"=="0" (
  echo       node_modules is missing, incomplete, or has stale Expo package versions.
  echo       Repairing automatically with npm install. package-lock will be generated/refreshed locally.
  call npm install --no-audit --no-fund
  if errorlevel 1 goto :fail
) else (
  echo       Dependencies are ready and Expo SDK 57 patch versions match.
)
node scripts\setup\check-expo-dependencies.js
if errorlevel 1 goto :fail
node scripts\setup\check-package-lock.js
if errorlevel 1 goto :fail
node scripts\setup\check-effective-expo-config.js
if errorlevel 1 goto :fail
node scripts\setup\check-board-audio-integrity.js
if errorlevel 1 goto :fail
node scripts\setup\check-build-entrypoints.js
if errorlevel 1 goto :fail

echo [3/9] Running Expo Doctor and current Family Bloom static gates...
call npm run phaseP2_12_8:check
if errorlevel 1 goto :fail
call npm run phaseP2_15_2:check
if errorlevel 1 goto :fail
call npm run phaseP2_15_5_1:check
if errorlevel 1 goto :fail
call npm run phaseP2_18:check
if errorlevel 1 goto :fail
call npm run phaseP2_19:check
if errorlevel 1 goto :fail
call npm run phaseP2_20:check
if errorlevel 1 goto :fail
call npm run phaseP2_21:check
if errorlevel 1 goto :fail
call npm run phaseP2_22:check
if errorlevel 1 goto :fail
call npm run phaseP2_23:check
if errorlevel 1 goto :fail
call npm run phaseP2_17_1:check
if errorlevel 1 goto :fail
if errorlevel 1 goto :fail
call npm run doctor:native-check
if errorlevel 1 goto :fail
call npm run release:check
if errorlevel 1 exit /b %errorlevel%
call npm run phase15a:check
if errorlevel 1 goto :fail
call npm run phase15a4:check
if errorlevel 1 goto :fail
call npm run phase17_6:check
if errorlevel 1 goto :fail
call npm run phase17_7:check
if errorlevel 1 goto :fail
call npm run phase17_8:check
if errorlevel 1 goto :fail
call npm run phase17_8a:check
if errorlevel 1 goto :fail
call npm run phase17_8b:check
if errorlevel 1 goto :fail
call npm run phase17_8c:check
if errorlevel 1 goto :fail
call npm run phase17_8d:check
if errorlevel 1 goto :fail
call npm run phase17_8e:check
if errorlevel 1 goto :fail
call npm run phase17_9a17:check
if errorlevel 1 goto :fail
call npm run phase17_9a18:check
if errorlevel 1 goto :fail
call npm run phaseP1:check
if errorlevel 1 goto :fail
call npm run phaseP1_1:check
if errorlevel 1 goto :fail
call npm run phaseP1_2:check
if errorlevel 1 goto :fail
call npm run phaseP2:check
if errorlevel 1 goto :fail
call npm run phaseP2_1:check
if errorlevel 1 goto :fail
call npm run phaseP2_2:check
if errorlevel 1 goto :fail
call npm run phaseP2_3:check
if errorlevel 1 goto :fail
call npm run phaseP2_4:check
if errorlevel 1 goto :fail
call npm run phaseP2_5:check
if errorlevel 1 goto :fail
call npm run phaseP2_6:check
if errorlevel 1 goto :fail
call npm run phaseP2_7:check
if errorlevel 1 goto :fail
call npm run phaseP2_8:check
if errorlevel 1 goto :fail
call npm run phaseP2_9:check
if errorlevel 1 goto :fail
call npm run phaseP2_10:check
if errorlevel 1 goto :fail
call npm run phaseP2_11:check
if errorlevel 1 goto :fail
call npm run phaseP2_11_1:check
if errorlevel 1 goto :fail
call npm run phaseP2_11_2:check
if errorlevel 1 goto :fail
call npm run phaseP2_11_3:check
if errorlevel 1 goto :fail
call npm run phaseP2_11_4:check
if errorlevel 1 goto :fail
call npm run phaseP2_12_4:check
if errorlevel 1 goto :fail
call npm run phaseP2_12_5:check
if errorlevel 1 goto :fail
call npm run phaseP2_12_6:check
if errorlevel 1 goto :fail
call npm run phaseP2_12_7:check
if errorlevel 1 goto :fail
call npm run phase17_9a9:check
if errorlevel 1 goto :fail
call npm run phase17:check
if errorlevel 1 goto :fail
call npm run phase17_1:check
if errorlevel 1 goto :fail
call npm run phase16a2:check
if errorlevel 1 goto :fail
call npm run phase16b:check
if errorlevel 1 goto :fail
call npm run chess:current-check
if errorlevel 1 goto :fail
call npm run phase14q:check
if errorlevel 1 goto :fail
call npm run phase14r:check
if errorlevel 1 goto :fail
call npm run phase14r4:check
if errorlevel 1 goto :fail
call npm run phase14r4d:check
if errorlevel 1 goto :fail
call npm run phase14r4e:check
if errorlevel 1 goto :fail
call npm run phase14r5:check
if errorlevel 1 goto :fail
call npm run phase14r5a:check
if errorlevel 1 goto :fail
call npm run phase14s:check
if errorlevel 1 goto :fail
call npm run phase14s1:check
if errorlevel 1 goto :fail
call npm run phase14s1a:check
if errorlevel 1 goto :fail
call npm run phase14t:check
if errorlevel 1 goto :fail
call npm run phase14t0a:check
if errorlevel 1 goto :fail

echo [4/9] Regenerating Android native project for the single Family Bloom identity...
echo       Debug and Release now share package com.familybloom.android.
call npx expo prebuild --platform android --clean
if errorlevel 1 goto :fail
node scripts\setup\check-generated-android-package.js "%APP_PACKAGE%"
if errorlevel 1 goto :fail

if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

echo [5/9] Building standalone RELEASE APK with Gradle...
if not exist "android\gradlew.bat" (
  echo [ERROR] android\gradlew.bat was not created by Expo prebuild.
  goto :fail
)
pushd android
call gradlew.bat :app:assembleRelease
set "GRADLE_RC=!ERRORLEVEL!"
popd
if not "!GRADLE_RC!"=="0" goto :fail

set "APK_SOURCE="
for /f "delims=" %%F in ('dir /b /s /a-d /o-d "%PROJECT_ROOT%\android\app\build\outputs\apk\release\*.apk" 2^>nul') do (
  if not defined APK_SOURCE set "APK_SOURCE=%%F"
)
if not defined APK_SOURCE (
  echo [ERROR] Gradle succeeded but no release APK was found under:
  echo         android\app\build\outputs\apk\release
  goto :fail
)

echo [6/9] Verifying board-game audio made it into the native Release payload...
set /a BOARD_MP3_COUNT=0
set /a GENERATED_MP3_COUNT=0
where jar >nul 2>nul
if not errorlevel 1 (
  for /f %%C in ('jar tf "!APK_SOURCE!" ^| find /i /c ".mp3"') do set /a BOARD_MP3_COUNT=%%C
)
for /r "%PROJECT_ROOT%\android\app\build" %%F in (*.mp3) do set /a GENERATED_MP3_COUNT+=1
if !BOARD_MP3_COUNT! LSS 11 if !GENERATED_MP3_COUNT! LSS 11 (
  echo [ERROR] Release build does not contain the expected 11 board-game MP3 assets.
  echo         APK MP3 count       : !BOARD_MP3_COUNT!
  echo         Generated MP3 count : !GENERATED_MP3_COUNT!
  echo         Do not install this APK; check Metro asset bundling first.
  goto :fail
)
echo       Board SFX payload OK. APK=!BOARD_MP3_COUNT!, generated=!GENERATED_MP3_COUNT!

echo [7/9] Exporting APK...
set "BUILD_STAMP=latest"
for /f "delims=" %%T in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss" 2^>nul') do set "BUILD_STAMP=%%T"
set "EXPORTED_APK=%OUTPUT_DIR%\Family_Bloom_Release_!BUILD_STAMP!.apk"
copy /Y "!APK_SOURCE!" "!EXPORTED_APK!" >nul
if errorlevel 1 goto :fail
copy /Y "!APK_SOURCE!" "%OUTPUT_DIR%\Family_Bloom_Release_LATEST.apk" >nul

echo       APK: !EXPORTED_APK!

echo [8/9] Installing APK on the connected phone...
if "!APK_ONLY!"=="1" (
  echo       APK-only mode: skipping device installation.
) else (
  "!ADB!" -s "!DEVICE_SERIAL!" install -r -d "!EXPORTED_APK!"
  if errorlevel 1 (
    echo.
    echo [ERROR] APK was built successfully, but installation failed.
    echo         APK remains available here:
    echo         !EXPORTED_APK!
    echo.
    echo If Android reports a signature mismatch, do NOT uninstall the existing app yet
    echo if it contains local-only data you want to preserve.
    goto :fail
  )
  "!ADB!" -s "!DEVICE_SERIAL!" shell monkey -p "%APP_PACKAGE%" -c android.intent.category.LAUNCHER 1 >nul 2>nul
)

echo [9/9] Done.
echo.
echo ============================================================
echo   RELEASE BUILD SUCCESS
echo   App     : Family Bloom
echo   Package : %APP_PACKAGE%
echo   APK     : !EXPORTED_APK!
echo   Latest  : %OUTPUT_DIR%\Family_Bloom_Release_LATEST.apk
echo   Metro   : NOT required
echo ============================================================
echo.
if "!NO_PAUSE!"=="0" pause
exit /b 0

:require_file
if not exist "%~1" (
  echo [ERROR] Missing required project file: %~1
  echo Project root resolved as: %PROJECT_ROOT%
  exit /b 1
)
exit /b 0

:fail
echo.
echo ============================================================
echo   BUILD FAILED - read the error above.
echo ============================================================
echo.
if "!NO_PAUSE!"=="0" pause
exit /b 1
