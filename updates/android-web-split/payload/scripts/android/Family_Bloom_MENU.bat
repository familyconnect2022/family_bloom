@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
for %%I in ("%~dp0..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%" || exit /b 1
:menu
cls
echo.
echo ========================================================================
echo FAMILY BLOOM - ANDROID + FIREBASE + EAS
echo Project: %PROJECT_ROOT%
echo ========================================================================
echo.
echo [1] AUTO UPDATE - Sao luu va cap nhat FULL CODE an toan
echo [2] APK BUILD ^& SHARE - Build Android Release APK
echo [3] ANDROID USB TEST - Chay Expo tren dien thoai
echo [4] IOS TEST (Mac) - Huong dan native iOS
echo [5] EAS BUILD - Build APK tren cloud
echo [6] EAS OTA UPDATE - Cap nhat JS/assets
echo [7] VERIFY SOURCE - Kiem tra ma nguon Android
echo [8] CLEAN APPLY - Kiem tra/kiem thu Android
echo [A] FIREBASE ANDROID - Kiem tra cau hinh
echo [B] FIRESTORE RULES - Deploy co xac nhan
echo [C] FIRESTORE INDEX - Deploy co xac nhan
echo [D] RULES + INDEXES - Deploy co xac nhan
echo [E] FIREBASE BLAZE - Functions/FCM khi cho phep
echo [F] INSTALL + DOCTOR
echo [G] SYNC DEPENDENCY
echo [H] METRO ONLY - Android
echo [I] INSTALL APK USB
echo [J] VERIFY APK
echo [K] RENDER INFO - Server Chess/Xiangqi rieng
echo [L] CLEAN GENERATED JS
echo [0] THOAT
echo ========================================================================
choice /C 12345678ABCDEFGHIJKL0 /N /M "Chon muc [1-8, A-L, 0]: "
if errorlevel 21 exit /b 0
if errorlevel 20 goto :cleanup
if errorlevel 19 goto :server
if errorlevel 18 goto :binary
if errorlevel 17 goto :install
if errorlevel 16 goto :metro
if errorlevel 15 goto :sync
if errorlevel 14 goto :doctor
if errorlevel 13 goto :blaze
if errorlevel 12 goto :firestore
if errorlevel 11 goto :indexes
if errorlevel 10 goto :rules
if errorlevel 9 goto :firebase
if errorlevel 8 goto :apply
if errorlevel 7 goto :verify
if errorlevel 6 goto :ota
if errorlevel 5 goto :eas
if errorlevel 4 goto :ios
if errorlevel 3 goto :android
if errorlevel 2 goto :build
if errorlevel 1 goto :update
goto :menu

:update
goto :menu

:update
echo [DANG CHAY] 1: AUTO UPDATE
call "%PROJECT_ROOT%\scripts\android\maintenance\Family_Bloom_AUTO_UPDATE_FULL.bat"
set "LAST_RC=%ERRORLEVEL%"
goto :endaction

:build
echo [DANG CHAY] 2: APK BUILD ^& SHARE
call "%PROJECT_ROOT%\scripts\android\build\Family_Bloom_BUILD_APK_TO_SHARE.bat"
set "LAST_RC=%ERRORLEVEL%"
goto :endaction

:android
echo [DANG CHAY] 3: ANDROID USB TEST
call "%PROJECT_ROOT%\scripts\android\build\Family_Bloom_Android_RUN_TEST.bat"
set "LAST_RC=%ERRORLEVEL%"
goto :endaction

:ios
echo [DANG CHAY] 4: IOS TEST (Mac)
call "%PROJECT_ROOT%\scripts\android\build\Family_Bloom_IOS_RUN_TEST.bat"
set "LAST_RC=%ERRORLEVEL%"
goto :endaction

:eas
echo [DANG CHAY] 6: EAS BUILD
call "%PROJECT_ROOT%\scripts\android\eas\Family_Bloom_EAS_BUILD_TEST.bat"
set "LAST_RC=%ERRORLEVEL%"
goto :endaction

:ota
echo [DANG CHAY] 7: EAS OTA UPDATE
call "%PROJECT_ROOT%\scripts\android\eas\Family_Bloom_EAS_UPDATE_TEST.bat"
set "LAST_RC=%ERRORLEVEL%"
goto :endaction

:verify
echo [DANG CHAY] 8: VERIFY SOURCE
call "%PROJECT_ROOT%\scripts\android\verify\Family_Bloom_VERIFY_FULL_SOURCE.bat"
set "LAST_RC=%ERRORLEVEL%"
goto :endaction

:apply
echo [DANG CHAY] 9: CLEAN APPLY
call "%PROJECT_ROOT%\scripts\android\maintenance\Family_Bloom_CLEAN_APPLY_FULL.bat"
set "LAST_RC=%ERRORLEVEL%"
goto :endaction

:firebase
echo [DANG CHAY] A: FIREBASE ANDROID
node "%PROJECT_ROOT%\scripts\android\build\firebase-android-config.cjs" diagnose "%PROJECT_ROOT%"
set "LAST_RC=%ERRORLEVEL%"
goto :endaction

:rules
echo [DANG CHAY] B: FIRESTORE RULES
call "%PROJECT_ROOT%\scripts\firebase\Family_Bloom_Deploy_Firestore_Rules.bat"
set "LAST_RC=%ERRORLEVEL%"
goto :endaction

:indexes
echo [DANG CHAY] C: FIRESTORE INDEX
call "%PROJECT_ROOT%\scripts\firebase\Family_Bloom_Deploy_Firestore_Indexes.bat"
set "LAST_RC=%ERRORLEVEL%"
goto :endaction

:firestore
echo [DANG CHAY] D: RULES + INDEXES
call "%PROJECT_ROOT%\scripts\firebase\Family_Bloom_Deploy_Phase_14C_Firestore.bat"
set "LAST_RC=%ERRORLEVEL%"
goto :endaction

:blaze
echo [DANG CHAY] E: FIREBASE BLAZE
call "%PROJECT_ROOT%\scripts\firebase\Family_Bloom_BLAZE_SETUP_ONCE.bat"
set "LAST_RC=%ERRORLEVEL%"
goto :endaction

:doctor
echo [DANG CHAY] F: INSTALL + DOCTOR
call "%PROJECT_ROOT%\scripts\setup\Family_Bloom_Install_And_Doctor.bat"
set "LAST_RC=%ERRORLEVEL%"
goto :endaction

:sync
echo [DANG CHAY] G: SYNC DEPENDENCY
call "%PROJECT_ROOT%\scripts\setup\Family_Bloom_Sync_Dependencies.bat"
set "LAST_RC=%ERRORLEVEL%"
goto :endaction

:metro
echo [DANG CHAY] H: METRO ONLY
call "%PROJECT_ROOT%\scripts\android\dev\Family_Bloom_Android_Metro_Only.bat"
set "LAST_RC=%ERRORLEVEL%"
goto :endaction

:install
echo [DANG CHAY] I: INSTALL APK USB
call "%PROJECT_ROOT%\scripts\android\install\Family_Bloom_Android_Install_Last_APK.bat"
set "LAST_RC=%ERRORLEVEL%"
goto :endaction

:binary
echo [DANG CHAY] J: VERIFY APK
call "%PROJECT_ROOT%\scripts\android\verify\Family_Bloom_VERIFY_DEVICE_BINARY_R2C.bat"
set "LAST_RC=%ERRORLEVEL%"
goto :endaction

:server
echo [DANG CHAY] K: RENDER TYPECHECK
call "%PROJECT_ROOT%\scripts\android\maintenance\Family_Bloom_VERIFY_SERVER_TYPES.bat"
set "LAST_RC=%ERRORLEVEL%"
goto :endaction

:cleanup
echo [DANG CHAY] N: CLEAN GENERATED JS
call "%PROJECT_ROOT%\scripts\maintenance\Family_Bloom_Cleanup_Generated_JS.bat"
set "LAST_RC=%ERRORLEVEL%"
goto :endaction

:endaction
echo.
if not "%LAST_RC%"=="0" (
  echo [LOI] Muc vua chay khong thanh cong. Exit code: %LAST_RC%
) else (
  echo [HOAN THANH] Muc da chay xong.
 )
echo.
pause
goto :menu
