@echo off
setlocal
chcp 65001 >nul
for %%I in ("%~dp0..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"
echo.
echo FAMILY BLOOM - CLEAN RELEASE APK BUILD
echo This regenerates the Android native project before building.
echo Use this after app.json, Expo plugins, RNFirebase, notifications,
echo or another native dependency has changed.
echo.
call "%~dp0Family_Bloom_Android_Test_App_RELEASE.bat" --clean
exit /b %ERRORLEVEL%
