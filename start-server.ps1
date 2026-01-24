# Photography Tools Server - PowerShell Script
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Photography Tools Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check package.json
if (-not (Test-Path "package.json")) {
    Write-Host "[ERROR] package.json not found!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check server.js
if (-not (Test-Path "server.js")) {
    Write-Host "[ERROR] server.js not found!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check and install dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install dependencies!" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "[SUCCESS] Dependencies installed!" -ForegroundColor Green
    Write-Host ""
} else {
    $missing = $false
    
    if (-not (Test-Path "node_modules\axios")) {
        Write-Host "[WARN] axios is not installed" -ForegroundColor Yellow
        $missing = $true
    } else {
        Write-Host "[OK] axios is installed" -ForegroundColor Green
    }
    
    if (-not (Test-Path "node_modules\bcryptjs")) {
        Write-Host "[WARN] bcryptjs is not installed" -ForegroundColor Yellow
        $missing = $true
    } else {
        Write-Host "[OK] bcryptjs is installed" -ForegroundColor Green
    }
    
    if ($missing) {
        Write-Host ""
        Write-Host "[INFO] Installing missing dependencies..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ERROR] Failed to install dependencies!" -ForegroundColor Red
            Read-Host "Press Enter to exit"
            exit 1
        }
        Write-Host "[SUCCESS] Dependencies installed!" -ForegroundColor Green
        Write-Host ""
    }
}

Write-Host "[INFO] Starting server..." -ForegroundColor Cyan
Write-Host "[INFO] Server: http://localhost:3000" -ForegroundColor Cyan
Write-Host "[INFO] Press Ctrl+C to stop" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

node server.js

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] Server failed to start!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Read-Host "Press Enter to exit"
