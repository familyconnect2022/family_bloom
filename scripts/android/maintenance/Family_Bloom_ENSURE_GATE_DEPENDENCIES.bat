@echo off
setlocal EnableExtensions DisableDelayedExpansion
for %%I in ("%~dp0..\..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"
if errorlevel 1 goto :fail
where node >nul 2>nul
if errorlevel 1 (
  echo [FAIL] Node.js not found in PATH.
  goto :fail
)
where npm >nul 2>nul
if errorlevel 1 (
  echo [FAIL] npm not found in PATH.
  goto :fail
)
if not exist "package.json" (
  echo [FAIL] Family Bloom package.json not found in "%PROJECT_ROOT%".
  goto :fail
)
rem H23R3: The Xiangqi parity and dual-app regression tests load the
rem TypeScript compiler. FULL source ZIPs deliberately exclude node_modules.
rem This must run BEFORE any JS gate that requires TypeScript.
node -e "require.resolve('typescript')" >nul 2>nul
if not errorlevel 1 goto :ready
echo [H23R3] TypeScript is not installed in the project.
echo [H23R3] Installing root dependencies including devDependencies BEFORE tests...
call npm install --include=dev --no-audit --no-fund
if errorlevel 1 (
  echo [FAIL] npm install failed. Check your network and npm logs.
  goto :fail
)
node -e "require.resolve('typescript')" >nul 2>nul
if errorlevel 1 (
  echo [FAIL] TypeScript is still unavailable after npm install.
  goto :fail
)
:ready
echo [PASS] Root TypeScript is resolvable; release gates may run.
exit /b 0
:fail
echo [FAIL] Build prerequisites incomplete. APK compilation NOT started.
exit /b 1
