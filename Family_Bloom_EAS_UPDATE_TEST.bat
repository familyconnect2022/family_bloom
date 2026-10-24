@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Stable root launcher; maintenance and build logic stays under scripts\android.
set "FB_ROOT=%~dp0"
if not exist "%FB_ROOT%scripts\android\eas\Family_Bloom_EAS_UPDATE_TEST.bat" (
  echo [ERROR] Missing FULL CODE helper. Extract the complete ZIP.
  pause
  exit /b 1
)
call "%FB_ROOT%scripts\android\eas\Family_Bloom_EAS_UPDATE_TEST.bat" %*
exit /b %errorlevel%
