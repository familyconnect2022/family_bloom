@echo off
setlocal EnableExtensions
chcp 65001 >nul
for %%I in ("%~dp0..\..\..") do set "PROJECT_ROOT=%%~fI"
if not exist "%PROJECT_ROOT%\server\package.json" (
  echo [FAIL] Family Bloom server/package.json is missing.
  exit /b 1
)
pushd "%PROJECT_ROOT%\server"
if errorlevel 1 exit /b 1
echo [H21R6] Checking Chess server TypeScript before deployment/APK release...
if not exist "node_modules\typescript\package.json" (
  echo [INFO] Server build tools missing. Installing server dependencies...
  call npm install --include=dev --no-audit --no-fund
  if errorlevel 1 goto :fail
)
call npm run typecheck
if errorlevel 1 (
  echo [FAIL] Server typecheck failed. Fix errors before Build ^& Share or Render deploy.
  goto :fail
)
echo [PASS] Server TypeScript gate.
popd
exit /b 0
:fail
popd
exit /b 1
