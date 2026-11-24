@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
rem Chuan hoa path Win32: khong truyen tham so ket thuc bang backslash vao Node.
rem Path "D:\folder\" trong dau ngoac kep co the bi parse sai boi runtime Windows.
for %%I in ("%~dp0..\..\..") do set "BUILD_SOURCE=%%~fI"
set "FB_CONFIG_TOOL=%BUILD_SOURCE%\scripts\android\build\firebase-android-config.cjs"
set "FB_ROUTER_TOOL=%BUILD_SOURCE%\scripts\android\build\resolve-build-target.cjs"
cd /d "%BUILD_SOURCE%"
if not exist "%BUILD_SOURCE%\scripts\android\build\Family_Bloom_Android_Release_Build_APK_And_Share.bat" (
  echo [LOI] Bo FULL CODE khong day du. Hay giai nen lai ZIP.
  goto :failed
)
where node >nul 2>nul
if errorlevel 1 (echo [LOI] Can cai Node.js truoc khi build.& goto :failed)

rem Quan trong: Neu file Firebase DA CO TAI THU MUC DANG CHAY, dung file do truoc.
node "%FB_CONFIG_TOOL%" check "%BUILD_SOURCE%" >nul 2>nul
if not errorlevel 1 goto :build_here
if exist "%BUILD_SOURCE%\google-services.json" (
  echo [DUNG] Cau hinh Firebase hien co nhung khong hop le. KHONG tu ghi de.
  node "%FB_CONFIG_TOOL%" diagnose "%BUILD_SOURCE%"
  goto :failed
)

rem FULL ZIP sach khong chua Google config ca nhan. Lay duong dan do Auto Update da luu.
set "FB_SAVED_STATE=%FB_STATE_DIR%"
if not defined FB_SAVED_STATE set "FB_SAVED_STATE=%LOCALAPPDATA%\FamilyBloom\updater"
if not defined LOCALAPPDATA if not defined FB_STATE_DIR set "FB_SAVED_STATE=%USERPROFILE%\AppData\Local\FamilyBloom\updater"
set "SAVED_TARGET_FILE=%FB_SAVED_STATE%\last-target.txt"
set "SAVED_TARGET="
if exist "%SAVED_TARGET_FILE%" (
  for /f "usebackq delims=" %%T in ("%SAVED_TARGET_FILE%") do if not defined SAVED_TARGET set "SAVED_TARGET=%%T"
)
if defined FB_BUILD_PROJECT set "SAVED_TARGET=%FB_BUILD_PROJECT%"
echo.
echo ============================================================
echo FAMILY BLOOM - KIEM TRA DUONG DAN BUILD
 echo Thu muc chay BAT: "%BUILD_SOURCE%"
 echo Duong dan Auto Update nho: "%SAVED_TARGET%"
echo ============================================================
node "%BUILD_SOURCE%\scripts\android\build\diagnose-build-location.cjs" "%BUILD_SOURCE%"
if not defined SAVED_TARGET goto :choose_target

:validate_target
set "SAVED_TARGET=%SAVED_TARGET:"=%"
rem Chuan hoa ca truong hop nguoi dung nhap duong dan co dau \ o cuoi.
for %%I in ("%SAVED_TARGET%\.") do set "SAVED_TARGET=%%~fI"
echo.
echo [KIEM TRA] Project SE BUILD: "%SAVED_TARGET%"
echo [KIEM TRA] Firebase JSON: "%SAVED_TARGET%\google-services.json"
node "%BUILD_SOURCE%\scripts\android\build\diagnose-build-location.cjs" "%SAVED_TARGET%"
rem Khi BAT nam trong chinh project da cap nhat ma file root bi thieu.
if /I "%BUILD_SOURCE%"=="%SAVED_TARGET%" goto :restore_here
node "%FB_ROUTER_TOOL%" redirect-source "%BUILD_SOURCE%" "%SAVED_TARGET%"
if errorlevel 1 (
  echo [DUNG] Project da luu khong khop ma nguon FULL hoac khong ton tai.
  echo [GOI Y] Hay chon lai THU MUC DA UPDATE thanh cong, khong chon ZIP moi.
  goto :choose_target
)
node "%FB_CONFIG_TOOL%" check "%SAVED_TARGET%" >nul 2>nul
if not errorlevel 1 goto :build_target
node "%FB_CONFIG_TOOL%" diagnose "%SAVED_TARGET%"
if exist "%SAVED_TARGET%\google-services.json" (
  echo [DUNG] File ton tai nhung sai/khong hop le. Khong duoc tu ghi de.
  goto :select_or_exit
)
echo.
echo [CHUA THAY TAI THU MUC NAY] Co the ban da update sang MOT thu muc khac.
choice /C SRC /N /M "[S] Chon lai project  [R] Khoi phuc JSON vao project nay  [C] Huy: "
if errorlevel 3 goto :failed
if errorlevel 2 goto :restore_target
goto :choose_target

:restore_here
 echo [THONG TIN] BAT dang chay ngay trong project duoc Auto Update ghi nho.
 echo [KIEM TRA] Tep JSON: "%BUILD_SOURCE%\google-services.json"
 node "%FB_CONFIG_TOOL%" diagnose "%BUILD_SOURCE%"
 call "%BUILD_SOURCE%\scripts\android\build\Family_Bloom_ENSURE_FIREBASE_ANDROID_CONFIG.bat" "%BUILD_SOURCE%"
 if errorlevel 1 goto :failed
 goto :build_here

:restore_target
call "%BUILD_SOURCE%\scripts\android\build\Family_Bloom_ENSURE_FIREBASE_ANDROID_CONFIG.bat" "%SAVED_TARGET%"
if errorlevel 1 goto :select_or_exit
node "%FB_CONFIG_TOOL%" check "%SAVED_TARGET%"
if errorlevel 1 goto :failed
goto :build_target

:select_or_exit
choice /C SC /N /M "[S] Chon thu muc project khac  [C] Huy: "
if errorlevel 2 goto :failed
goto :choose_target

:choose_target
set "SAVED_TARGET="
echo.
echo [CHON PROJECT] Thu muc phai la noi Auto Update DA CAP NHAT thanh cong.
echo [VI DU] D:\Project Family Bloom\Bloom\Family_bloom_V2
echo [LUU Y] BAT se KHONG ghi de cau hinh Firebase da ton tai.
set "FB_PICK_FILE=%TEMP%\FamilyBloomBuildTarget_%RANDOM%_%RANDOM%.txt"
if exist "%FB_PICK_FILE%" del /q "%FB_PICK_FILE%" >nul 2>nul
where powershell.exe >nul 2>nul
if errorlevel 1 goto :manual_target
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File "%BUILD_SOURCE%\scripts\android\maintenance\Select-FamilyBloomProjectFolder.ps1" -OutputFile "%FB_PICK_FILE%"
if exist "%FB_PICK_FILE%" (
  for /f "usebackq delims=" %%T in ("%FB_PICK_FILE%") do if not defined SAVED_TARGET set "SAVED_TARGET=%%T"
  del /q "%FB_PICK_FILE%" >nul 2>nul
)
if defined SAVED_TARGET goto :validate_target
:manual_target
set /p "SAVED_TARGET=Nhap duong dan project da cap nhat (Q de huy): "
if /I "%SAVED_TARGET%"=="Q" goto :failed
if not defined SAVED_TARGET goto :failed
goto :validate_target

:build_target
node "%FB_ROUTER_TOOL%" redirect "%BUILD_SOURCE%" "%SAVED_TARGET%"
if errorlevel 1 goto :failed
if not exist "%SAVED_TARGET%\scripts\android\build\Family_Bloom_BUILD_APK_TO_SHARE.bat" goto :failed
echo [PASS] Firebase config hop le trong project nay.
echo [XAC NHAN] Project SE BUILD: "%SAVED_TARGET%"
choice /C YN /N /M "Dung project nay de Build ^& Share? [Y/N]: "
if errorlevel 2 goto :choose_target
echo [BUILD TU] "%SAVED_TARGET%"
call "%SAVED_TARGET%\scripts\android\build\Family_Bloom_BUILD_APK_TO_SHARE.bat" %*
exit /b %errorlevel%

:build_here
node "%FB_CONFIG_TOOL%" check "%BUILD_SOURCE%"
if errorlevel 1 goto :failed
echo [PASS] Build tai project dang chay: "%BUILD_SOURCE%"
node "%BUILD_SOURCE%\scripts\android\build\diagnose-build-location.cjs" "%BUILD_SOURCE%"
call "%BUILD_SOURCE%\scripts\android\build\Family_Bloom_Android_Release_Build_APK_And_Share.bat" %*
exit /b %errorlevel%

:failed
echo.
echo [DUNG AN TOAN] Chua tao APK moi. Hay kiem tra duong dan project va cau hinh Google.
pause
exit /b 1
