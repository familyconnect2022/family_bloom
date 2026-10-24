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
rem Validate BEFORE backup, cleanup, overlay, and before confirming anything.
rem A relocated or renamed project must trigger a new folder selection,
rem not an unconditional failure because last-target.txt is stale.
:validate_or_reselect
if not defined FB_TARGET goto :choose_target
set "FB_TARGET=%FB_TARGET:"=%"
node "%FB_SOURCE%\scripts\maintenance\auto-update-full.cjs" target >nul 2>nul
if not errorlevel 1 goto :target_ready
echo.
echo [TARGET NOT FOUND OR INVALID] The saved/entered project folder cannot be used.
echo Attempted: "%FB_TARGET%"
node "%FB_SOURCE%\scripts\maintenance\auto-update-full.cjs" target
echo [SAFE] No backup, cleanup or copy has started. Choose the CURRENT project folder.
set "FB_TARGET="
:choose_target
echo.
echo ========================================================
echo SELECT EXISTING FAMILY BLOOM PROJECT - NOT THE FULL ZIP
echo The folder must contain package.json and app.config.js.
echo ========================================================
set "FB_PICK_FILE=%TEMP%\FamilyBloomTarget_%RANDOM%_%RANDOM%.txt"
if exist "%FB_PICK_FILE%" del /q "%FB_PICK_FILE%" >nul 2>nul
where powershell.exe >nul 2>nul
if errorlevel 1 goto :manual_target
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File "%FB_SOURCE%\scripts\android\maintenance\Select-FamilyBloomProjectFolder.ps1" -OutputFile "%FB_PICK_FILE%"
if exist "%FB_PICK_FILE%" (
  for /f "usebackq delims=" %%T in ("%FB_PICK_FILE%") do if not defined FB_TARGET set "FB_TARGET=%%T"
  del /q "%FB_PICK_FILE%" >nul 2>nul
)
if defined FB_TARGET goto :validate_or_reselect
:manual_target
echo [INFO] Folder picker unavailable or cancelled. You can enter the path manually.
echo Example: D:\Project Family Bloom\Bloom
set /p "FB_TARGET=Existing project folder (or Q to cancel): "
if /i "%FB_TARGET%"=="Q" goto :cancelled
if not defined FB_TARGET goto :cancelled
goto :validate_or_reselect
:target_ready
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
set "FB_THIS_RUN_BACKUP=0"
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
set "FB_THIS_RUN_BACKUP=1"
echo.
echo [BAO TRI] Don cac duong dan BAT/test cu SAU KHI SAO LUU...
node "%FB_SOURCE%\scripts\maintenance\retire-legacy-script-paths.cjs" "%FB_TARGET%"
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
call "%FB_TARGET%\scripts\android\maintenance\Family_Bloom_CLEAN_APPLY_FULL.bat" --no-pause
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
if "%FB_THIS_RUN_BACKUP%"=="1" (
  echo This update created a project-source backup here:
  if exist "%FB_STATE_DIR%\last-backup.txt" type "%FB_STATE_DIR%\last-backup.txt"
) else (
  echo Preflight or backup failed BEFORE any cleanup or overlay of the old project.
  echo Existing project source was not changed by this attempt.
)
echo ========================================================
pause
exit /b 1
