@echo off
setlocal
chcp 65001 >nul
for %%I in ("%~dp0..\..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"
echo [Family Bloom] Refresh Vietnamese discovery catalog from public NCT/Zing signals...
node scripts\music\refresh-vietnamese-music-catalog.js
if errorlevel 1 goto :fail

echo.
echo [Family Bloom] Audit newly discovered verified Vietnamese tracks against Audius...
node scripts\music\audit-audius-vietnamese-catalog.js
if errorlevel 1 goto :fail

echo.
echo [Family Bloom] Static validation...
node scripts\test-phase14l-dynamic-vietnamese-catalog.js
if errorlevel 1 goto :fail

echo.
echo DONE. Review document\music-catalog\refresh-latest.json and audius-audit-latest.json.
pause
exit /b 0

:fail
echo.
echo FAILED. Scroll up for the first error. Existing generated catalog files are preserved when possible.
pause
exit /b 1
