@echo off
setlocal EnableExtensions
rem For first deployment, use the safe installer with project verification and confirmation.
call "%~dp0Family_Bloom_BLAZE_SETUP_ONCE.bat" %*
exit /b %errorlevel%
