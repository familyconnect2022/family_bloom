@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
for %%I in ("%~dp0..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"
title Family Bloom - Install Last APK

set "APP_PACKAGE=com.familybloom.android"
set "ADB=adb"
if not defined ANDROID_HOME if exist "%LOCALAPPDATA%\Android\Sdk" set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
if defined ANDROID_HOME set "PATH=%ANDROID_HOME%\platform-tools;%PATH%"
where adb >nul 2>nul
if errorlevel 1 (
  if defined ANDROID_HOME if exist "%ANDROID_HOME%\platform-tools\adb.exe" set "ADB=%ANDROID_HOME%\platform-tools\adb.exe"
)
"%ADB%" version >nul 2>nul
if errorlevel 1 (
  echo [ERROR] adb was not found.
  pause
  exit /b 1
)

set "APK=%PROJECT_ROOT%\dist\android\Family_Bloom_Release_LATEST.apk"
if not exist "!APK!" (
  set "APK="
  for /f "delims=" %%F in ('dir /b /s /a-d /o-d "%PROJECT_ROOT%\dist\android\*.apk" 2^>nul') do (
    if not defined APK set "APK=%%F"
  )
)
if not defined APK (
  echo [ERROR] No APK found under dist\android.
  echo Run scripts\android\Family_Bloom_Android_Test_App_RELEASE.bat first.
  pause
  exit /b 1
)

"%ADB%" start-server >nul 2>nul
set /a DEVICE_COUNT=0
set "DEVICE_SERIAL="
for /f "skip=1 tokens=1,2" %%A in ('"%ADB%" devices') do (
  if "%%B"=="device" (
    set /a DEVICE_COUNT+=1
    set "DEVICE_SERIAL=%%A"
  )
)
if !DEVICE_COUNT! EQU 0 (
  "%ADB%" devices
  echo [ERROR] No authorized Android phone found.
  pause
  exit /b 1
)
if !DEVICE_COUNT! GTR 1 (
  "%ADB%" devices
  set /p "DEVICE_SERIAL=Enter target phone serial: "
)

echo Installing: !APK!
"%ADB%" -s "!DEVICE_SERIAL!" install -r -d "!APK!"
if errorlevel 1 (
  echo.
  echo [ERROR] APK install failed.
  echo If Android reports a signature mismatch, do NOT uninstall yet if
  echo you need any local-only app data. Keep the error and review it first.
  pause
  exit /b 1
)

"%ADB%" -s "!DEVICE_SERIAL!" shell monkey -p "%APP_PACKAGE%" -c android.intent.category.LAUNCHER 1 >nul 2>nul
echo Done. Family Bloom was installed and launched.
pause
exit /b 0
