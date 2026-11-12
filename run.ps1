# COS212 Graphs and BFS: set up (first time) and run the whole app at http://localhost:8000
# Usage, from this folder in a PowerShell / VS Code terminal:   .\run.ps1
# Options:  .\run.ps1 -SkipBuild   (start faster when the front end hasn't changed)

param([switch]$SkipBuild)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n[1/3] Back end (Python)" -ForegroundColor Cyan
Push-Location "$root\backend"
if (-not (Test-Path ".venv")) { python -m venv .venv }
& .\.venv\Scripts\python.exe -m pip install --quiet --disable-pip-version-check -r requirements.txt
Pop-Location

if (-not $SkipBuild -or -not (Test-Path "$root\frontend\dist\index.html")) {
  Write-Host "[2/3] Front end (React build)" -ForegroundColor Cyan
  Push-Location "$root\frontend"
  if (-not (Test-Path "node_modules")) { npm install --no-audit --no-fund }
  npm run build
  if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Front-end build failed" }
  Pop-Location
} else {
  Write-Host "[2/3] Front end: using the existing build" -ForegroundColor Cyan
}

Write-Host "[3/3] Starting the server. Open http://localhost:8000  (Ctrl+C to stop)`n" -ForegroundColor Green
Push-Location "$root\backend"
try { & .\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000 }
finally { Pop-Location }
