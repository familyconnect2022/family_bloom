@echo off
setlocal EnableExtensions
chcp 65001 >nul
for %%I in ("%~dp0..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"
title Family Bloom - Sync npm dependencies

echo.
echo ============================================================
echo   FAMILY BLOOM - SYNC NPM DEPENDENCIES
echo   Project: %PROJECT_ROOT%
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH.
  goto :fail
)
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found in PATH.
  goto :fail
)
if not exist package.json (
  echo [ERROR] package.json was not found at the resolved project root.
  goto :fail
)

echo Updating node_modules and synchronizing package-lock.json...
call npm install --no-audit --no-fund
if errorlevel 1 goto :fail

echo.
echo Dependency sync completed.
echo Dependencies and package-lock are synchronized. Android build BAT files can now run normally.
echo.
pause
exit /b 0

:fail
echo.
echo Dependency sync failed. Read the npm error above.
echo.
pause
exit /b 1
