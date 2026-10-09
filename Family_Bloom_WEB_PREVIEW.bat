@echo off
setlocal EnableExtensions
cd /d "%~dp0"
chcp 65001 >nul

echo ========================================================
echo Family Bloom Web Parity W2 - Local Preview
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

echo.
echo Opening Family Bloom Web...
call npx expo start --web -c
exit /b %errorlevel%

:fail
echo.
echo Web preview could not start. Fix the error above first.
pause
exit /b 1
