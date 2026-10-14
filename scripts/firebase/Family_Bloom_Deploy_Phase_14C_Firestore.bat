@echo off
setlocal
chcp 65001 >nul
for %%I in ("%~dp0..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"
title Family Bloom - Deploy Phase 14C Firestore
set "PROJECT_ID=family-connect-4184f"
echo.
echo ============================================
echo   FAMILY BLOOM - PHASE 14C FIRESTORE
echo ============================================
echo Project: %PROJECT_ID%
echo Root   : %PROJECT_ROOT%
echo.
where firebase >nul 2>&1
if errorlevel 1 (echo [LOI] Khong tim thay Firebase CLI. & pause & exit /b 1)
if not exist "firestore.rules" (echo [LOI] Khong tim thay firestore.rules & pause & exit /b 1)
if not exist "firestore.indexes.json" (echo [LOI] Khong tim thay firestore.indexes.json & pause & exit /b 1)
if not exist "firebase.json" (echo [LOI] Khong tim thay firebase.json & pause & exit /b 1)
firebase deploy --only firestore:rules,firestore:indexes --project %PROJECT_ID%
if errorlevel 1 (echo [THAT BAI] Deploy Firestore khong thanh cong. & pause & exit /b 1)
echo [OK] RULES + INDEXES DA GUI LEN FIREBASE.
pause
exit /b 0
