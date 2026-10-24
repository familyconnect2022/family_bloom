@echo off
setlocal EnableExtensions
chcp 65001 >nul
for %%I in ("%~dp0..\..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"

echo ============================================================
echo FAMILY BLOOM P2.37R2C-H9B - INSTALL DEVELOPMENT CLIENT APK
echo Expected versionCode: 143042
echo ============================================================
echo.
where adb >nul 2>&1
if errorlevel 1 (
  echo [ERROR] adb not found in PATH.
  pause
  exit /b 1
)
set "APK=%~1"
if not defined APK (
  set /p "APK=Paste full path to the NEW R2C APK: "
)
if not exist "%APK%" (
  echo [ERROR] APK not found: %APK%
  pause
  exit /b 1
)
echo Installing: %APK%
adb install -r "%APK%"
if errorlevel 1 (
  echo [ERROR] adb install failed.
  pause
  exit /b 1
)
echo.
call "%PROJECT_ROOT%\scripts\android\verify\Family_Bloom_VERIFY_DEVICE_BINARY_R2C.bat"
exit /b %ERRORLEVEL%
