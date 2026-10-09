@echo off
setlocal EnableExtensions
cd /d "%~dp0"
chcp 65001 >nul

echo ========================================================
echo Family Bloom - CLEAN APPLY FULL checkpoint
echo Phase 17.9W2 - Web Parity iPhone iPad Desktop + Phase 17.9A17 Native Persistent Tabbar
rem Successor of Phase 17.9A16 - Xiangqi Server Authority Realtime Bot
rem Successor of Phase 17.9A15 - Shared Board Game Sound Premove Bot Pacing
rem Successor of Phase 17.9A14 - Instant Home Firebase Data Source Cleanup
rem Successor of Phase 17.9A12 - Zero Relayout Chess Transition
rem Successor of Phase 17.9A11 - Family Recovery Reconnect Sync Time Controls
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
echo Checking Phase 17.9W2 web parity + A14 native dependencies...
set "NEED_INSTALL=0"
if not exist "node_modules\expo-audio\package.json" set "NEED_INSTALL=1"
if not exist "node_modules\@react-native-async-storage\async-storage\package.json" set "NEED_INSTALL=1"
if not exist "node_modules\firebase\package.json" set "NEED_INSTALL=1"
if "%NEED_INSTALL%"=="1" (
  where npm >nul 2>nul
  if errorlevel 1 (
    echo [ERROR] A14 native dependencies are missing but npm was not found.
    echo         Install Node.js/npm, then run this BAT again.
    goto :fail
  )
  echo One or more required dependencies are missing. Running npm install...
  call npm install
  if errorlevel 1 goto :fail
)

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
"%NODE_EXE%" scripts\test-phase17_9a12-zero-relayout-chess-transition.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase17_9a15-shared-board-game-sound-premove.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase17_9a16-xiangqi-server-authority.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase17_9a17-native-persistent-tabbar.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase17_9w1-web-companion.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase17_9w2-web-parity.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase17_9a14-instant-home-firebase-cleanup.js
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
echo PASS: Phase 17.9W2 Web Parity + A17 Native Persistent Tabbar + Xiangqi/Chess server + A15/A14 verification completed.
echo Normal runtime has no guided performance HUD/runner.
echo Next commands:
echo   Android: npx expo start -c
echo   Web:     npx expo start --web -c
echo   Static:  npm run web:build
if /I not "%~1"=="--no-pause" pause
exit /b 0

:fail
echo.
echo FAIL: cleanup or current verification did not complete.
echo Do not start Metro yet.
if /I not "%~1"=="--no-pause" pause
exit /b 1

