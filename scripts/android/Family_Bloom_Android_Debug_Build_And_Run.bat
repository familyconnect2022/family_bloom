@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
for %%I in ("%~dp0..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"
title Family Bloom - Debug Build + Metro

set "APP_PACKAGE=com.familybloom.android"

echo.
echo ============================================================
echo   FAMILY BLOOM - DEBUG BUILD + RUN WITH METRO
echo   App     : Family Bloom
echo   Package : %APP_PACKAGE%
echo   Identity: SAME package/Firebase config as Release
echo ============================================================
echo.
echo NOTE: Debug and Release are no longer separate Android apps.
echo       Test on another physical phone or use your phone's clone feature.
echo.

if not exist "app.config.js" (
  echo [ERROR] app.config.js is missing.
  goto :fail
)
if not exist "google-services.json" (
  echo [ERROR] google-services.json is missing.
  goto :fail
)

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found.
  goto :fail
)
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found.
  goto :fail
)

if not defined JAVA_HOME (
  if exist "%ProgramFiles%\Android\Android Studio\jbr\bin\java.exe" set "JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr"
)
if defined JAVA_HOME set "PATH=%JAVA_HOME%\bin;%PATH%"
where java >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Java was not found. Install Android Studio or set JAVA_HOME.
  goto :fail
)

if not defined ANDROID_HOME if exist "%LOCALAPPDATA%\Android\Sdk" set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
if not defined ANDROID_SDK_ROOT if defined ANDROID_HOME set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
if defined ANDROID_HOME set "PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\emulator;%PATH%"
set "ADB=adb"
where adb >nul 2>nul
if errorlevel 1 (
  if defined ANDROID_HOME if exist "%ANDROID_HOME%\platform-tools\adb.exe" set "ADB=%ANDROID_HOME%\platform-tools\adb.exe"
)
"!ADB!" version >nul 2>nul
if errorlevel 1 (
  echo [ERROR] adb was not found.
  goto :fail
)

echo [overlay] Cleaning legacy files from FULL-over-old updates...
node scripts\setup\cleanup-overlay-routes.js
if errorlevel 1 goto :fail

echo [1/7] Checking Android device...
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
  "!ADB!" devices
  echo [ERROR] No authorized Android phone found.
  goto :fail
)
if !DEVICE_COUNT! GTR 1 (
  "!ADB!" devices
  set /p "DEVICE_SERIAL=Enter target phone serial: "
  if "!DEVICE_SERIAL!"=="" goto :fail
)
"!ADB!" -s "!DEVICE_SERIAL!" get-state >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Selected device is unavailable: !DEVICE_SERIAL!
  goto :fail
)
for /f "delims=" %%M in ('"!ADB!" -s "!DEVICE_SERIAL!" shell getprop ro.product.model 2^>nul') do set "DEVICE_MODEL=%%M"
echo       Device: !DEVICE_MODEL!  [!DEVICE_SERIAL!]

echo [2/7] Checking npm dependencies...
set "DEPENDENCIES_READY=1"
if not exist "node_modules\expo\package.json" set "DEPENDENCIES_READY=0"
if not exist "node_modules\expo-dev-client\package.json" set "DEPENDENCIES_READY=0"
if not exist "node_modules\@react-native-firebase\app\package.json" set "DEPENDENCIES_READY=0"
if "!DEPENDENCIES_READY!"=="1" (
  node scripts\setup\check-expo-dependencies.js >nul 2>nul
  if errorlevel 1 set "DEPENDENCIES_READY=0"
  node scripts\setup\check-package-lock.js >nul 2>nul
  if errorlevel 1 set "DEPENDENCIES_READY=0"
)
if "!DEPENDENCIES_READY!"=="0" (
  echo       Dependencies are missing or stale. Running npm install...
  call npm install --no-audit --no-fund
  if errorlevel 1 goto :fail
)
node scripts\setup\check-expo-dependencies.js
if errorlevel 1 goto :fail
node scripts\setup\check-package-lock.js
if errorlevel 1 goto :fail

echo [3/7] Running Expo Doctor and current Family Bloom static gates...
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

echo [4/7] Regenerating Android native project with the single app identity...
call npx expo prebuild --platform android --clean
if errorlevel 1 goto :fail
node scripts\setup\check-generated-android-package.js "%APP_PACKAGE%"
if errorlevel 1 goto :fail

echo [5/7] Building DEBUG APK with Gradle...
if not exist "android\gradlew.bat" (
  echo [ERROR] android\gradlew.bat was not created by Expo prebuild.
  goto :fail
)
pushd android
call gradlew.bat :app:assembleDebug
set "GRADLE_RC=!ERRORLEVEL!"
popd
if not "!GRADLE_RC!"=="0" goto :fail

set "DEBUG_APK="
for /f "delims=" %%F in ('dir /b /s /a-d /o-d "%PROJECT_ROOT%\android\app\build\outputs\apk\debug\*.apk" 2^>nul') do (
  if not defined DEBUG_APK set "DEBUG_APK=%%F"
)
if not defined DEBUG_APK (
  echo [ERROR] Gradle succeeded but no debug APK was found.
  goto :fail
)
echo       APK: !DEBUG_APK!

echo [6/7] Installing DEBUG build on the selected phone...
"!ADB!" -s "!DEVICE_SERIAL!" install -r -d "!DEBUG_APK!"
if errorlevel 1 (
  echo.
  echo [ERROR] Debug APK installation failed.
  echo This build intentionally uses the same package as Release.
  echo Use a second physical phone / clone profile as planned, or resolve signing/version conflicts first.
  goto :fail
)
"!ADB!" -s "!DEVICE_SERIAL!" shell pm path %APP_PACKAGE% >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Package %APP_PACKAGE% is not installed after Gradle install.
  goto :fail
)

echo [7/7] Starting Metro and opening Family Bloom...
"!ADB!" -s "!DEVICE_SERIAL!" reverse tcp:8081 tcp:8081 >nul 2>nul
start "Family Bloom - Metro" "%ComSpec%" /k call "%PROJECT_ROOT%\scripts\android\Family_Bloom_Android_Metro_Only.bat"
timeout /t 3 /nobreak >nul
"!ADB!" -s "!DEVICE_SERIAL!" shell monkey -p %APP_PACKAGE% -c android.intent.category.LAUNCHER 1 >nul 2>nul

echo.
echo ============================================================
echo   DEBUG BUILD SUCCESS
echo   App     : Family Bloom
echo   Package : %APP_PACKAGE%
echo   Device  : !DEVICE_MODEL!  [!DEVICE_SERIAL!]
echo   Metro   : opened in a separate window
echo ============================================================
echo.
pause
exit /b 0

:fail
echo.
echo ============================================================
echo   DEBUG BUILD FAILED - read the error above.
echo ============================================================
echo.
pause
exit /b 1

