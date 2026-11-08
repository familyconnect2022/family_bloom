@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
if not exist "%~dp0Family_Bloom_AUTO_UPDATE_FULL.bat" goto :missing
call "%~dp0Family_Bloom_AUTO_UPDATE_FULL.bat" %*
exit /b %ERRORLEVEL%
:missing
echo [ERROR] FULL CODE not extracted or auto update BAT missing.
pause
exit /b 1
