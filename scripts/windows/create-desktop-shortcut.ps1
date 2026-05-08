$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDir = (Resolve-Path "$scriptDir\..\..").Path
$vbsPath = "$scriptDir\launch-aillame.vbs"
$iconPath = "$projectDir\public\branding\aillame-icon.ico"

$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = "$desktopPath\Aillame.lnk"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)

# The target is the VBS script to keep it fully hidden
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = """$vbsPath"""
$Shortcut.WorkingDirectory = $projectDir
$Shortcut.IconLocation = $iconPath
$Shortcut.Description = "Aillame Local AI Hub"
$Shortcut.WindowStyle = 7 # Minimized (though wscript is invisible anyway)
$Shortcut.Save()

Write-Host "Desktop shortcut created successfully at: $shortcutPath"
