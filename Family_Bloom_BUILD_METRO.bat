@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Family Bloom - Debug build / Metro
rem One Metro launcher in the project root; both real implementations live under scripts/android/dev.
echo.
echo ===========================================================
echo FAMILY BLOOM - DEBUG / METRO
echo ===========================================================
echo [1] Chay Metro (khi Debug APK da cai tren dien thoai)
echo [2] Build Debug APK, cai len dien thoai, va chay Metro
echo ===========================================================
choice /C 12 /N /M "Chon 1 hoac 2: "
if errorlevel 2 goto :build_debug
:metro
if not exist "%~dp0scripts\android\dev\Family_Bloom_Android_Metro_Only.bat" goto :missing
call "%~dp0scripts\android\dev\Family_Bloom_Android_Metro_Only.bat" %*
exit /b %errorlevel%
:build_debug
if not exist "%~dp0scripts\android\dev\Family_Bloom_Android_Debug_Build_And_Run.bat" goto :missing
call "%~dp0scripts\android\dev\Family_Bloom_Android_Debug_Build_And_Run.bat" %*
exit /b %errorlevel%
:missing
echo [ERROR] Missing Android Debug/Metro scripts. Extract FULL CODE again.
pause
exit /b 1
