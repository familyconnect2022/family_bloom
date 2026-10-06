@echo off
setlocal
chcp 65001 >nul
for %%I in ("%~dp0..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"
title Family Bloom - Deploy Cloud Functions
set "PROJECT_ID=family-connect-4184f"
echo.
echo ============================================
echo   FAMILY BLOOM - DEPLOY CLOUD FUNCTIONS
echo ============================================
echo Project: %PROJECT_ID%
echo Root   : %PROJECT_ROOT%
echo.
where firebase >nul 2>&1
if errorlevel 1 (echo [LOI] Khong tim thay Firebase CLI. & pause & exit /b 1)
where npm >nul 2>&1
if errorlevel 1 (echo [LOI] Khong tim thay npm/Node.js. & pause & exit /b 1)
if not exist "firebase.json" (echo [LOI] Khong tim thay firebase.json & pause & exit /b 1)
if not exist "functions\package.json" (echo [LOI] Khong tim thay functions\package.json & pause & exit /b 1)
if not exist "functions\node_modules" (
  pushd functions
  call npm install
  if errorlevel 1 (popd & echo [LOI] npm install trong functions that bai. & pause & exit /b 1)
  popd
)
firebase deploy --only functions --project %PROJECT_ID%
if errorlevel 1 (echo [THAT BAI] Deploy Functions khong thanh cong. & pause & exit /b 1)
echo [OK] CLOUD FUNCTIONS DA DEPLOY THANH CONG
pause
exit /b 0
