@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo Aillame Masaustu Kisayolu Olusturuluyor...
echo ============================================================

set SCRIPT_PATH=%~dp0Aillame Baslat.bat
set ICON_PATH=%~dp0public\favicon.ico
set SHORTCUT_PATH=%USERPROFILE%\Desktop\Aillame.lnk

powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%SHORTCUT_PATH%'); $Shortcut.TargetPath = '%SCRIPT_PATH%'; $Shortcut.WorkingDirectory = '%~dp0'; $Shortcut.Save()"

if exist "%SHORTCUT_PATH%" (
    echo [OK] Masaustune kisayol basariyla olusturuldu: %SHORTCUT_PATH%
) else (
    echo [X] Kisayol olusturulamadi.
)

pause
