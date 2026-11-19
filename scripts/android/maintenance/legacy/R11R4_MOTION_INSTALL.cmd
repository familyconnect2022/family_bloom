@echo off
rem ARCHIVED LEGACY TOOL: not for current R11R4R2+; use the two root build launchers.
for %%I in ("%~dp0..\..\..\..") do set "FB_LEGACY_ROOT=%%~fI"
setlocal
cd /d "%FB_LEGACY_ROOT%"
echo Family Bloom R11R4 - Real Login / Welcome / Tab Motion
set "TARGET=%~1"
if not defined TARGET (
  set /p "TARGET=Nhap duong dan thu muc Family_Bloom dang chay R11R3: "
)
if not defined TARGET (echo [STOP] Chua nhap duong dan. & exit /b 1)
node scripts\maintenance\fb-r11r4-entry-motion.cjs check "%TARGET%"
if errorlevel 1 (echo [STOP] Khong cap nhat. & pause & exit /b 1)
choice /C YN /M "CHECK PASS. Ban dong y sao luu va cap nhat R11R4?"
if errorlevel 2 exit /b 0
node scripts\maintenance\fb-r11r4-entry-motion.cjs install "%TARGET%"
if errorlevel 1 (echo [STOP] Co loi, xem thong bao. & pause & exit /b 1)
echo [DONE] Cap nhat PASS. Hay build APK Release tu project dang chay.
pause
