@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo Family Bloom P2.28 - BUILD APK AND COPY TO SHARE
echo Standalone Release APK; no Android phone is required.
echo Default: C:\FamilyBloomShare\apk\Family_Bloom_LATEST.apk
echo ============================================================
echo.
call "%~dp0scripts\android\Family_Bloom_Android_Release_Build_APK_And_Share.bat"
exit /b %ERRORLEVEL%
