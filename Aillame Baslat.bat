@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo Aillame Masaustu Uygulamasi Baslatiliyor...
echo ============================================================

if not exist "node_modules" (
    echo [!] node_modules bulunamadi. Bagimliliklar yukleniyor...
    call npm.cmd install
    if errorlevel 1 (
        echo [X] Bagimliliklar yuklenirken hata olustu.
        pause
        exit /b 1
    )
)

echo [*] Eski Aillame dev sunucusu kontrol ediliyor...
call node scripts\ensure-desktop-dev-free.mjs
if errorlevel 1 (
    echo [X] Eski masaustu debug sureci temizlenemedi.
    pause
    exit /b 1
)

call node scripts\ensure-dev-port-free.mjs
if errorlevel 1 (
    echo [X] Port 3000 temizlenemedi. Lutfen yukaridaki mesaji kontrol edin.
    pause
    exit /b 1
)

echo [*] Masaustu modu baslatiliyor (Tauri v2)...
call npm.cmd run desktop:dev

if errorlevel 1 (
    echo [X] Uygulama baslatilirken bir hata olustu.
    pause
)

pause
