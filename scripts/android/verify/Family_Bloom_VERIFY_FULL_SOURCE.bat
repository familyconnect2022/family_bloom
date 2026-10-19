@echo off
setlocal EnableExtensions
chcp 65001 >nul
for %%I in ("%~dp0..\..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"

echo ============================================================
echo Family Bloom P2.37R2C-H13 - VERIFY FULL SOURCE BEFORE METRO / BUILD
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH.
  goto :fail
)

for %%F in (
  "src\components\games\BoardGamePresentationRoot.tsx"
  "src\components\games\BoardGamePresentationRoot.android.tsx"
  "src\services\games\boardGameNativeOverlay.ts"
  "src\services\chess\chessSocketService.ts"
  "src\services\xiangqi\xiangqiSocketService.ts"
  "src\services\xiangqi\xiangqiLocalRules.ts"
  "modules\family-bloom-overlay\index.ts"
  "modules\family-bloom-overlay\expo-module.config.json"
  "modules\family-bloom-overlay\android\src\main\java\expo\modules\familybloomoverlay\FamilyBloomOverlayModule.kt"
) do (
  if not exist "%%~F" (
    echo [FAIL] Missing %%~F
    goto :fail
  ) else (
    echo [PASS] %%~F
  )
)

echo.
node scripts\test-h22r2-cleanup-retention.cjs --quick
if errorlevel 1 goto :fail

echo [1/4] Source/import graph...
node scripts\setup\check-source-import-integrity.js
if errorlevel 1 goto :fail

echo.
echo [2/4] P2.37R2C-H13 FULL copy/native integrity...
node scripts\test-phase-p2_37r2-full-copy-integrity.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c-binary-identity-lock.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c_h6-decor-rail-isolation.js
if errorlevel 1 exit /b 1
node scripts\test-phase-p2_37r2c_h7-tab-navigator-flex-layout.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c_h8-native-chess-tap-move.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c_h9a-mini-lifecycle-performance.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c_h12-chess-safe-turns-results.js
if errorlevel 1 goto :fail
node scripts\test-phase-p2_37r2c_h13-bloom-results-return.js
if errorlevel 1 goto :fail

echo.
echo [3/4] TS/TSX syntax...
if exist "node_modules\typescript\package.json" (
  node scripts\setup\check-ts-syntax-transpile.js
  if errorlevel 1 goto :fail
) else (
  echo [INFO] node_modules\typescript missing - syntax transpile will run during CLEAN APPLY after npm install.
)

echo.
echo [4/4] Project/build entrypoints...
node scripts\maintenance\check-project-structure.js
if errorlevel 1 goto :fail
node scripts\setup\check-build-entrypoints.js
if errorlevel 1 goto :fail

echo.
echo ============================================================
echo PASS: P2.37R2C-H13 FULL source is complete for Metro/build.
echo For native APK proof, run CLEAN APPLY then EAS/Android build.
echo ============================================================
exit /b 0

:fail
echo.
echo ============================================================
echo FAIL: FULL source verification stopped. Do NOT start Metro/build yet.
echo ============================================================
exit /b 1
