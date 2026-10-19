@echo off
setlocal EnableExtensions
cd /d "%~dp0"
if not exist "%~dp0scripts\android\maintenance\Family_Bloom_CLEAN_APPLY_FULL.bat" (
  echo [ERROR] Family Bloom FULL source files are incomplete: scripts\android\maintenance\Family_Bloom_CLEAN_APPLY_FULL.bat
  pause
  exit /b 1
)
call "%~dp0scripts\android\maintenance\Family_Bloom_CLEAN_APPLY_FULL.bat" %*
exit /b %errorlevel%
