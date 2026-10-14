@echo off
setlocal EnableExtensions
cd /d "%~dp0"
if exist "src\components\xiangqi\XiangqiBattleEffects.tsx" del /f /q "src\components\xiangqi\XiangqiBattleEffects.tsx" >nul 2>nul
if exist "src\components\familyGraph\FamilyGraphFocusSurfaceHost.tsx" del /f /q "src\components\familyGraph\FamilyGraphFocusSurfaceHost.tsx" >nul 2>nul
if exist "src\services\presentation\familyGraphFocusSurfaceStore.ts" del /f /q "src\services\presentation\familyGraphFocusSurfaceStore.ts" >nul 2>nul
if exist "src\services\presentation\bloomRootSurfaceManager.ts" del /f /q "src\services\presentation\bloomRootSurfaceManager.ts" >nul 2>nul
chcp 65001 >nul

echo ========================================================
echo Family Bloom - CLEAN APPLY FULL checkpoint
echo Performance Architecture P2.23 - Canonical Chess Full / Mini Route Ownership
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
"%NODE_EXE%" scripts\maintenance\normalize-project-root.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\maintenance\check-project-structure.js
if errorlevel 1 goto :fail

rem Native Android uses the exact supplied MP3 board SFX; Web keeps OGG.
rem Copy-over does not delete retired files, so remove obsolete codecs/wrong sound banks only.
if exist "assets\audio\board-game" del /f /q "assets\audio\board-game\*.ogg" >nul 2>nul
if exist "assets\audio\board-game" del /f /q "assets\audio\board-game\*.m4a" >nul 2>nul
if exist "assets\audio\chess" rmdir /s /q "assets\audio\chess" >nul 2>nul
if exist "public\audio\board-game" del /f /q "public\audio\board-game\*.mp3" >nul 2>nul

echo.
echo Checking P2.22 real-device pan / first-move audio / cross-game quiescence + inherited gates...
set "NEED_INSTALL=0"
if not exist "package-lock.json" set "NEED_INSTALL=1"
if not exist "node_modules\expo-audio\package.json" set "NEED_INSTALL=1"
if not exist "node_modules\expo-asset\package.json" set "NEED_INSTALL=1"
if not exist "node_modules\@react-native-async-storage\async-storage\package.json" set "NEED_INSTALL=1"
if not exist "node_modules\firebase\package.json" set "NEED_INSTALL=1"
if exist "node_modules\firebase\package.json" (
  "%NODE_EXE%" scripts\check-web-firebase-version.js
  if errorlevel 1 set "NEED_INSTALL=1"
)
if "%NEED_INSTALL%"=="0" (
  "%NODE_EXE%" scripts\setup\check-expo-dependencies.js >nul 2>nul
  if errorlevel 1 set "NEED_INSTALL=1"
  "%NODE_EXE%" scripts\setup\check-package-lock.js >nul 2>nul
  if errorlevel 1 set "NEED_INSTALL=1"
)
if "%NEED_INSTALL%"=="1" (
  where npm >nul 2>nul
  if errorlevel 1 (
    echo [ERROR] Required W3/A14 dependencies are missing or outdated but npm was not found.
    echo         Install Node.js/npm, then run this BAT again.
    goto :fail
  )
  echo One or more required dependencies are missing. Running npm install...
  call npm install --no-audit --no-fund
  if errorlevel 1 goto :fail
)
"%NODE_EXE%" scripts\setup\check-expo-dependencies.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\setup\check-package-lock.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\setup\check-effective-expo-config.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\setup\check-board-audio-integrity.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\setup\check-build-entrypoints.js
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
"%NODE_EXE%" scripts\test-phase17_9a12-zero-relayout-chess-transition.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase17_9a15-shared-board-game-sound-premove.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase17_9a16-xiangqi-server-authority.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase17_9a17-native-persistent-tabbar.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase17_9a18-single-icon-tabbar.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p1-android-performance-foundation.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p1_1-native-feel-tab-surface.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2-ten-bottleneck-refactor.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_1-architecture-audit-fixes.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_2-provider-boundary-route-safety.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_3-zero-work-tab-press.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_4-frozen-tab-surfaces.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_5-visual-ready-no-reload.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_6-interaction-detail-scroll-polish.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_7-hard-isolated-tabbar-branch-visual-ready.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_10-branch-camera-chess-actions-audio-xiangqi-icon.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_11-family-graph-topology-retained-camera.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_11_1-family-graph-scene-runtime.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_11_2-bsh-focus-runtime-presentation.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_11_3-bsh-cancel-first-focus.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_11_4-bsh-retained-chunks-interruptible-focus.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_12_4-build-integrity-chess-audio.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_12_5-remote-apk-share-build.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_12_6-build-dependency-contract.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_12_7-expo-asset-peer-contract.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_12_8-windows-expo-doctor-node-cli-launch.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_15_2-focus-reopen-chess-audio-final.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_15_5_1-build-share-doctor-patch-drift.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_17_1-xiangqi-shared-transport-family-graph-first-paint.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_18-pending-game-lock-lazy-board-local-focus.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_19-route-owned-handoff-native-focus.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_20-clean-game-lifecycle-focus-pan.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_21-terminal-teardown-focus-camera.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_22-real-device-pan-audio-cross-game-quiescence.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_23-chess-full-mini-route-ownership.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase-p2_8-stabilization-audio-moments-branch-tabbar.js
if errorlevel 1 goto :fail



"%NODE_EXE%" scripts\test-phase-p1_2-opaque-tab-handoff.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase17_9w1-web-companion.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase17_9w2-web-parity.js
if errorlevel 1 goto :fail
"%NODE_EXE%" scripts\test-phase17_9w3-web-stability-visual-rebuild.js
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
"%NODE_EXE%" scripts\maintenance\check-project-structure.js
if errorlevel 1 goto :fail

echo.
echo PASS: Performance Architecture P2.22 completed.
echo Finished Chess / Xiangqi receipts cannot resurrect sessions; Focus is centered 85%% x 85%% and pannable.
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


