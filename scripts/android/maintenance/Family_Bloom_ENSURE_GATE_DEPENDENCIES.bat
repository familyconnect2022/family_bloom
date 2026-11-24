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
rem R5R1: AvatarCropEditor + avatarAsyncSync introduced two native Expo modules.
rem Check them BEFORE running expensive tests or Gradle. A stale node_modules
rem directory must NEVER pass just because TypeScript is already installed.
set "NEED_INSTALL=0"
if not exist "node_modules\typescript\package.json" set "NEED_INSTALL=1"
if not exist "node_modules\expo-image-manipulator\package.json" set "NEED_INSTALL=1"
if not exist "node_modules\expo-file-system\package.json" set "NEED_INSTALL=1"
if not exist "node_modules\@expo-google-fonts\lora\package.json" set "NEED_INSTALL=1"
if "%NEED_INSTALL%"=="1" (
  echo [R5R1] Required avatar or TypeScript dependency is missing; installing...
  call npm install --include=dev --no-audit --no-fund
  if errorlevel 1 (
    echo [FAIL] npm install failed. Check network and npm logs.
    goto :fail
  )
)
node -e "for (const name of ['typescript','expo-image-manipulator','expo-file-system','@expo-google-fonts/lora']) { require.resolve(name + '/package.json'); }" >nul 2>nul
if errorlevel 1 (
  echo [FAIL] Required avatar/TypeScript package remains unresolved after npm install.
  goto :fail
)
:ready
echo [PASS] TypeScript and both avatar Expo modules are resolvable.
exit /b 0
:fail
echo [FAIL] Build prerequisites incomplete. APK compilation NOT started.
exit /b 1
