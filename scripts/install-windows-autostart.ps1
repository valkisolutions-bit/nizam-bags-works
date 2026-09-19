# Run this once in PowerShell to add Nizam POS to Windows Startup.
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Startup = [Environment]::GetFolderPath("Startup")
$ShortcutPath = Join-Path $Startup "Nizam Bags POS.lnk"
$BatPath = Join-Path $ProjectRoot "scripts\start-nizam-pos-windows.bat"

$Shell = New-Object -ComObject WScript.Shell
$Shortcut = $Shell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $BatPath
$Shortcut.WorkingDirectory = $ProjectRoot
$Shortcut.WindowStyle = 7
$Shortcut.Description = "Start Nizam Bags POS automatically"
$Shortcut.Save()

Write-Host "Startup shortcut created: $ShortcutPath" -ForegroundColor Green
