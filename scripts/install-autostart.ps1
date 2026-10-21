# Adds a "Spectator Tracker" shortcut to the Windows Startup folder that runs
# start-tracker.ps1 hidden at every sign-in; -Remove takes it away again.
# No admin rights needed. The entry also shows in Task Manager > Startup apps,
# where it can be switched off.
#
#   npm run autostart:on
#   npm run autostart:off

param([switch]$Remove)

$ErrorActionPreference = "Stop"
$startup = [Environment]::GetFolderPath("Startup")
$link = Join-Path $startup "Spectator Tracker.lnk"

if ($Remove) {
  if (Test-Path $link) {
    Remove-Item $link
    Write-Output "Autostart removed."
  } else {
    Write-Output "Autostart was not set up."
  }
  return
}

$script = Join-Path $PSScriptRoot "start-tracker.ps1"
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($link)
$shortcut.TargetPath = Join-Path $PSHOME "powershell.exe"
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$shortcut.WorkingDirectory = Split-Path -Parent $PSScriptRoot
# Minimized: the console doesn't flash up before it hides itself
$shortcut.WindowStyle = 7
$shortcut.Description = "Spectator Tracker (League of Legends, Apex Legends)"
$shortcut.Save()

Write-Output "Autostart set up: the tracker starts and opens at every sign-in."
Write-Output "Shortcut: $link"
