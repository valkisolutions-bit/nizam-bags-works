# Nizam Bags POS - Windows automatic startup
# This script waits for Docker Desktop, starts/restarts the POS stack,
# then opens the POS in Google Chrome.

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "Starting Nizam Bags POS..." -ForegroundColor Cyan

# Wait for Docker Desktop / Docker Engine (up to ~2 minutes).
$ready = $false
for ($i = 0; $i -lt 24; $i++) {
    try {
        docker info *> $null
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
            break
        }
    } catch {}
    Start-Sleep -Seconds 5
}

if (-not $ready) {
    Write-Host "Docker Engine is not ready. Start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

docker compose up -d --build

# Wait for the web page to answer before opening Chrome.
for ($i = 0; $i -lt 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost" -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
            break
        }
    } catch {}
    Start-Sleep -Seconds 2
}

$chromeCandidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
$chrome = $chromeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($chrome) {
    Start-Process -FilePath $chrome -ArgumentList "--app=http://localhost"
} else {
    Write-Host "Google Chrome was not found. Open http://localhost manually." -ForegroundColor Yellow
}
