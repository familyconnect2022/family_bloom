@echo off
setlocal EnableExtensions
title Family Bloom - EAS OTA Update

for %%I in ("%~dp0..\..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"

echo ============================================================
echo  FAMILY BLOOM - EAS OTA UPDATE
echo  Channel: family-bloom-test
echo  Platform: Android
echo ============================================================
echo.

if not exist "eas.json" (
  echo [ERROR] Khong tim thay eas.json.
  echo BAT da duoc gom tai scripts\android\eas; PROJECT_ROOT duoc tu dong nhan dien.
  pause
  exit /b 1
)

findstr /I /C:"family-bloom-test" "eas.json" >nul 2>&1
if errorlevel 1 (
  echo [ERROR] eas.json chua co profile/channel family-bloom-test.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo [ERROR] Khong tim thay package.json.
  pause
  exit /b 1
)

echo [P2.37R2C-H12] LUU Y: H12 thay doi Kotlin Native Chess Full/Mini va clocks.
echo         OTA KHONG the nang cap ma Kotlin: PHAI build/cai APK H12 moi truoc.
echo         Hay cai it nhat mot ban P2.37R2C-H12 EAS/APK build co native decor rail truoc khi publish OTA P2.37R2C-H12+.
echo.
choice /C YN /N /M "May test da cai development-client binary P2.37R2C-H12 moi? [Y/N]: "
if errorlevel 2 (
  echo.
  echo [CANCEL] Hay build/cai P2.37R2C-H12 bang scripts\android\eas\Family_Bloom_EAS_BUILD_TEST.bat truoc.
  pause
  exit /b 1
)

findstr /I /C:"expo-updates" "package.json" >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Project chua co expo-updates.
  echo Can cau hinh OTA mot lan truoc khi dung file nay.
  pause
  exit /b 1
)

where eas >nul 2>&1
if errorlevel 1 (
  set "EAS_CMD=npx eas-cli@latest"
) else (
  set "EAS_CMD=eas"
)

echo.
set "UPDATE_MESSAGE="
set /p "UPDATE_MESSAGE=Nhap message cho ban OTA: "

if not defined UPDATE_MESSAGE (
  echo.
  echo [CANCEL] Message rong. Khong publish OTA.
  pause
  exit /b 1
)

echo.
echo Se publish:
echo   Channel : family-bloom-test
echo   Platform: android
echo   Message : %UPDATE_MESSAGE%
echo.
choice /C YN /N /M "Tiep tuc publish? [Y/N]: "
if errorlevel 2 (
  echo.
  echo [CANCEL] Da huy.
  pause
  exit /b 0
)

echo.
call %EAS_CMD% update --channel family-bloom-test --platform android --message "%UPDATE_MESSAGE%"
set "ERR=%ERRORLEVEL%"

echo.
if "%ERR%"=="0" (
  echo [OK] OTA update da publish thanh cong.
  echo Mo/thoat hoan toan Family Bloom tren dien thoai roi mo lai de nhan update.
) else (
  echo [ERROR] EAS Update that bai. Exit code: %ERR%
)

echo.
pause
exit /b %ERR%
