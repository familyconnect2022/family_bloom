@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
for %%I in ("%~dp0..\..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%" || exit /b 1
echo.
echo ============================================================
echo FAMILY BLOOM - IOS TEST (INFORMATION / WINDOWS GUARD)
echo Actual native command on macOS: npx expo run:ios
echo ============================================================
echo [NOT SUPPORTED ON WINDOWS] iOS native build requires macOS + Xcode.
echo Family Bloom currently targets Android; there is no active iOS config.
echo This BAT deliberately DOES NOT try to run a fake iOS build.
echo.
echo On a Mac after configuring iOS + Firebase for iOS:
echo   cd path/to/FAMILY_BLOOM
 echo   npm install
 echo   npx expo run:ios
 echo.
echo Optional macOS helper: scripts/android/build/Family_Bloom_IOS_RUN_TEST.sh
 echo For EAS cloud iOS builds, Apple signing/credentials and iOS app config are needed.
exit /b 2
