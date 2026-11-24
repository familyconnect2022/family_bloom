@echo off
setlocal EnableExtensions
chcp 65001 >nul
for %%I in ("%~dp0..\..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"
title Family Bloom - Metro

echo.
echo ============================================================
echo   FAMILY BLOOM - METRO FOR DEBUG BUILD
echo   Package: com.familybloom.android
echo ============================================================
echo.
node scripts\android\prepare-android-local.cjs
if errorlevel 1 (
  echo [ERROR] Android preparation failed. Metro NOT started.
  pause
  exit /b 1
)
call npx --no-install expo start --dev-client %*
exit /b %ERRORLEVEL%
