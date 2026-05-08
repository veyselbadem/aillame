Set WshShell = CreateObject("WScript.Shell")
' Get the path to the folder containing this VBS file
scriptPath = WScript.ScriptFullName
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(scriptPath)

' Run the PowerShell script hidden
psCommand = "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & scriptDir & "\launch-aillame.ps1"""
WshShell.Run psCommand, 0, False
