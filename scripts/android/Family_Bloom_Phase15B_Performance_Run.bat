@echo off
setlocal
chcp 65001 >nul
for %%I in ("%~dp0..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"
title Family Bloom - Phase 15B App-wide Performance

echo.
echo ============================================================
echo   FAMILY BLOOM - PHASE 15B APP-WIDE PERFORMANCE
echo   One launch: 29 real routes + 13 RAM-only stress steps
echo   Native Android PSS + gfxinfo are captured automatically.
echo ============================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Family_Bloom_Phase15B_Performance_Run.ps1"
set "RC=%ERRORLEVEL%"
echo.
if not "%RC%"=="0" echo Phase 15B runner ended with code %RC%. Read the report folder for details.
pause
exit /b %RC%
