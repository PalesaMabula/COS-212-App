# COS212 Graphs and BFS: run the browser (end-to-end) tests.
# Usage, from this folder in a PowerShell / VS Code terminal:   .\run-e2e.ps1
# Options:
#   -SkipBuild   use the existing front-end build
#   -Headed      show the browser while the tests run
# Stop the app (.\run.ps1) first: the tests start their own copy on port 8000,
# with their own empty database, and delete it afterwards.

param([switch]$SkipBuild, [switch]$Headed)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$py = "$root\backend\.venv\Scripts\python.exe"

# Is something already using port 8000?
$busy = $false
try { $c = New-Object Net.Sockets.TcpClient; $c.Connect("127.0.0.1", 8000); $c.Close(); $busy = $true } catch {}
if ($busy) { throw "Port 8000 is in use. Stop the running app (Ctrl+C in its terminal) and try again." }

Write-Host "`n[1/4] Python packages and the test browser" -ForegroundColor Cyan
Push-Location "$root\backend"
if (-not (Test-Path ".venv")) { python -m venv .venv }
& $py -m pip install --quiet --disable-pip-version-check -r requirements.txt -r "$root\e2e\requirements.txt"
if (-not $env:E2E_CHROME) { & $py -m playwright install chromium }
Pop-Location

if (-not $SkipBuild -or -not (Test-Path "$root\frontend\dist\index.html")) {
  Write-Host "[2/4] Front end (React build)" -ForegroundColor Cyan
  Push-Location "$root\frontend"
  if (-not (Test-Path "node_modules")) { npm install --no-audit --no-fund }
  npm run build
  if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Front-end build failed" }
  Pop-Location
} else {
  Write-Host "[2/4] Front end: using the existing build" -ForegroundColor Cyan
}

Write-Host "[3/4] Starting the app on http://localhost:8000 with an empty test database" -ForegroundColor Cyan
$db = Join-Path ([IO.Path]::GetTempPath()) ("cos212-e2e-" + [guid]::NewGuid() + ".db")
$env:COS212_DB = $db
$server = Start-Process -FilePath $py -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000" `
  -WorkingDirectory "$root\backend" -PassThru -NoNewWindow
# Wait until the server accepts connections on 127.0.0.1:8000 (up to 60 s).
# A plain socket check avoids two Windows snags with web requests here:
# "localhost" trying IPv6 (::1) first, and the system proxy settings.
$up = $false
for ($i = 0; $i -lt 120; $i++) {
  if ($server.HasExited) { break }
  try { $c = New-Object Net.Sockets.TcpClient; $c.Connect("127.0.0.1", 8000); $c.Close(); $up = $true; break } catch { Start-Sleep -Milliseconds 500 }
}
$env:E2E_BASE_URL = "http://127.0.0.1:8000"

$code = 1
try {
  if (-not $up) {
    if ($server.HasExited) { throw "The app stopped while starting (exit code $($server.ExitCode)). The error is printed above." }
    throw "The app did not start within 60 seconds."
  }
  Write-Host "[4/4] Running the tests`n" -ForegroundColor Green
  if ($Headed) { $env:E2E_HEADED = "1"; $env:E2E_SLOWMO = "150" }
  & $py -m pytest "$root\e2e" -v -p no:cacheprovider
  $code = $LASTEXITCODE
} finally {
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  Remove-Item Env:COS212_DB, Env:E2E_HEADED, Env:E2E_SLOWMO, Env:E2E_BASE_URL -ErrorAction SilentlyContinue
  Remove-Item $db -ErrorAction SilentlyContinue
}
if ($code -eq 0) { Write-Host "`nAll browser tests passed." -ForegroundColor Green } else { Write-Host "`nSome browser tests failed (see above)." -ForegroundColor Red }
exit $code
