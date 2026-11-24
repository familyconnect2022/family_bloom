@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title Family Bloom - Node 3D R5 Spacing and Gender Safe Update

rem Always use the extracted FULL CODE directory as source.
for %%I in ("%~dp0.") do set "FB_SOURCE=%%~fI"
set "FB_SCRIPT=%FB_SOURCE%\scripts\maintenance\fb-node-3d-r5-safe-update.cjs"

if not exist "%FB_SCRIPT%" goto :missing_script
where node.exe >nul 2>nul
if errorlevel 1 goto :missing_node

set "FB_TARGET=%~1"
if not defined LOCALAPPDATA set "LOCALAPPDATA=%USERPROFILE%\AppData\Local"
if not defined FB_TARGET if exist "%LOCALAPPDATA%\FamilyBloom\updater\last-target.txt" (
  for /f "usebackq delims=" %%P in ("%LOCALAPPDATA%\FamilyBloom\updater\last-target.txt") do if not defined FB_TARGET set "FB_TARGET=%%P"
)

:verify_target
if not defined FB_TARGET goto :choose_target
node "%FB_SCRIPT%" check "%FB_TARGET%"
if not errorlevel 1 goto :ready

echo.
echo [STOP] Saved or selected target does not match a supported baseline.
echo [SAFE] Existing project has not been changed.
set "FB_TARGET="

:choose_target
echo.
echo ============================================================
echo SELECT THE EXISTING FAMILY BLOOM PROJECT FOLDER
echo Do not select the extracted FULL CODE folder.
echo ============================================================
set "FB_PICK_FILE=%TEMP%\FamilyBloomTarget_%RANDOM%_%RANDOM%.txt"
if exist "%FB_PICK_FILE%" del /q "%FB_PICK_FILE%" >nul 2>nul
where powershell.exe >nul 2>nul
if errorlevel 1 goto :manual_target
if not exist "%FB_SOURCE%\scripts\android\maintenance\Select-FamilyBloomProjectFolder.ps1" goto :manual_target
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File "%FB_SOURCE%\scripts\android\maintenance\Select-FamilyBloomProjectFolder.ps1" -OutputFile "%FB_PICK_FILE%"
if exist "%FB_PICK_FILE%" (
  for /f "usebackq delims=" %%P in ("%FB_PICK_FILE%") do if not defined FB_TARGET set "FB_TARGET=%%P"
  del /q "%FB_PICK_FILE%" >nul 2>nul
)
if defined FB_TARGET goto :verify_target

:manual_target
echo.
echo Enter the path to your existing app project, or Q to cancel.
echo Example: D:\Family Bloom App + Server\Family_Bloom
set /p "FB_TARGET=Existing project folder: "
if /I "%FB_TARGET%"=="Q" goto :cancel
if not defined FB_TARGET goto :cancel
goto :verify_target

:ready
echo.
echo ============================================================
echo FAMILY BLOOM NODE 3D R5 SPACING + GENDER - SAFE UPDATE
echo Source: "%FB_SOURCE%"
echo Target: "%FB_TARGET%"
echo ============================================================
echo Only verified files will be changed.
echo A project source backup is created before any writes.
echo.
choice /C YN /N /M "Backup and install now? [Y/N]: "
if errorlevel 2 goto :cancel
if not errorlevel 1 goto :failure
node "%FB_SCRIPT%" install "%FB_TARGET%"
if errorlevel 1 goto :failure
echo.
echo PASS: Family Bloom source updated successfully.
echo Build and test the Release APK separately.
pause
exit /b 0

:missing_script
echo [ERROR] Missing update script. Unzip the complete FULL CODE first.
goto :failure
:missing_node
echo [ERROR] Cannot find node.exe. Install Node.js or check PATH.
goto :failure
:cancel
echo Update cancelled. No modifications requested.
pause
exit /b 2
:failure
echo.
echo [FAILED] Update stopped. Do not build until the issue is resolved.
pause
exit /b 1
