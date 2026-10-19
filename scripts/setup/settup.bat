@echo off
setlocal
chcp 65001 >nul
for %%I in ("%~dp0..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"
echo ============================================================
echo FAMILY BLOOM - RETIRED LEGACY SETUP
echo ============================================================
echo.
echo This script is RETIRED because the old unpinned Expo install command could change the
 echo Expo SDK/native dependency graph and break a clean Family Bloom build.
echo.
echo Use one of these supported scripts instead:
echo   scripts\setup\Family_Bloom_Sync_Dependencies.bat
echo   scripts\setup\Family_Bloom_Install_And_Doctor.bat
echo.
echo No project files were changed.
pause
exit /b 1
