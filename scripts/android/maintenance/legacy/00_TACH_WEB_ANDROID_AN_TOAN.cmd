@echo off
rem ARCHIVED LEGACY TOOL: not for current R11R4R2+; use the two root build launchers.
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title Family Bloom R7 - TACH WEB KHOI ANDROID
for %%I in ("%~dp0..\..\..\..") do set "FB_RELEASE=%%~fI"
set "FB_TOOL=%FB_RELEASE%\updates\android-web-split\tools\apply.cjs"
if not exist "%FB_TOOL%" (
  echo [ERROR] Missing updater. Extract the entire ZIP first.
  goto :failed
)
where node.exe >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found in PATH.
  goto :failed
)
set "FB_TARGET=%~1"
if not defined FB_TARGET goto :pick
:verify
node "%FB_TOOL%" check "%FB_TARGET%"
if errorlevel 1 (
  echo [STOP] Selected project is not the verified Node R7 source.
  echo [SAFE] No files changed. Check unexpected local files before retrying.
  goto :failed
)
echo.
echo Verified source. This update backs up Web files and edits Android build helpers.
choice /C YN /N /M "Backup and REMOVE legacy Web from this Android project? [Y/N]: "
if errorlevel 2 goto :cancel
node "%FB_TOOL%" install "%FB_TARGET%"
if errorlevel 1 goto :failed
echo.
echo PASS: Web detached from Android. Build Release APK separately.
pause
exit /b 0
:pick
echo.
echo Select existing Family Bloom ANDROID PROJECT folder, NOT extracted update ZIP.
set "FB_SELECTION=%TEMP%\FamilyBloomSplit_%RANDOM%_%RANDOM%.txt"
where powershell.exe >nul 2>nul
if errorlevel 1 goto :manual
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Windows.Forms; $d=New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description='Select current Family Bloom Android source'; if($d.ShowDialog() -eq 'OK'){[System.IO.File]::WriteAllText('%FB_SELECTION%',$d.SelectedPath)}" >nul 2>nul
if exist "%FB_SELECTION%" (
  set /p FB_TARGET=<"%FB_SELECTION%"
  del /q "%FB_SELECTION%" >nul 2>nul
)
if defined FB_TARGET goto :verify
:manual
echo Enter existing Android project path (or Q to cancel).
echo Example: D:\Family Bloom App + Server\Family_Bloom
set /p "FB_TARGET=Project folder: "
if /I "%FB_TARGET%"=="Q" goto :cancel
if not defined FB_TARGET goto :cancel
goto :verify
:cancel
echo Update cancelled without changes.
pause
exit /b 2
:failed
echo.
echo No automatic forced overwrite. Read the error above.
pause
exit /b 1
