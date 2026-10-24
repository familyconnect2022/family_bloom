@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
for %%I in ("%~dp0..\..") do set "FB_ROOT=%%~fI"
cd /d "%FB_ROOT%" || goto :fail
set "FB_PREFLIGHT=0"
if /i "%~1"=="--preflight" set "FB_PREFLIGHT=1"
echo.
echo ================================================
echo FAMILY BLOOM - BLAZE FIRST-TIME SETUP
echo Target is NEVER chosen silently.
echo This script never upgrades billing itself.
echo ================================================
where node >nul 2>nul
if errorlevel 1 (echo [ERROR] Node.js is required. & goto :fail)
where npm >nul 2>nul
if errorlevel 1 (echo [ERROR] npm is required. & goto :fail)
if not exist "firebase.json" (echo [ERROR] Missing firebase.json. & goto :fail)
if not exist "firestore.rules" (echo [ERROR] Missing firestore.rules. & goto :fail)
if not exist "functions\package.json" (echo [ERROR] Missing functions\package.json. & goto :fail)
if not exist "functions\index.js" (echo [ERROR] Missing functions\index.js. & goto :fail)
node "scripts\tests\release\test-r3r13-blaze-ready.cjs"
if errorlevel 1 goto :fail
if "%FB_PREFLIGHT%"=="1" (
  echo [PASS] Static checks only - no Firebase calls or deploy.
  exit /b 0
)
set "FB_PROJECT_ID="
if exist "google-services.json" (
  for /f "usebackq delims=" %%P in (`node -e "const x=require('./google-services.json');process.stdout.write(x.project_info.project_id||'')"`) do set "FB_PROJECT_ID=%%P"
)
if not defined FB_PROJECT_ID (
  echo [INFO] google-services.json is absent; enter your EXISTING Firebase project ID.
  set /p "FB_PROJECT_ID=Firebase project ID: "
)
if not defined FB_PROJECT_ID (echo [ERROR] No project ID. & goto :fail)
node -e "const id=process.argv[1]; if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(id)) process.exit(1)" "%FB_PROJECT_ID%"
if errorlevel 1 (echo [ERROR] Invalid Firebase project ID. & goto :fail)
echo.
echo Deploy destination Firebase project: %FB_PROJECT_ID%
echo This deploys firestore.rules AND the existing + new Cloud Functions.
echo IMPORTANT: A Blaze plan and billing are required by Firebase.
echo Functions and scheduler can incur charges EVEN IF push toggle is OFF.
echo Review cost controls and budgets in Firebase console first.
echo.
set "FB_CONFIRM="
set /p "FB_CONFIRM=Type DEPLOY to continue; anything else cancels: "
if /i not "%FB_CONFIRM%"=="DEPLOY" (echo [CANCELLED] No changes made. & exit /b 0)
where firebase >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Firebase CLI is missing.
  echo Install once: npm install -g firebase-tools
  goto :fail
)
echo.
echo [1/4] Firebase CLI identity - login must belong to this project
call firebase projects:list
if errorlevel 1 (echo [ERROR] Please run firebase login and retry. & goto :fail)
echo [2/4] Installing backend dependencies...
call npm install --prefix functions --no-audit --no-fund
if errorlevel 1 goto :fail
echo [3/4] Deploying firestore.rules (Direct/Spark compatible + protected Cloud gates)...
call firebase deploy --only firestore:rules --project "%FB_PROJECT_ID%"
if errorlevel 1 goto :fail
echo [4/4] Deploying functions. This operation may incur Blaze charges...
call firebase deploy --only functions --project "%FB_PROJECT_ID%"
if errorlevel 1 goto :fail
echo.
echo [SUCCESS] Backend deployed. In Family Bloom open:
echo Settings ^> Developer tools ^> Cloud - Ready for Blaze
echo Check connection first, then turn on each Cloud feature as needed.
echo Existing Android notifications require user permission and a valid FCM token.
exit /b 0
:fail
echo [STOP] Blaze setup failed. The local source and user data are untouched.
exit /b 1
