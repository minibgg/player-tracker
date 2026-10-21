# Stops the background server started by start-tracker.ps1 (for example to
# free port 5174 for npm run dev). The tracker window stops polling until
# the server is started again.
#
#   npm run tracker:stop

$root = Split-Path -Parent $PSScriptRoot
$vite = Join-Path $root "node_modules\vite\bin\vite.js"

$servers = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object { $_.CommandLine -like "*$vite*preview*" }

if (-not $servers) {
  Write-Output "The tracker server is not running."
  return
}
foreach ($server in $servers) {
  Stop-Process -Id $server.ProcessId -Confirm:$false
}
Write-Output "Tracker server stopped."
