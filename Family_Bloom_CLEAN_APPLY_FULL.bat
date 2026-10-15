@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo Family Bloom P2.28 - CLEAN APPLY FULL
echo Independent Focus + Independent Chess/Xiangqi Lifecycle
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

echo [1/6] Removing P2.28-retired shared game owners and generated shadows...
for %%F in (
  "src\components\system\BoardGameSessionBridge.tsx"
  "src\components\system\GameBoardHost.tsx"
  "src\services\games\activeBoardGameSessionStore.ts"
  "src\services\games\pendingBoardGameReservationStore.ts"
  "src\services\games\pendingBoardGameReservationActions.ts"
  "src\services\presentation\boardGamePresentationCoordinator.ts"
  "src\services\presentation\bloomSurfaceRailStore.ts"
  "src\services\xiangqi\xiangqiSessionBootstrap.ts"
  "src\components\familyGraph\FamilyGraphFocusPortal.tsx"
  "src\components\familyGraph\FamilyGraphFocusSurfaceHost.tsx"
  "src\services\presentation\familyGraphFocusSurfaceStore.ts"
) do if exist "%%~F" del /f /q "%%~F" >nul 2>nul

node scripts\setup\cleanup-overlay-routes.js
if errorlevel 1 goto :fail
node scripts\maintenance\normalize-project-root.js
if errorlevel 1 goto :fail

if exist ".expo" rmdir /s /q ".expo" >nul 2>nul
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache" >nul 2>nul
if exist "android\.gradle" rmdir /s /q "android\.gradle" >nul 2>nul
if exist "android\app\build" rmdir /s /q "android\app\build" >nul 2>nul

echo [2/6] Checking/installing dependencies...
set "NEED_INSTALL=0"
if not exist "node_modules\expo\package.json" set "NEED_INSTALL=1"
if not exist "node_modules\expo-audio\package.json" set "NEED_INSTALL=1"
if not exist "node_modules\firebase\package.json" set "NEED_INSTALL=1"
if not exist "node_modules\socket.io-client\package.json" set "NEED_INSTALL=1"
if "%NEED_INSTALL%"=="1" (
  echo       Dependencies are missing. Running npm install...
  call npm install --no-audit --no-fund
  if errorlevel 1 goto :fail
)

node scripts\setup\check-expo-dependencies.js
if errorlevel 1 goto :fail
node scripts\setup\check-package-lock.js
if errorlevel 1 goto :fail

echo [3/6] Verifying P2.28 architecture invariants...
call npm run phaseP2_28:check
if errorlevel 1 goto :fail

echo [4/6] Verifying project/build/audio contracts...
call npm run structure:check
if errorlevel 1 goto :fail
node scripts\setup\check-effective-expo-config.js
if errorlevel 1 goto :fail
node scripts\setup\check-board-audio-integrity.js
if errorlevel 1 goto :fail
node scripts\setup\check-build-entrypoints.js
if errorlevel 1 goto :fail

echo [5/6] Running TypeScript checks...
call npm run typecheck
if errorlevel 1 goto :fail
if exist "server\package.json" (
  pushd server
  if not exist "node_modules\typescript\package.json" (
    call npm install --no-audit --no-fund
    if errorlevel 1 (
      popd
      goto :fail
    )
  )
  call npm run typecheck
  if errorlevel 1 (
    popd
    goto :fail
  )
  popd
)

echo [6/6] Release-readiness smoke check...
call npm run release:check
if errorlevel 1 goto :fail

echo.
echo ============================================================
echo PASS: Family Bloom P2.28 is clean and ready.
echo Main Tree and Focus own independent runtime/render/camera state.
echo Chess and Xiangqi own independent client runtime; cross-game busy checks are server-owned.
echo Invitations expire authoritatively after 2 minutes.
echo ============================================================
echo.
if /I not "%~1"=="--no-pause" pause
exit /b 0

:fail
echo.
echo ============================================================
echo FAIL: P2.28 verification did not complete.
echo Read the first error above before starting Metro/build.
echo ============================================================
echo.
if /I not "%~1"=="--no-pause" pause
exit /b 1
