@echo off
setlocal
firebase use family-connect-4184f
if errorlevel 1 exit /b %errorlevel%
firebase deploy --only firestore:indexes --project family-connect-4184f
endlocal
