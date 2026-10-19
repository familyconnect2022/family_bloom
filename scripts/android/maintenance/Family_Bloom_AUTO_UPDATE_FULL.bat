@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
for %%I in ("%~dp0..\..\..") do set "FB_SOURCE=%%~fI"
set "FB_STATE_DIR=%LOCALAPPDATA%\FamilyBloom\updater"
if not defined LOCALAPPDATA set "FB_STATE_DIR=%USERPROFILE%\AppData\Local\FamilyBloom\updater"
set "FB_TARGET=%~1"
if not defined FB_TARGET if exist "%FB_STATE_DIR%\last-target.txt" (
  for /f "usebackq delims=" %%T in ("%FB_STATE_DIR%\last-target.txt") do if not defined FB_TARGET set "FB_TARGET=%%T"
)
if not defined FB_TARGET (
  echo.
  echo FIRST UPDATE: Enter the path to your EXISTING Family Bloom project.
  echo Example: D:\FamilyBloom
  echo This path is saved after a successful update.
  set /p "FB_TARGET=Old Family Bloom folder: "
)
set "FB_TARGET=%FB_TARGET:"=%"
echo.
echo ========================================================
echo FAMILY BLOOM - AUTO FULL UPDATE
 echo New FULL release: "%FB_SOURCE%"
 echo Existing project: "%FB_TARGET%"
echo ========================================================
echo.
where node >nul 2>nul
if errorlevel 1 (
 echo [ERROR] Node.js is required. Update stopped WITHOUT deleting files.
 goto :fail
)
node "%FB_SOURCE%\scripts\maintenance\auto-update-full.cjs" check
if errorlevel 1 goto :fail
echo.
echo This will back up source, clean the old project, copy new FULL
 echo files, verify the copy and run CLEAN APPLY FULL.
echo Generated Android/Node caches are not copied.
echo.
choice /C YN /N /M "Proceed with this project? [Y/N]: "
if errorlevel 2 goto :cancelled
if errorlevel 1 goto :run
goto :fail
:run
echo.
echo [1/6] Backing up existing project source...
node "%FB_SOURCE%\scripts\maintenance\auto-update-full.cjs" backup
if errorlevel 1 goto :fail
echo.
echo [2/6] Running PRE COPY CLEAN OLD...
call "%FB_SOURCE%\scripts\android\maintenance\Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat" "%FB_TARGET%" --no-pause
if errorlevel 1 goto :fail
echo.
echo [3/6] Copying FULL source into existing project...
node "%FB_SOURCE%\scripts\maintenance\auto-update-full.cjs" overlay
if errorlevel 1 goto :fail
node "%FB_SOURCE%\scripts\maintenance\auto-update-full.cjs" verify
if errorlevel 1 goto :fail
echo.
echo [4/6] Checking updated project structure BEFORE CLEAN APPLY...
node "%FB_TARGET%\scripts\maintenance\check-project-structure.js"
if errorlevel 1 goto :fail
echo.
echo [5/6] Running CLEAN APPLY FULL on updated project...
call "%FB_TARGET%\Family_Bloom_CLEAN_APPLY_FULL.bat" --no-pause
if errorlevel 1 goto :fail
echo.
echo [6/6] Saving target location for next time...
node "%FB_SOURCE%\scripts\maintenance\auto-update-full.cjs" remember
if errorlevel 1 goto :fail
echo.
echo ========================================================
echo PASS: Family Bloom FULL source is updated and CLEAN APPLY passed.
echo Build your APK using Family_Bloom_BUILD_APK_TO_SHARE.bat
 echo inside the updated project.
echo ========================================================
if exist "%FB_STATE_DIR%\last-backup.txt" type "%FB_STATE_DIR%\last-backup.txt"
echo.
pause
exit /b 0
:cancelled
echo Cancelled. No changes were made.
pause
exit /b 2
:fail
echo.
echo ========================================================
echo FAILED: Automatic update stopped. Do NOT build yet.
echo If cleanup or overlay began, a project-source backup is here:
if exist "%FB_STATE_DIR%\last-backup.txt" type "%FB_STATE_DIR%\last-backup.txt"
echo ========================================================
pause
exit /b 1
