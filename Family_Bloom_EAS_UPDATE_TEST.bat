@echo off
setlocal EnableExtensions
cd /d "%~dp0"
if not exist "%~dp0scripts\android\eas\Family_Bloom_EAS_UPDATE_TEST.bat" (
  echo [ERROR] Family Bloom FULL source files are incomplete: scripts\android\eas\Family_Bloom_EAS_UPDATE_TEST.bat
  pause
  exit /b 1
)
call "%~dp0scripts\android\eas\Family_Bloom_EAS_UPDATE_TEST.bat" %*
exit /b %errorlevel%
