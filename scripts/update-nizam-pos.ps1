<#
.SYNOPSIS
    Nizam Bags POS - Production Update & Deployment Script for Windows
.DESCRIPTION
    1. Checks & waits for Docker Desktop / Docker Engine.
    2. Pulls updated images from Docker Hub (valkisolutions/nizam-frontend, valkisolutions/nizam-backend).
    3. Safely stops & removes only old frontend and backend containers.
    4. PRESERVES MySQL container and db_data volume (sales records and inventory data remain completely intact!).
    5. Starts the updated stack with docker-compose.prod.yml.
    6. Automatically sets up / refreshes Windows startup shortcut in shell:startup.
    7. Cleans up dangling/old images (docker image prune -f).
    8. Waits for http://localhost to respond and opens Google Chrome in application mode.
#>

param(
    [string]$ImageTag = "latest"
)

$ErrorActionPreference = "Stop"

# Determine project root directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (Test-Path (Join-Path $ScriptDir "docker-compose.prod.yml")) {
    $ProjectRoot = $ScriptDir
} else {
    $ProjectRoot = Split-Path -Parent $ScriptDir
}
Set-Location $ProjectRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "      Nizam Bags POS - Production Deployment & Updater    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Target Image Tag : $ImageTag" -ForegroundColor Yellow
Write-Host "Working Directory: $ProjectRoot" -ForegroundColor Yellow
Write-Host ""

# 1. Check Docker Engine daemon
Write-Host "[1/6] Checking Docker Engine daemon..." -ForegroundColor Cyan
$ready = $false
for ($i = 0; $i -lt 12; $i++) {
    try {
        docker info *> $null
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
            break
        }
    } catch {}
    Start-Sleep -Seconds 2
}

if (-not $ready) {
    Write-Host "Docker is not responding. Attempting to start Docker Desktop..." -ForegroundColor Yellow
    $dockerDesktopCandidates = @(
        "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
        "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe",
        "$env:LOCALAPPDATA\Programs\Docker\Docker\Docker Desktop.exe"
    )
    $dockerExe = $dockerDesktopCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($dockerExe) {
        Start-Process -FilePath $dockerExe
        Write-Host "Waiting up to 90 seconds for Docker Engine to start..." -ForegroundColor Yellow
        for ($i = 0; $i -lt 18; $i++) {
            Start-Sleep -Seconds 5
            try {
                docker info *> $null
                if ($LASTEXITCODE -eq 0) {
                    $ready = $true
                    break
                }
            } catch {}
        }
    }
}

if (-not $ready) {
    Write-Host "ERROR: Docker Engine is not running. Please start Docker Desktop and run this script again." -ForegroundColor Red
    exit 1
}
Write-Host "Docker Engine is active and ready." -ForegroundColor Green

# Select compose file
$ComposeFile = "docker-compose.prod.yml"
if (-not (Test-Path (Join-Path $ProjectRoot $ComposeFile))) {
    $ComposeFile = "docker-compose.yml"
}
$ComposePath = Join-Path $ProjectRoot $ComposeFile
Write-Host "Using Compose file: $ComposeFile" -ForegroundColor Cyan

# 2. Pull updated images from Docker Hub
Write-Host "`n[2/6] Pulling updated images from Docker Hub..." -ForegroundColor Cyan
Write-Host "Pulling valkisolutions/nizam-backend:$ImageTag ..." -ForegroundColor Gray
docker pull "valkisolutions/nizam-backend:$ImageTag"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to pull backend image." -ForegroundColor Red
    exit 1
}

Write-Host "Pulling valkisolutions/nizam-frontend:$ImageTag ..." -ForegroundColor Gray
docker pull "valkisolutions/nizam-frontend:$ImageTag"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to pull frontend image." -ForegroundColor Red
    exit 1
}

# 3. Stop & remove OLD frontend and backend containers (PRESERVING MySQL!)
Write-Host "`n[3/6] Stopping and removing old frontend & backend containers..." -ForegroundColor Cyan
Write-Host "[IMPORTANT] MySQL container and db_data volume will NOT be removed or touched." -ForegroundColor Green

try {
    # Stop and remove ONLY backend and frontend services via compose
    docker compose -f $ComposePath stop backend frontend 2>$null
    docker compose -f $ComposePath rm -f backend frontend 2>$null
} catch {
    Write-Host "Note: Previous containers were already stopped." -ForegroundColor Gray
}

# 4. Start updated stack
Write-Host "`n[4/6] Starting updated Nizam Bags POS services..." -ForegroundColor Cyan
$env:IMAGE_TAG = $ImageTag
docker compose -f $ComposePath up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to start docker-compose services." -ForegroundColor Red
    exit 1
}

# Clean up dangling images to save disk space
Write-Host "Cleaning up old/dangling docker images..." -ForegroundColor Gray
docker image prune -f *> $null

# 5. Configure Windows startup autostart shortcut
Write-Host "`n[5/6] Ensuring Windows Startup autostart shortcut is active..." -ForegroundColor Cyan
try {
    $StartupDir = [Environment]::GetFolderPath("Startup")
    $ShortcutPath = Join-Path $StartupDir "Nizam Bags POS.lnk"
    $BatPath = Join-Path $ProjectRoot "scripts\start-nizam-pos-windows.bat"

    if (Test-Path $BatPath) {
        $Shell = New-Object -ComObject WScript.Shell
        $Shortcut = $Shell.CreateShortcut($ShortcutPath)
        $Shortcut.TargetPath = $BatPath
        $Shortcut.WorkingDirectory = $ProjectRoot
        $Shortcut.WindowStyle = 7 # Minimized
        $Shortcut.Description = "Start Nizam Bags POS automatically on Windows login"
        $Shortcut.Save()
        Write-Host "Startup shortcut verified at: $ShortcutPath" -ForegroundColor Green
    } else {
        Write-Host "Warning: $BatPath not found. Startup shortcut skipped." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Warning: Could not configure startup shortcut automatically: $_" -ForegroundColor Yellow
}

# 6. Wait for service health and launch Chrome
Write-Host "`n[6/6] Waiting for POS application to be ready..." -ForegroundColor Cyan
$siteReady = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost" -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
            $siteReady = $true
            break
        }
    } catch {}
    Start-Sleep -Seconds 2
}

if ($siteReady) {
    Write-Host "POS application is running at http://localhost!" -ForegroundColor Green
} else {
    Write-Host "Application is still initializing. You can open http://localhost shortly." -ForegroundColor Yellow
}

# Launch Google Chrome in app mode
$chromeCandidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
$chrome = $chromeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($chrome) {
    Write-Host "Launching Google Chrome in POS app mode..." -ForegroundColor Cyan
    Start-Process -FilePath $chrome -ArgumentList "--app=http://localhost"
} else {
    Write-Host "Google Chrome not found in standard paths. Please open http://localhost in your browser." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "   UPDATE COMPLETED SUCCESSFULLY! POS IS READY FOR USE.   " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
