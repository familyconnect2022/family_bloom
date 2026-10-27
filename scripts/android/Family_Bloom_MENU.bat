@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
for %%I in ("%~dp0..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%" || exit /b 1
:menu
cls
echo.
echo ========================================================================
echo FAMILY BLOOM - MENU TONG (ANDROID + FIREBASE + WEB + EAS)
echo Project: %PROJECT_ROOT%
echo ========================================================================
echo.
echo === 1-9: CAP NHAT, BUILD, TEST VA KIEM TRA ===
echo [1] AUTO UPDATE - Sao luu + cap nhat FULL CODE vao project cu; tu dung neu gate loi
echo [2] APK BUILD ^& SHARE - Build Release APK; KHONG can cap USB, co buoc kiem tra gate
echo [3] ANDROID USB TEST - npx expo run:android; can Android SDK va dien thoai/emulator
echo [4] IOS TEST (Mac) - Chi huong dan macOS + Xcode; Windows KHONG the build iOS
echo [5] WEB EXPO TEST - npx expo start --web; chi thu nghiem giao dien web
echo [6] EAS BUILD - Build APK qua EAS cloud (khong chay Gradle local)
echo [7] EAS OTA UPDATE - Cap nhat JS/assets; KHONG thay doi native APK
echo [8] VERIFY SOURCE - Kiem tra source, gates va nhan dien; khong build APK
echo [9] CLEAN APPLY - Don caches an toan + chay kiem tra/kiem thu local
echo.
echo === A-E: FIREBASE (CAC MUC DEPLOY CO THE THAY DOI DU LIEU) ===
echo [A] FIREBASE ANDROID - Kiem tra google-services.json, KHONG deploy du lieu
echo [B] FIRESTORE RULES - DEPLOY! Cap nhat Firestore Rules; xac nhan project truoc khi chay
echo [C] FIRESTORE INDEX - DEPLOY! Cap nhat Firestore indexes; xac nhan project
echo [D] RULES + INDEXES - DEPLOY! Dong thoi Rules + Indexes; chi khi muon ca hai
echo [E] FIREBASE BLAZE - Functions/FCM setup sau khi nang Blaze; yeu cau nhap DEPLOY
echo.
echo === F-N: CAI DAT, THIET BI VA CONG CU BO SUNG ===
echo [F] INSTALL + DOCTOR - Cai dependencies + kiem tra Expo SDK va cau hinh
echo [G] SYNC DEPENDENCY - Dong bo npm dependencies; khong build APK
echo [H] METRO ONLY - Mo Metro cho debug/dev client da cai tren Android
echo [I] INSTALL APK USB - Cai APK Release da build len dien thoai qua adb
echo [J] VERIFY APK - Doi chieu binary identity cua APK tren thiet bi
echo [K] RENDER TYPECHECK - Kiem tra TypeScript server Chess/Xiangqi; khong deploy
echo [L] WEB EXPORT - Xuat web tinh; KHONG deploy Vercel Media API
echo [M] WEB LOCAL PREVIEW - Preview web export/build; khac Expo dev server
echo [N] CLEAN GENERATED JS - Don file JS sinh ra khong dung, tranh xung dot Expo routes
echo.
echo [0] THOAT - Khong thay doi du an
echo ========================================================================
choice /C 123456789ABCDEFGHIJKLMN0 /N /M "Chon muc [1-9, A-N, 0]: "
if errorlevel 24 exit /b 0
if errorlevel 23 goto :cleanup
if errorlevel 22 goto :webpreview
if errorlevel 21 goto :export
if errorlevel 20 goto :server
if errorlevel 19 goto :binary
if errorlevel 18 goto :install
if errorlevel 17 goto :metro
if errorlevel 16 goto :sync
if errorlevel 15 goto :doctor
if errorlevel 14 goto :blaze
if errorlevel 13 goto :firestore
if errorlevel 12 goto :indexes
if errorlevel 11 goto :rules
if errorlevel 10 goto :firebase
if errorlevel 9 goto :apply
if errorlevel 8 goto :verify
if errorlevel 7 goto :ota
if errorlevel 6 goto :eas
if errorlevel 5 goto :web
if errorlevel 4 goto :ios
if errorlevel 3 goto :android
if errorlevel 2 goto :build
if errorlevel 1 goto :update
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

:web
echo [DANG CHAY] 5: WEB EXPO TEST
call "%PROJECT_ROOT%\scripts\android\build\Family_Bloom_WEB_RUN_TEST.bat"
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

:export
echo [DANG CHAY] L: WEB EXPORT
call "%PROJECT_ROOT%\scripts\windows\web\Family_Bloom_WEB_EXPORT.bat"
set "LAST_RC=%ERRORLEVEL%"
goto :endaction

:webpreview
echo [DANG CHAY] M: WEB LOCAL PREVIEW
call "%PROJECT_ROOT%\scripts\windows\web\Family_Bloom_WEB_PREVIEW.bat"
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
