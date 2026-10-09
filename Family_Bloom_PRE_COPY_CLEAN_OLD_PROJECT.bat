@echo off
setlocal EnableExtensions
chcp 65001 >nul

set "TARGET=%~1"
if not defined TARGET (
  echo ========================================================
  echo Family Bloom - PRE-COPY CLEAN OLD PROJECT
  echo Phase 17.9W1 - Web Companion Preview + Phase 17.9A17 Native Persistent Tabbar
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
  echo.
  echo Enter the EXISTING Family Bloom project folder that will receive
  echo the new FULL CODE. Example: D:\FamilyBloom
  echo.
  set /p "TARGET=Old project folder: "
)
if not defined TARGET goto :fail
for %%I in ("%TARGET%") do set "TARGET=%%~fI"

if not exist "%TARGET%\package.json" (
  echo [ERROR] package.json was not found in:
  echo         %TARGET%
  goto :fail
)
if not exist "%TARGET%\app.config.js" (
  echo [ERROR] app.config.js was not found in:
  echo         %TARGET%
  goto :fail
)

echo.
echo Target: %TARGET%
echo.
echo [1/5] Removing retired guided performance runner/HUD and legacy routes...

for %%F in (
  "src\components\system\AppWidePerformanceDriver.tsx"
  "src\components\system\GuidedPerformanceOverlay.tsx"
  "src\services\performance\appWidePerformanceService.ts"
  "src\services\homeHub\homeHubService.ts"
  "src\services\performance\finalPerformanceGateService.ts"
  "src\services\performance\automatedRegressionService.ts"
  "src\app\(internal)\performance-test.tsx"
  "scripts\android\Family_Bloom_Phase15B_Performance_Run.bat"
  "scripts\android\Family_Bloom_Phase15B_Performance_Run.ps1"
  "src\components\chess\ChessPromotionOverlay.tsx"
  "src\components\chess\ChessBattleEffects.tsx"
  "src\components\chess\ChessResultToast.tsx"
  "src\services\games\gameAssetWarmup.ts"
  "scripts\test-phase16b16-game-surface-warmstart.js"
  "PHASE_16B5_BUILD_REPORT.md"
  "PHASE_16B6_BUILD_REPORT.md"
  "PHASE_16B7_BUILD_REPORT.md"
  "PHASE_16B8_BUILD_REPORT.md"
  "PHASE_16B9_BUILD_REPORT.md"
  "PHASE_16B10_BUILD_REPORT.md"
  "PHASE_17_9W1_BUILD_REPORT.md"
  "PHASE_17_9A17_BUILD_REPORT.md"
  "PHASE_16B11_BUILD_REPORT.md"
  "PHASE_16B12_BUILD_REPORT.md"
  "PHASE_16B13_BUILD_REPORT.md"
  "PHASE_16B14_BUILD_REPORT.md"
  "PHASE_16B15_BUILD_REPORT.md"
  "PHASE_16B16_BUILD_REPORT.md"
  "PHASE_16B17_BUILD_REPORT.md"
  "PHASE_16B18_BUILD_REPORT.md"
  "PHASE_17_BUILD_REPORT.md"
  "PHASE_17_1_BUILD_REPORT.md"
  "PHASE_17_2_BUILD_REPORT.md"
  "PHASE_17_3_BUILD_REPORT.md"
  "PHASE_17_3A_BUILD_REPORT.md"
  "PHASE_17_3B_BUILD_REPORT.md"
  "PHASE_17_3C_BUILD_REPORT.md"
  "PHASE_17_3D_BUILD_REPORT.md"
  "PHASE_17_3E_BUILD_REPORT.md"
  "PHASE_17_4_BUILD_REPORT.md"
  "PHASE_17_4A_BUILD_REPORT.md"
  "PHASE_17_5_BUILD_REPORT.md"
  "PHASE_17_5A_BUILD_REPORT.md"
  "PHASE_17_5B_BUILD_REPORT.md"
  "PHASE_17_5C_BUILD_REPORT.md"
  "PHASE_17_6_BUILD_REPORT.md"
  "PHASE_17_7_BUILD_REPORT.md"
  "PHASE_17_8_BUILD_REPORT.md"
  "PHASE_17_8A_BUILD_REPORT.md"
  "PHASE_17_8B_BUILD_REPORT.md"
  "PHASE_17_8C_BUILD_REPORT.md"
  "PHASE_17_8D_BUILD_REPORT.md"
  "PHASE_17_8E_BUILD_REPORT.md"
  "PHASE_17_9A_BUILD_REPORT.md"
  "PHASE_17_9A1_BUILD_REPORT.md"
  "PHASE_17_9A2_BUILD_REPORT.md"
  "PHASE_17_9A3_BUILD_REPORT.md"
  "PHASE_17_9A4_BUILD_REPORT.md"
  "PHASE_17_9A5_BUILD_REPORT.md"
  "PHASE_17_9A6_BUILD_REPORT.md"
  "PHASE_17_9A7_BUILD_REPORT.md"
  "PHASE_17_9A8_BUILD_REPORT.md"
  "PHASE_17_9A9_BUILD_REPORT.md"
  "PHASE_17_9A10_BUILD_REPORT.md"
  "PHASE_17_9A11_BUILD_REPORT.md"
  "PHASE_17_9A12_BUILD_REPORT.md"
  "PHASE_17_9A13_BUILD_REPORT.md"
  "src\app\chess-history.tsx"
  "src\app\chess-lobby.tsx"
  "src\app\create-profile.tsx"
  "src\app\family-gateway.tsx"
  "src\app\family-graph.tsx"
  "src\app\family-graph-admin.tsx"
  "src\app\family-graph-person-editor.tsx"
  "src\app\family-graph-proposals.tsx"
  "src\app\family-graph-relationship-editor.tsx"
  "src\app\family-join-requests.tsx"
  "src\app\family-memberships.tsx"
  "src\app\family-select.tsx"
  "src\app\family-timeline.tsx"
  "src\app\home-board.tsx"
  "src\app\home-fund.tsx"
  "src\app\home-game-create.tsx"
  "src\app\home-games.tsx"
  "src\app\home-music.tsx"
  "src\app\home-polls.tsx"
  "src\app\home-time-capsule-compose.tsx"
  "src\app\home-time-capsule-demo.tsx"
  "src\app\home-time-capsules.tsx"
  "src\app\home-whispers.tsx"
  "src\app\memory-book.tsx"
  "src\app\notification-preferences.tsx"
  "src\app\notifications.tsx"
  "src\app\performance-data-test.tsx"
  "src\app\performance-graph-test.tsx"
  "src\app\performance-test.tsx"
  "src\app\profile.tsx"
) do if exist "%TARGET%\%%~F" del /f /q "%TARGET%\%%~F" >nul 2>nul

for %%D in (
  "src\app\chess-game"
  "src\app\chat"
  "src\app\event"
  "src\app\home-game"
  "src\app\home-kitchen"
  "src\app\home-time-capsule"
  "src\app\member"
  "assets\images\chess\pieces-webp-default"
) do if exist "%TARGET%\%%~D" rmdir /s /q "%TARGET%\%%~D" >nul 2>nul

for /f "delims=" %%F in ('dir /b "%TARGET%\scripts\test-phase17_*.js" 2^>nul') do (
  echo %%F| findstr /r /c:"test-phase17_[2345]" >nul && del /f /q "%TARGET%\scripts\%%F" >nul 2>nul
)
for /f "delims=" %%F in ('dir /b "%TARGET%\scripts\test-phase15b*.js" 2^>nul') do del /f /q "%TARGET%\scripts\%%F" >nul 2>nul

echo [2/5] Removing generated JS shadows only when matching TS/TSX source exists...
if exist "%TARGET%\src" call :CleanJsShadows "%TARGET%\src"
if errorlevel 1 goto :fail
if exist "%TARGET%\server\src" call :CleanJsShadows "%TARGET%\server\src"
if errorlevel 1 goto :fail

echo [3/5] Clearing project-local Metro/Expo/Gradle build caches...
if exist "%TARGET%\.expo" rmdir /s /q "%TARGET%\.expo" >nul 2>nul
if exist "%TARGET%\node_modules\.cache" rmdir /s /q "%TARGET%\node_modules\.cache" >nul 2>nul
if exist "%TARGET%\android\.gradle" rmdir /s /q "%TARGET%\android\.gradle" >nul 2>nul
if exist "%TARGET%\android\app\build" rmdir /s /q "%TARGET%\android\app\build" >nul 2>nul

echo [4/5] Verifying retired test runtime is gone...
if exist "%TARGET%\src\app\(internal)\performance-test.tsx" goto :leftover
if exist "%TARGET%\src\components\system\AppWidePerformanceDriver.tsx" goto :leftover
if exist "%TARGET%\src\components\system\GuidedPerformanceOverlay.tsx" goto :leftover
if exist "%TARGET%\src\services\performance\appWidePerformanceService.ts" goto :leftover

echo [5/5] Preserving reusable opt-in tests only...
echo       performance-graph-test + performance-data-test stay for Developer Tools.

echo.
echo ========================================================
echo PRE-COPY CLEAN PASS
echo ========================================================
echo Now COPY the entire Phase 17.9W1 FULL package over:
echo   %TARGET%
echo Then run inside the updated project:
echo   Family_Bloom_CLEAN_APPLY_FULL.bat
echo.
pause
exit /b 0

:CleanJsShadows
set "SCANROOT=%~1"
for /r "%SCANROOT%" %%J in (*.js) do (
  if exist "%%~dpnJ.ts" del /f /q "%%~fJ" >nul 2>nul
  if exist "%%~dpnJ.tsx" del /f /q "%%~fJ" >nul 2>nul
)
exit /b 0

:leftover
echo [ERROR] One or more retired performance/legacy files remain.
goto :fail

:fail
echo.
echo ========================================================
echo PRE-COPY CLEAN FAILED - do not overlay the FULL package yet.
echo ========================================================
echo.
pause
exit /b 1
