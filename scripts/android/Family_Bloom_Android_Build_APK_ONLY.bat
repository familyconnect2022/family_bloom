@echo off
setlocal
chcp 65001 >nul
for %%I in ("%~dp0..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"
title Family Bloom - Build APK Only
echo.
echo FAMILY BLOOM - BUILD RELEASE APK ONLY
echo No USB phone is required. The APK will be exported to dist\android.
echo.
call "%~dp0Family_Bloom_Android_Test_App_RELEASE.bat" --apk-only
exit /b %ERRORLEVEL%
