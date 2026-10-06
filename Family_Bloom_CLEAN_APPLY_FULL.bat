@echo off
setlocal EnableExtensions
cd /d "%~dp0"
chcp 65001 >nul

echo ========================================================
echo Family Bloom - CLEAN APPLY FULL checkpoint
echo Phase 16B.17 - Away-time policy + SharedValue tab continuity
echo ========================================================
echo Cleaning legacy routes, post-V4K Chess overlays and local caches...
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found.
  goto :fail
)

node scripts\setup\cleanup-overlay-routes.js
if errorlevel 1 goto :fail

echo.
echo Verifying Xiangqi gameplay, Phase 16B.17 away-time + tab continuity and current Chess architecture gates...
call npm run phase16b:check
if errorlevel 1 goto :fail
call npm run chess:current-check
if errorlevel 1 goto :fail

echo.
echo PASS: cleanup + Xiangqi gameplay + Phase 16B.17 away-time + tab continuity + current Chess verification completed.
echo Next command:
echo   npx expo start -c
if /I not "%~1"=="--no-pause" pause
exit /b 0

:fail
echo.
echo FAIL: cleanup or current game verification did not complete.
echo Do not start Metro yet.
if /I not "%~1"=="--no-pause" pause
exit /b 1
