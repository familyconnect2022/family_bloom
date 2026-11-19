@echo off
rem ARCHIVED LEGACY TOOL: not for current R11R4R2+; use the two root build launchers.
setlocal EnableExtensions
set "FB_BAT=%~dp0Family_Bloom_AUTO_UPDATE_FULL.bat"
if not exist "%FB_BAT%" (
  echo [ERROR] Missing auto update BAT in extracted FULL CODE folder.
  pause
  exit /b 1
)
call "%FB_BAT%" %*
exit /b %errorlevel%
