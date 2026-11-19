@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
set "FB_PROJECT_DIR=%~1"
if not defined FB_PROJECT_DIR set "FB_PROJECT_DIR=%~dp0..\..\.."
for %%I in ("%FB_PROJECT_DIR%") do set "FB_PROJECT_DIR=%%~fI"
for %%I in ("%~dp0..\..\..") do set "FB_TOOL_ROOT=%%~fI"
where node >nul 2>nul
if errorlevel 1 (echo [LOI] Can cai Node.js truoc khi build.& exit /b 1)
node "%FB_TOOL_ROOT%\scripts\android\build\firebase-android-config.cjs" check "%FB_PROJECT_DIR%" >nul 2>nul
if not errorlevel 1 exit /b 0
if exist "%FB_PROJECT_DIR%\google-services.json" (
  echo [DUNG] google-services.json hien co khong hop le. Khong tu ghi de file cua ban.
  node "%FB_TOOL_ROOT%\scripts\android\build\firebase-android-config.cjs" diagnose "%FB_PROJECT_DIR%"
  exit /b 1
)
echo.
echo ========================================================
echo CAU HINH FIREBASE ANDROID CHUA CO TRONG PROJECT
 echo Du an: "%FB_PROJECT_DIR%"
echo ========================================================
echo Chu y: file google-services.json KHONG nam trong FULL ZIP de bao ve du lieu rieng.
echo BAT se tim ban sao trong android\app hoac ban sao luu Auto Update cua CHINH project nay.
set "FB_CONFIG_SOURCE="
for /f "usebackq delims=" %%G in (`node "%FB_TOOL_ROOT%\scripts\android\build\firebase-android-config.cjs" candidate "%FB_PROJECT_DIR%"`) do if not defined FB_CONFIG_SOURCE set "FB_CONFIG_SOURCE=%%G"
if defined FB_CONFIG_SOURCE (
  echo [TIM THAY] "%FB_CONFIG_SOURCE%"
  choice /C YN /N /M "Su dung file nay cho project dang build? [Y/N]: "
  if errorlevel 2 set "FB_CONFIG_SOURCE="
)
if defined FB_CONFIG_SOURCE goto :restore
set "FB_PICK_FILE=%TEMP%\FamilyBloomFirebase_%RANDOM%_%RANDOM%.txt"
if exist "%FB_PICK_FILE%" del /q "%FB_PICK_FILE%" >nul 2>nul
where powershell.exe >nul 2>nul
if errorlevel 1 goto :manual
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File "%FB_TOOL_ROOT%\scripts\android\build\Select-GoogleServicesFile.ps1" -OutputFile "%FB_PICK_FILE%"
if exist "%FB_PICK_FILE%" (
  for /f "usebackq delims=" %%G in ("%FB_PICK_FILE%") do if not defined FB_CONFIG_SOURCE set "FB_CONFIG_SOURCE=%%G"
  del /q "%FB_PICK_FILE%" >nul 2>nul
)
if defined FB_CONFIG_SOURCE goto :confirm
:manual
 echo Neu khong co file, vao Firebase Console ^> Project settings ^> Your apps ^> Android de tai google-services.json.
 set /p "FB_CONFIG_SOURCE=Duong dan day du den google-services.json (Enter de huy): "
 if not defined FB_CONFIG_SOURCE exit /b 1
:confirm
 echo.
 echo [XAC NHAN] File duoc chon: "%FB_CONFIG_SOURCE%"
 choice /C YN /N /M "Sao chep file hop le vao project dang build? [Y/N]: "
 if errorlevel 2 exit /b 1
:restore
node "%FB_TOOL_ROOT%\scripts\android\build\firebase-android-config.cjs" restore "%FB_PROJECT_DIR%" "%FB_CONFIG_SOURCE%"
if errorlevel 1 exit /b 1
node "%FB_TOOL_ROOT%\scripts\android\build\firebase-android-config.cjs" check "%FB_PROJECT_DIR%"
exit /b %errorlevel%
