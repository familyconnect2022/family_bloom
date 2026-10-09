@echo off
setlocal EnableExtensions
cd /d "%~dp0"
chcp 65001 >nul

echo ========================================================
echo Family Bloom Web Parity W2 - Static Export
echo ========================================================

where node >nul 2>nul || (
  echo [ERROR] Node.js was not found.
  pause
  exit /b 1
)
where npm >nul 2>nul || (
  echo [ERROR] npm was not found.
  pause
  exit /b 1
)

if not exist "node_modules\firebase\package.json" (
  echo Firebase Web SDK is missing. Running npm install...
  call npm install
  if errorlevel 1 goto :fail
)

node scripts\test-phase17_9w1-web-companion.js
if errorlevel 1 goto :fail
node scripts\test-phase17_9w2-web-parity.js
if errorlevel 1 goto :fail

if exist dist rmdir /s /q dist
call npx expo export --platform web
if errorlevel 1 goto :fail

echo.
echo PASS: static web build is in:
echo   %CD%\dist
pause
exit /b 0

:fail
echo.
echo Web export failed.
pause
exit /b 1
