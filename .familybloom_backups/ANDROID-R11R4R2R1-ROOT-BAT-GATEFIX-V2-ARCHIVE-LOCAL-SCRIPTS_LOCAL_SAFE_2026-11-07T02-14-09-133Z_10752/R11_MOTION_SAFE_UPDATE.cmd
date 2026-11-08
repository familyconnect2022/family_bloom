@echo off
rem R11 trial only. Reuse the SHA-bound full updater from this extracted release.
call "%~dp0Family_Bloom_AUTO_UPDATE_FULL.bat" %*
exit /b %errorlevel%
