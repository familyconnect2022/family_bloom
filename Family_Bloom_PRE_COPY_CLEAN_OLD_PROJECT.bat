@echo off
setlocal EnableExtensions
cd /d "%~dp0"
if not exist "%~dp0scripts\android\maintenance\Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat" (
  echo [ERROR] Family Bloom FULL source files are incomplete: scripts\android\maintenance\Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat
  pause
  exit /b 1
)
call "%~dp0scripts\android\maintenance\Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat" %*
exit /b %errorlevel%
