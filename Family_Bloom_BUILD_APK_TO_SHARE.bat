@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Family Bloom - Build and Sign Release APK
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\android\build\Build-And-Sign.ps1" -ProjectRoot "%~dp0." %*
set "RESULT=%ERRORLEVEL%"
echo.
if "%RESULT%"=="0" (echo [OK] APK Release build va kiem tra chu ky hoan thanh.) else (echo [LOI] Build hoac ky APK that bai. Xem thong bao.)
pause
exit /b %RESULT%
