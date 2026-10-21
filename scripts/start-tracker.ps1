# Starts the tracker without a terminal: builds the app, serves the build on
# http://localhost:5174 in the background (vite preview, with the Riot proxy)
# and opens it in its own window. The polling runs in that window, so it must
# stay open (minimized is fine).
#
# Run at sign-in by the shortcut from install-autostart.ps1, or by hand:
#   npm run tracker
# Logs: logs/tracker.log

param(
  [int]$Port = 5174,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
# Node writes UTF-8; read it as such so the log isn't mojibake
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$root = Split-Path -Parent $PSScriptRoot
$url = "http://localhost:$Port/"
$logDir = Join-Path $root "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir "tracker.log"

function Write-Log($message) {
  "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $message" |
    Out-File -FilePath $log -Append -Encoding utf8
}

function Test-Tracker {
  try {
    (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200
  } catch {
    $false
  }
}

$node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
if (-not $node) {
  Write-Log "node.exe not found in PATH"
  exit 1
}
$vite = Join-Path $root "node_modules\vite\bin\vite.js"

if (Test-Tracker) {
  # Already served (an earlier start, or npm run dev): just open it
  Write-Log "already running on $url"
} else {
  Write-Log "building"
  # Fresh build, so code changes show up after a restart; a failed build
  # keeps serving the last good one
  # Warnings on stderr must not stop the script; the log stays UTF-8
  $ErrorActionPreference = "Continue"
  & $node $vite build 2>&1 | Out-File -FilePath $log -Append -Encoding utf8
  $buildExit = $LASTEXITCODE
  $ErrorActionPreference = "Stop"
  if ($buildExit -ne 0) {
    Write-Log "build failed, serving the previous build"
    if (-not (Test-Path (Join-Path $root "dist\index.html"))) { exit 1 }
  }

  Write-Log "serving $url"
  Start-Process -FilePath $node `
    -ArgumentList "`"$vite`"", "preview", "--port", $Port, "--strictPort" `
    -WorkingDirectory $root -NoNewWindow `
    -RedirectStandardOutput (Join-Path $logDir "preview.log") `
    -RedirectStandardError (Join-Path $logDir "preview-error.log")

  $deadline = (Get-Date).AddSeconds(30)
  while (-not (Test-Tracker)) {
    if ((Get-Date) -gt $deadline) {
      Write-Log "server did not answer within 30 s, see preview-error.log"
      exit 1
    }
    Start-Sleep -Milliseconds 500
  }
}

if (-not $NoBrowser) {
  # An app window (no tabs, no address bar) when Chrome is installed: unlike a
  # background tab, Chrome's Memory Saver never puts it to sleep
  $chrome = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($chrome) {
    Start-Process -FilePath $chrome -ArgumentList "--app=$url"
  } else {
    Start-Process $url
  }
  Write-Log "opened $url"
}
