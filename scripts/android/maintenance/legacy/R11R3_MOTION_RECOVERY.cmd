@echo off
rem ARCHIVED LEGACY TOOL: not for current R11R4R2+; use the two root build launchers.
for %%I in ("%~dp0..\..\..\..") do set "FB_LEGACY_ROOT=%%~fI"
setlocal DisableDelayedExpansion
cd /d "%FB_LEGACY_ROOT%"
set "FB_TARGET=%~1"
if not defined FB_TARGET (
  echo Family Bloom R11R3 - RECOVERY (no repeating folder picker)
  echo Enter the path to your INSTALLED R11/R11R2 Family_Bloom project.
  set /p "FB_TARGET=Project path: "
)
if not defined FB_TARGET (
  echo [STOP] No project path.
  pause
  exit /b 1
)
node "%FB_LEGACY_ROOT%\scripts\maintenance\fb-r11r3-recovery.cjs" check "%FB_TARGET%"
if errorlevel 1 (
  echo [SAFE] No project files were changed.
  pause
  exit /b 1
)
choice /c YN /m "CHECK PASS. Backup and install R11R3?"
if errorlevel 2 exit /b 0
node "%FB_LEGACY_ROOT%\scripts\maintenance\fb-r11r3-recovery.cjs" install "%FB_TARGET%"
if errorlevel 1 (
  echo [STOP] Install failed; see message above.
  pause
  exit /b 1
)
echo [PASS] R11R3 source updated. Build your APK Release.
pause
endlocal
