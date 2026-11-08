@echo off
rem ARCHIVED LEGACY TOOL: not for current R11R4R2+; use the two root build launchers.
for %%I in ("%~dp0..\..\..\..") do set "FB_LEGACY_ROOT=%%~fI"
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
cd /d "%FB_LEGACY_ROOT%"
title Family Bloom R11R2 to R11R4R1 - Direct Safe Update
where node >nul 2>nul
if errorlevel 1 (echo [STOP] Node.js not found.& pause& exit /b 1)
set "FB_PROJECT=D:\Family Bloom App + Server\Family_Bloom"
if not exist "%FB_PROJECT%\package.json" (
  echo Enter installed Family Bloom project path ONCE:
  set /p "FB_PROJECT=Project: "
)
echo.
echo [STEP 1] Checking "%FB_PROJECT%"
node "%FB_LEGACY_ROOT%\R11R2_TO_R11R4R1.cjs" check "%FB_PROJECT%"
if errorlevel 1 (echo [STOP] Check failed. No files written.& pause& exit /b 1)
echo.
choice /C YN /N /M "Update source now? [Y/N]: "
if errorlevel 2 exit /b 0
echo.
echo [STEP 2] Backing up, installing and verifying...
node "%FB_LEGACY_ROOT%\R11R2_TO_R11R4R1.cjs" install "%FB_PROJECT%"
if errorlevel 1 (echo [STOP] Update failed. Check logs before building.& pause& exit /b 1)
echo.
echo [INSTALL PASS] Build APK only from installed Family_Bloom project.
pause
exit /b 0
