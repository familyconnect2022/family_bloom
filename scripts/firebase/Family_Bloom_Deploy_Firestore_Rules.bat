@echo off
setlocal
chcp 65001 >nul
for %%I in ("%~dp0..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"
title Family Bloom - Deploy Firestore Rules
set "PROJECT_ID=family-connect-4184f"
echo.
echo ============================================
echo   FAMILY BLOOM - DEPLOY FIRESTORE RULES
echo ============================================
echo Project: %PROJECT_ID%
echo Root   : %PROJECT_ROOT%
echo.
where firebase >nul 2>&1
if errorlevel 1 (
  echo [LOI] Khong tim thay Firebase CLI.
  echo Cai bang lenh: npm install -g firebase-tools
  pause
  exit /b 1
)
if not exist "firebase.json" (echo [LOI] Khong tim thay firebase.json & pause & exit /b 1)
if not exist "firestore.rules" (echo [LOI] Khong tim thay firestore.rules & pause & exit /b 1)
firebase deploy --only firestore:rules --project %PROJECT_ID%
if errorlevel 1 (
  echo [THAT BAI] Deploy rules khong thanh cong.
  echo Thu: firebase login --reauth
  pause
  exit /b 1
)
echo [OK] FIRESTORE RULES DA DEPLOY THANH CONG
pause
exit /b 0
