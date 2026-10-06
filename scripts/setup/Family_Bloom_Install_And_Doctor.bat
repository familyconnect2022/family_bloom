@echo off
setlocal EnableExtensions
chcp 65001 >nul
for %%I in ("%~dp0..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"
title Family Bloom - Install Dependencies + Expo Doctor

echo.
echo ============================================================
echo   FAMILY BLOOM - DEPENDENCY INSTALL + EXPO DOCTOR
echo ============================================================
echo.

where node >nul 2>nul || goto :missing_node
where npm >nul 2>nul || goto :missing_node

echo [1/4] Installing dependencies from package.json...
call npm install --no-audit --no-fund
if errorlevel 1 goto :fail

echo [2/4] Checking Expo SDK 57 package patch versions and package-lock...
node scripts\setup\check-expo-dependencies.js
if errorlevel 1 (
  echo       Running Expo compatibility repair...
  call npx expo install --fix
  if errorlevel 1 goto :fail
)

echo [3/4] Rechecking package versions and package-lock...
node scripts\setup\check-expo-dependencies.js
if errorlevel 1 goto :fail
node scripts\setup\check-package-lock.js
if errorlevel 1 goto :fail

echo [4/4] Running expo-doctor...
call npm run doctor:native-check
if errorlevel 1 goto :fail

echo.
echo ============================================================
echo   DEPENDENCIES + EXPO DOCTOR PASS
echo ============================================================
echo.
pause
exit /b 0

:missing_node
echo [ERROR] Node.js/npm was not found in PATH.
goto :fail

:fail
echo.
echo ============================================================
echo   SETUP FAILED - read the error above.
echo ============================================================
echo.
pause
exit /b 1
