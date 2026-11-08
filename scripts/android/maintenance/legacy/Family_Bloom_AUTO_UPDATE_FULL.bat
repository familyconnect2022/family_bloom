@echo off
rem ARCHIVED legacy R11 updater - not for R11R4R2 or later.
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title Family Bloom - HISTORICAL R11 MOTION UPDATER - NOT CURRENT
rem R11R1: never reopen folder picker automatically after an invalid selection.
rem The Node preflight explains exact SHA/path mismatch before any file is changed.
for %%I in ("%~dp0..\..\..\..") do set "FB_SOURCE=%%~fI"
set "FB_SCRIPT=%FB_SOURCE%\scripts\maintenance\fb-r11-motion-safe-update.cjs"
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
echo.
echo [CHECK] Checking project (NO FILES WILL BE CHANGED):
echo "%FB_TARGET%"
node "%FB_SCRIPT%" check "%FB_TARGET%"
if not errorlevel 1 goto :ready
echo.
echo [STOP] The selected project did not pass preflight. See the reason ABOVE.
echo [SAFE] No project files were changed. R10 backup is still yours.
echo.
choice /C RQ /N /M "Choose another folder [R] or quit [Q]? "
if errorlevel 2 goto :cancel
set "FB_TARGET="
goto :choose_target

:choose_target
echo.
echo ============================================================
echo SELECT EXISTING FAMILY BLOOM R10 PROJECT (NOT R11 SOURCE)
echo A parent folder containing one project up to 2 levels deep is OK.
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
echo Type path to EXISTING R10 project (or Q to cancel).
echo Example: D:\Family Bloom App + Server\Family_Bloom
set /p "FB_TARGET=Project path: "
if /I "%FB_TARGET%"=="Q" goto :cancel
if not defined FB_TARGET goto :cancel
goto :verify_target

:ready
echo.
echo ============================================================
echo FAMILY BLOOM R11 MOTION - SAFE UPDATE - R11R1 PICKER FIX
echo Source: "%FB_SOURCE%"
echo Selected: "%FB_TARGET%"
echo ============================================================
echo [SAFE] SHA-verified R10 only. Backup before writing.
echo [SAFE] No Firebase, Render, Vercel or database changes.
echo.
choice /C YN /N /M "Backup and install now? [Y/N]: "
if errorlevel 2 goto :cancel
if not errorlevel 1 goto :failure
node "%FB_SCRIPT%" install "%FB_TARGET%"
if errorlevel 1 goto :failure
echo.
echo PASS: R11 Motion Lab updated. Build APK separately.
pause
exit /b 0

:missing_script
echo [ERROR] Missing R11 script. Extract FULL CODE ZIP before running this BAT.
goto :failure
:missing_node
echo [ERROR] node.exe not found. Check Node.js PATH.
goto :failure
:cancel
echo Cancelled. No changes requested.
pause
exit /b 2
:failure
echo.
echo [FAILED] Update stopped. Read the detailed [STOP] reason above.
pause
exit /b 1
