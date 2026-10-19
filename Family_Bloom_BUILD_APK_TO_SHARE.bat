@echo off
setlocal EnableExtensions
cd /d "%~dp0"
if not exist "%~dp0scripts\android\build\Family_Bloom_Android_Release_Build_APK_And_Share.bat" (
  echo [ERROR] Family Bloom FULL source files are incomplete: scripts\android\build\Family_Bloom_Android_Release_Build_APK_And_Share.bat
  pause
  exit /b 1
)
call "%~dp0scripts\android\build\Family_Bloom_Android_Release_Build_APK_And_Share.bat" %*
exit /b %errorlevel%
