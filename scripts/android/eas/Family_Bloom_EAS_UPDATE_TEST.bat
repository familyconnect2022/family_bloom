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
rem R3R8: test safe chemistry before publishing OTA.
node scripts\tests\release\test-super-bloom-chemistry-safe-r3r8.cjs
if errorlevel 1 (
  echo [DUNG] Kiem thu Hoa hoc that bai. Khong publish OTA.
  pause
  exit /b 1
)
rem R3R9: kiem tra nhap sau phan so va xem truoc.
node scripts\tests\release\test-super-bloom-inline-chemical-follow-r3r9.cjs
if errorlevel 1 (
  echo [DUNG] Kiem thu chen them cong thuc that bai. Khong publish OTA.
  pause
  exit /b 1
)
rem R3R10: bai giai co doan chu, cong thuc, ⇒/⇔ tren cung Firestore blocks.
node scripts\tests\release\test-super-bloom-solution-blocks-r3r10.cjs
if errorlevel 1 (
  echo [DUNG] Kiem thu bai giai co cau truc that bai. Khong publish OTA.
  pause
  exit /b 1
)
rem R3R11: mathematical limit/matrix/radical/vector regression.
node scripts\tests\release\test-super-bloom-math-typesetting-r3r11.cjs
if errorlevel 1 (
  echo [DUNG] Loi bo cuc cong thuc. Khong publish OTA.
  pause
  exit /b 1
)
rem R3R12: letter, case-sensitive family introduction and joined square-root.
rem R3R14: ensure letter animation and assets before OTA.
node scripts\tests\release\test-r3r14-welcome-envelope-motion.cjs
if errorlevel 1 (
  echo [DUNG] Kiem thu Thu Ngo R3R14 that bai. Khong publish OTA.
  pause
  exit /b 1
)
rem R3R14R1: dependency-free Android touch layer guard.
node scripts\tests\release\test-r3r14r1-welcome-touch-static.cjs
if errorlevel 1 (
  echo [DUNG] Thu Ngo khong nhan cham. Khong publish OTA.
  pause
  exit /b 1
)
node scripts\tests\release\test-r3r12-family-intro-letter-radical.cjs
if errorlevel 1 (
  echo [DUNG] Kiem thu R3R12 that bai. Khong publish OTA.
  pause
  exit /b 1
)
rem R3R13: verify remote feature gate, Firebase auth and deploy helper before OTA.
node scripts\tests\release\test-r3r13-blaze-ready.cjs
if errorlevel 1 (
  echo [DUNG] Kiem tra Blaze/FCM that bai. Khong publish OTA.
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
