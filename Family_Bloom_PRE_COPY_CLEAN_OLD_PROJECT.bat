@echo off
setlocal EnableExtensions
chcp 65001 >nul

set "TARGET=%~1"
if not defined TARGET (
  echo ========================================================
  echo Family Bloom - PRE-COPY CLEAN OLD PROJECT
  echo Phase 16B.17 - Away-time policy + SharedValue tab continuity
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
echo [1/4] Removing legacy Expo Router duplicates and post-V4K Chess overlays...

for %%F in (
  "src\components\chess\ChessPromotionOverlay.tsx"
  "src\components\chess\ChessResultToast.tsx"
  "src\services\games\gameAssetWarmup.ts"
  "scripts\test-phase16b16-game-surface-warmstart.js"
  "PHASE_16B5_BUILD_REPORT.md"
  "PHASE_16B6_BUILD_REPORT.md"
  "PHASE_16B7_BUILD_REPORT.md"
  "PHASE_16B8_BUILD_REPORT.md"
  "PHASE_16B9_BUILD_REPORT.md"
  "PHASE_16B10_BUILD_REPORT.md"
  "PHASE_16B11_BUILD_REPORT.md"
  "PHASE_16B12_BUILD_REPORT.md"
  "PHASE_16B13_BUILD_REPORT.md"
  "PHASE_16B14_BUILD_REPORT.md"
  "PHASE_16B15_BUILD_REPORT.md"
  "PHASE_16B16_BUILD_REPORT.md"
  "PHASE_16B17_BUILD_REPORT.md"
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
) do if exist "%TARGET%\%%~D" rmdir /s /q "%TARGET%\%%~D" >nul 2>nul

echo [2/4] Removing generated JS shadows only when matching TS/TSX source exists...
if exist "%TARGET%\src" call :CleanJsShadows "%TARGET%\src"
if errorlevel 1 goto :fail
if exist "%TARGET%\server\src" call :CleanJsShadows "%TARGET%\server\src"
if errorlevel 1 goto :fail

echo [3/4] Clearing project-local Metro/Expo/Gradle build caches...
if exist "%TARGET%\.expo" rmdir /s /q "%TARGET%\.expo" >nul 2>nul
if exist "%TARGET%\node_modules\.cache" rmdir /s /q "%TARGET%\node_modules\.cache" >nul 2>nul
if exist "%TARGET%\android\.gradle" rmdir /s /q "%TARGET%\android\.gradle" >nul 2>nul
if exist "%TARGET%\android\app\build" rmdir /s /q "%TARGET%\android\app\build" >nul 2>nul

echo [4/4] Verifying dangerous leftovers are gone...
if exist "%TARGET%\src\app\chess-game\[gameId].tsx" goto :leftover
if exist "%TARGET%\src\app\chess-lobby.tsx" goto :leftover
if exist "%TARGET%\src\components\chess\ChessPromotionOverlay.tsx" goto :leftover
if exist "%TARGET%\src\components\chess\ChessResultToast.tsx" goto :leftover

echo.
echo ========================================================
echo PRE-COPY CLEAN PASS
echo ========================================================
echo Now COPY the entire Phase 16B.17 FULL package over:
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
echo [ERROR] One or more obsolete Chess/route files remain.
goto :fail

:fail
echo.
echo ========================================================
echo PRE-COPY CLEAN FAILED - do not overlay the FULL package yet.
echo ========================================================
echo.
pause
exit /b 1
