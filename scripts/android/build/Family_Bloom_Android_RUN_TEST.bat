@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
for %%I in ("%~dp0..\..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%" || exit /b 1

echo.
echo ============================================================
echo FAMILY BLOOM - ANDROID USB/EMULATOR DEVELOPMENT TEST
echo Executes: npx expo run:android
echo Debug development build, NOT a shareable Release APK.
echo App identity: com.familybloom.android
echo ============================================================
echo.
where node >nul 2>nul
if errorlevel 1 (echo [ERROR] Node.js not found.& exit /b 1)
where npm >nul 2>nul
if errorlevel 1 (echo [ERROR] npm not found.& exit /b 1)
if not exist "node_modules\expo\package.json" (
  echo [ERROR] Dependencies missing. Run npm install --no-audit --no-fund first.
  exit /b 1
)
if not exist "google-services.json" (
  echo [ERROR] google-services.json missing in this project.
  echo Copy your existing Android Firebase configuration; NEVER commit it to GitHub.
  exit /b 1
)
node "scripts\android\build\firebase-android-config.cjs" check "%PROJECT_ROOT%"
if errorlevel 1 exit /b 1
node "scripts\setup\check-expo-route-uniqueness.cjs"
if errorlevel 1 exit /b 1
where adb >nul 2>nul
if errorlevel 1 (
  echo [WARN] adb is not on PATH. Check Android SDK/platform-tools installation.
  echo        Expo may still find the Android SDK through ANDROID_HOME.
)
echo.
echo [TEST] Running Android native debug build; device must be USB-authorized.
echo [NOTE] Debug/Release same package: signing can block install over an existing APK.
echo [NOTE] Do not run this at the same time as Build ^& Share.
call npx expo run:android %*
if errorlevel 1 (echo [FAIL] Android development build failed.& exit /b 1)
echo [PASS] Expo Android command finished successfully.
exit /b 0
