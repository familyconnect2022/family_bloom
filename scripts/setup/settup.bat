@echo off
setlocal
chcp 65001 >nul
for %%I in ("%~dp0..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"
echo =========================================
echo FAMILY BLOOM - LEGACY EXPO ANDROID SETUP
echo =========================================
echo.
echo [1/4] Installing expo...
call npm install expo
if errorlevel 1 goto :fail
echo [2/4] Fixing Expo dependency versions...
call npx expo install --fix
if errorlevel 1 goto :fail
echo [3/4] Running expo-doctor...
call npx expo-doctor
if errorlevel 1 goto :fail
echo [4/4] Running Android dev build...
call npx expo run:android
if errorlevel 1 goto :fail
echo DONE.
pause
exit /b 0
:fail
echo FAILED. Read the first error above.
pause
exit /b 1
