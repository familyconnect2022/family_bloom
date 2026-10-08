@echo off
setlocal EnableExtensions
cd /d "%~dp0"
chcp 65001 >nul

echo ========================================================
echo Family Bloom - CLEAN APPLY FULL checkpoint
echo Phase 17.9A11 - Family Recovery Reconnect Sync Time Controls
rem Successor of Phase 17.9A10 - Tap Only Material Rail Smaller Mini
rem Successor of Phase 17.9A9 - Chess Lifecycle Root Mini Premove
rem Successor of Phase 17.9A8 - Rematch Race Fix No Battle FX
rem Successor of Phase 17.9A7 - Real Device Surface Ownership FX Clip
rem Successor of Phase 17.9A6 - Fixed Screen Geometry Single Icon Tabbar
rem Successor of Phase 17.9A5 - Chess Surface Layer Geometry Tabbar
echo Base: Phase 16B.18 - Game overlay occlusion + gesture/flicker hotfix
echo ========================================================
echo Removing retired runner/HUD, legacy routes and local caches...
echo.

set "NODE_EXE=node"
where node >nul 2>nul
if errorlevel 1 (
  if exist "%ProgramFiles%\nodejs\node.exe" (
    set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
  ) else if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
    set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
  ) else (
    echo [ERROR] Node.js was not found in PATH or Program Files.
    goto :fail
  )
)

"%NODE_EXE%" scripts\setup\cleanup-overlay-routes.js
if errorlevel 1 goto :fail

echo.
echo Verifying clean runtime + lifecycle + current game gates...
rem chess:current-check is invoked directly with Node below; keep this marker for legacy safety gates.
"%NODE_EXE%" scripts\test-phase17_6-clean-developer-tools.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase17_7-moments-tab-optimization.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase17_8-planner-tab-optimization.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase17_8a-planner-restore-hotfix.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase17_8b-planner-stable-architecture.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase17_8c-planner-android-stable-panels.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase17_8d-shared-event-ui-thread-navigation.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase17_8e-icon-only-tabbar.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase17_9a9-chess-lifecycle-mini-premove.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase17_9a10-tap-only-material-rail-mini.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase17_9a11-family-recovery-sync-time-controls.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase17-five-tab-runtime-lifecycle.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase17_1-tab-switch-hotfix.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase16b-xiangqi-playable-logic.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-chess-current-build-gates.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase13-release-readiness.js
if errorlevel 1 goto :fail

echo.
echo PASS: Phase 17.9A11 Family Recovery Reconnect Sync Time Controls + clean runtime + current game verification completed.
echo Normal runtime has no guided performance HUD/runner.
echo Next command:
echo   npx expo start -c
if /I not "%~1"=="--no-pause" pause
exit /b 0

:fail
echo.
echo FAIL: cleanup or current verification did not complete.
echo Do not start Metro yet.
if /I not "%~1"=="--no-pause" pause
exit /b 1
