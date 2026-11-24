@echo off
setlocal
for %%I in ("%~dp0..\..\..") do set "PROJECT_ROOT=%%~fI"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Configure-Preview.ps1" -ProjectRoot "%PROJECT_ROOT%"
if errorlevel 1 (
 echo [ERROR] Preview configuration was NOT saved.
 pause
 exit /b 1
)
pause
exit /b 0
