@echo off
echo =========================================
echo BAT DAU CAI DAT VA CHAY EXPO ANDROID
echo =========================================

echo.
echo [1/4] Dang cai dat expo...
call npm install expo

echo.
echo [2/4] Dang sua loi phien ban dependencies (npx expo install --fix)...
call npx expo install --fix

echo.
echo [3/4] Dang kiem tra du an (npx expo-doctor)...
call npx expo-doctor

echo.
echo [4/4] Dang build va chay tren thiet bi Android...
call npx expo run:android

echo.
echo =========================================
echo DA HOAN THANH!
echo =========================================
pause