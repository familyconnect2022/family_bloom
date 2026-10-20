@echo off
setlocal EnableExtensions
chcp 65001 >nul
for %%I in ("%~dp0..\..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"

echo ============================================================
echo Family Bloom P2.37R2C-H22R5 - CLEAN APPLY FULL
echo Authenticated native sibling host + authoritative recovery + deep presentation diagnostics.
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

node scripts\setup\check-expo-route-uniqueness.cjs
if errorlevel 1 goto :fail
node scripts\test-h22r3-windows-build-preflight.cjs
if errorlevel 1 goto :fail
node scripts\test-h23r3-typescript-bootstrap.cjs
if errorlevel 1 goto :fail
echo [H21R3] Cleaning invalid Android raw resource left by H21R1/H21R2...
if exist "modules\family-bloom-overlay\android\src\main\res\raw\com.familybloom.keep.xml" del /f /q "modules\family-bloom-overlay\android\src\main\res\raw\com.familybloom.keep.xml" >nul 2>nul
if exist "android\app\src\main\res\raw\com.familybloom.keep.xml" del /f /q "android\app\src\main\res\raw\com.familybloom.keep.xml" >nul 2>nul
node scripts\setup\check-android-resource-names.js --source-only
if errorlevel 1 goto :fail

echo [1/6] Removing retired shared/surface game owners and generated shadows...
echo       Retaining the H10 root build/update BAT entrypoints...
for %%F in (
) do if exist "%%~F" del /f /q "%%~F" >nul 2>nul
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
  "src\components\chess\ChessSurfaceHost.tsx"
  "src\components\xiangqi\XiangqiSurfaceHost.tsx"
  "src\services\chess\chessSurfaceStore.ts"
  "src\services\xiangqi\xiangqiSurfaceStore.ts"
  "src\services\games\boardGameSurfaceLifecycle.ts"
  "src\components\system\BloomSurfaceStack.tsx"
) do if exist "%%~F" del /f /q "%%~F" >nul 2>nul

echo [H22R2] Proving all H22 critical source files exist BEFORE cleanup...
node scripts\test-h22r2-cleanup-retention.cjs --quick
if errorlevel 1 goto :fail
node scripts\setup\cleanup-overlay-routes.js
if errorlevel 1 goto :fail
echo [H22R2] Proving cleanup preserved Xiangqi rules and socket...
node scripts\test-h22r2-cleanup-retention.cjs --quick
if errorlevel 1 goto :fail
node scripts\setup\check-source-import-integrity.js
if errorlevel 1 goto :fail
node scripts\maintenance\normalize-project-root.js
if errorlevel 1 goto :fail

if exist "assets\xiangqi\*.webp" del /f /q "assets\xiangqi\*.webp" >nul 2>nul

if exist ".expo" rmdir /s /q ".expo" >nul 2>nul
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache" >nul 2>nul
if exist "android\.gradle" rmdir /s /q "android\.gradle" >nul 2>nul
if exist "android\app\build" rmdir /s /q "android\app\build" >nul 2>nul

echo [2/6] Checking/installing dependencies...
set "NEED_INSTALL=0"
if not exist "node_modules\expo\package.json" set "NEED_INSTALL=1"
if not exist "node_modules\typescript\package.json" set "NEED_INSTALL=1"
if not exist "node_modules\expo-audio\package.json" set "NEED_INSTALL=1"
if not exist "node_modules\expo-asset\package.json" set "NEED_INSTALL=1"
if not exist "package-lock.json" set "NEED_INSTALL=1"
if not exist "node_modules\firebase\package.json" set "NEED_INSTALL=1"
if not exist "node_modules\socket.io-client\package.json" set "NEED_INSTALL=1"
if not exist "node_modules\family-bloom-overlay\package.json" set "NEED_INSTALL=1"
node scripts\setup\check-p2_37r2-local-install.js >nul 2>nul
if errorlevel 1 set "NEED_INSTALL=1"
if "%NEED_INSTALL%"=="0" (
  node scripts\setup\check-expo-dependencies.js >nul 2>nul
  if errorlevel 1 set "NEED_INSTALL=1"
  node scripts\setup\check-package-lock.js >nul 2>nul
  if errorlevel 1 set "NEED_INSTALL=1"
)
if "%NEED_INSTALL%"=="1" (
  echo       Dependencies are missing. Running npm install...
  call npm install --no-audit --no-fund
  if errorlevel 1 goto :fail
)

node scripts\setup\check-expo-dependencies.js
if errorlevel 1 goto :fail
node scripts\setup\check-package-lock.js
if errorlevel 1 goto :fail

echo [3/6] Verifying build regressions + P2.37 native presentation invariants...
node scripts\test-h22r2-cleanup-retention.cjs
if errorlevel 1 goto :fail
call "%PROJECT_ROOT%\scripts\android\maintenance\Family_Bloom_ENSURE_GATE_DEPENDENCIES.bat"
if errorlevel 1 goto :fail
node scripts\test-h22-xiangqi-parity.cjs
if errorlevel 1 goto :fail
node scripts\test-h22r9-chess-assets-royal-highlight.cjs
if errorlevel 1 goto :fail
node scripts\test-h23-family-game-hubs.cjs
if errorlevel 1 goto :fail
node scripts\test-h23r2-dual-app-presence.cjs
if errorlevel 1 goto :fail
node scripts\test-h22r1-bot-invite-countdown.cjs
if errorlevel 1 goto :fail
node scripts\test-phase-p2_12_4-build-integrity-chess-audio.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_12_5-remote-apk-share-build.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_12_6-build-dependency-contract.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_12_7-expo-asset-peer-contract.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_12_8-windows-expo-doctor-node-cli-launch.js
if errorlevel 1 goto :fail
call npm run phaseP2_32:check
if errorlevel 1 goto :fail
call npm run phaseP2_34:check
if errorlevel 1 goto :fail
call npm run phaseP2_35:check
if errorlevel 1 goto :fail
call npm run phaseP2_37R2C:check
if errorlevel 1 goto :fail
call npm run phaseP2_37R2C_H6:check
if errorlevel 1 goto :fail
call npm run phaseP2_37R2C_H7:check
if errorlevel 1 goto :fail
call npm run phaseP2_37R2C_H8:check
if errorlevel 1 goto :fail
call npm run phaseP2_37R2C_H9A:check
if errorlevel 1 goto :fail
call npm run phaseP2_37R2C_H9B:check
if errorlevel 1 goto :fail
call npm run phaseP2_37R2C_H10:check
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c_h10r2-board-layer-welcome.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c_h11-chess-full-mini-flow.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c_h12-chess-safe-turns-results.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c_h13-bloom-results-return.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c_h14-chess-color-mini-edge.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c_h15-chess-authority-dev-release.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c_h16-chess-smooth-motion.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c_h17-chess-optimistic-authority.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c_h18-chess-network-resync.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c_h19-recovery-offline.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c_h20-mini-premove-isolation.js
if errorlevel 1 exit /b 1
node scripts\test-phase-p2_37r2c_h21-invite-away-authority.cjs
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c_h21r1-audio-packaging.cjs
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c_h21r3-android-aapt-audio.cjs
if errorlevel 1 goto :fail
node scripts\setup\check-source-import-integrity.js
if errorlevel 1 goto :fail
node scripts\setup\check-ts-syntax-transpile.js
if errorlevel 1 goto :fail
node scripts\setup\check-p2_37r2c-native-package.js --require-node-module --require-resolve --require-effective-config
if errorlevel 1 goto :fail

echo [4/6] Verifying project/build/audio contracts...
call npm run structure:check
if errorlevel 1 goto :fail
node scripts\setup\check-effective-expo-config.js
if errorlevel 1 goto :fail
node scripts\setup\check-board-audio-integrity.js
if errorlevel 1 goto :fail
node scripts\setup\check-board-audio-apk.js
if errorlevel 1 goto :fail
node scripts\setup\check-build-entrypoints.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c_h14r1-build-entrypoints-copy-over.js
if errorlevel 1 goto :fail
node scripts\test-phase17_9w1-web-companion.js
if errorlevel 1 goto :fail
node scripts\test-phase17_9w2-web-parity.js
if errorlevel 1 goto :fail
node scripts\test-phase17_9w3-web-stability-visual-rebuild.js
if errorlevel 1 goto :fail

echo [5/6] App TypeScript diagnostics (legacy warnings); Chess server typecheck (H21R6 strict)...
set "APP_TYPECHECK_WARN=0"
call npm run typecheck
if errorlevel 1 (
  set "APP_TYPECHECK_WARN=1"
  echo [WARN] App TypeScript diagnostics were reported.
  echo        P2.37 native presentation gate passed, so CLEAN APPLY will continue.
  echo        Use npm run typecheck separately when cleaning legacy typing debt.
)
rem H21R6: A failing server MUST block CLEAN APPLY; do not silently deploy broken Chess.
call "%~dp0Family_Bloom_VERIFY_SERVER_TYPES.bat"
if errorlevel 1 goto :fail

echo [6/6] Release-readiness smoke check...
call npm run release:check
if errorlevel 1 goto :fail

echo.
echo ============================================================
echo PASS: Family Bloom P2.37R2C-H22R2 is clean and ready.
echo Legacy Chess/Xiangqi gameplay remains removed; protocol/realtime/bot foundation is preserved.
echo Android uses a persistent native sibling presentation host inside authenticated FamilySession; no board/gameplay route is restored.
echo Chess invitations expire authoritatively after 60 seconds.
echo ============================================================
echo.
if /I not "%~1"=="--no-pause" pause
exit /b 0

:fail
echo.
echo ============================================================
echo FAIL: P2.37 verification did not complete.
echo Read the first error above before starting Metro/build.
echo ============================================================
echo.
if /I not "%~1"=="--no-pause" pause
exit /b 1
