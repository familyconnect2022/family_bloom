@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
for %%I in ("%~dp0..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"
:menu
echo.
echo ====================================================
echo FAMILY BLOOM - TRINH DON CONG CU
 echo Project: %PROJECT_ROOT%
echo ====================================================
echo [1] Cap nhat FULL CODE vao project cu (co sao luu)
echo [2] Build APK Release va chia se
 echo [3] Kiem tra cau hinh Firebase Android
echo [4] Kiem tra cau truc va kiem thu tien phat hanh
echo [5] EAS Build TEST
echo [6] EAS OTA TEST
echo [7] CLEAN APPLY (sau cap nhat)
echo [8] Thiet lap Cloud Functions + FCM sau khi len Blaze
echo [0] Thoat
choice /C 123456780 /N /M "Chon so: "
if errorlevel 9 exit /b 0
if errorlevel 8 goto :blaze
if errorlevel 7 goto :apply
if errorlevel 6 goto :ota
if errorlevel 5 goto :eas
if errorlevel 4 goto :verify
if errorlevel 3 goto :firebase
if errorlevel 2 goto :build
if errorlevel 1 goto :update
exit /b 1
:update
call "%PROJECT_ROOT%\scripts\android\maintenance\Family_Bloom_AUTO_UPDATE_FULL.bat"
goto :endaction
:build
call "%PROJECT_ROOT%\scripts\android\build\Family_Bloom_BUILD_APK_TO_SHARE.bat"
goto :endaction
:firebase
node "%PROJECT_ROOT%\scripts\android\build\firebase-android-config.cjs" diagnose "%PROJECT_ROOT%"
goto :endaction
:verify
node "%PROJECT_ROOT%\scripts\maintenance\check-project-structure.js"
if errorlevel 1 goto :endaction
node "%PROJECT_ROOT%\scripts\tests\release\test-h25-source-package.cjs"
goto :endaction
:eas
call "%PROJECT_ROOT%\scripts\android\eas\Family_Bloom_EAS_BUILD_TEST.bat"
goto :endaction
:ota
call "%PROJECT_ROOT%\scripts\android\eas\Family_Bloom_EAS_UPDATE_TEST.bat"
goto :endaction
:blaze
call "%PROJECT_ROOT%\scripts\firebase\Family_Bloom_BLAZE_SETUP_ONCE.bat"
goto :endaction
:apply
call "%PROJECT_ROOT%\scripts\android\maintenance\Family_Bloom_CLEAN_APPLY_FULL.bat"
:endaction
echo.
pause
goto :menu
