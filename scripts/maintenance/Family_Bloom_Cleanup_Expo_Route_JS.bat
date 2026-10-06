@echo off
setlocal EnableExtensions
for %%I in ("%~dp0..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"
echo ========================================================
echo Family Bloom - CLEAN duplicated generated JS under src

echo This checkpoint intentionally contains NO .js files under:
echo   src\
echo   server\src\
echo ========================================================
echo.
echo [1/4] Removing generated JS under src...
if exist "src" del /s /q "src\*.js" >nul 2>nul

echo [2/4] Removing generated JS under server\src...
if exist "server\src" del /s /q "server\src\*.js" >nul 2>nul

echo [3/4] Clearing Expo route cache...
if exist ".expo" rmdir /s /q ".expo"

echo [4/4] Verifying...
set FOUND=0
for /r "src" %%F in (*.js) do (
  echo REMAINS: %%F
  set FOUND=1
)
if exist "server\src" (
  for /r "server\src" %%F in (*.js) do (
    echo REMAINS: %%F
    set FOUND=1
  )
)
if "%FOUND%"=="0" (
  echo PASS: no generated JS remains in src or server\src.
) else (
  echo WARNING: some JS remains. Please send this output to ChatGPT.
)
echo.
echo IMPORTANT: use "npm run typecheck". Do NOT use raw "npx tsc" on older checkpoints.
echo Next command: npx expo start --dev-client --clear
pause
endlocal
