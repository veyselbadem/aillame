@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo Aillame Compiled API Server Baslatiliyor...
echo ============================================================

if not exist "dist\server.js" (
    echo [!] dist\server.js bulunamadi. Backend derleniyor...
    call npm.cmd run api:build
    if errorlevel 1 (
        echo [X] Backend derlenirken hata olustu.
        pause
        exit /b 1
    )
)

echo [*] API Sunucusu baslatiliyor (Compiled Mod)...
node dist/server.js

if errorlevel 1 (
    echo [X] Sunucu baslatilirken bir hata olustu.
    pause
)

pause
