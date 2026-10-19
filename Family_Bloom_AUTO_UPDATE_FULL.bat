@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
if not exist "%~dp0scripts\android\maintenance\Family_Bloom_AUTO_UPDATE_FULL.bat" (
  echo [ERROR] Missing Family Bloom automatic updater. Extract the FULL ZIP first.
  pause
  exit /b 1
)
call "%~dp0scripts\android\maintenance\Family_Bloom_AUTO_UPDATE_FULL.bat" "%~1"
exit /b %errorlevel%
