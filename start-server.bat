@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
echo ========================================
echo Photography Tools Server
echo ========================================
echo.

if not exist package.json (
    echo [ERROR] package.json not found!
    pause
    exit /b 1
)

if not exist server.js (
    echo [ERROR] server.js not found!
    pause
    exit /b 1
)

if not exist node_modules (
    echo [INFO] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
    echo [SUCCESS] Dependencies installed!
    echo.
    goto :start
)

set MISSING=0
if not exist node_modules\axios set MISSING=1
if not exist node_modules\bcryptjs set MISSING=1

if !MISSING!==1 (
    echo [INFO] Installing missing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
    echo [SUCCESS] Dependencies installed!
    echo.
)

:start
echo [INFO] Starting server...
echo [INFO] Server: http://localhost:3000
echo [INFO] Press Ctrl+C to stop
echo ========================================
echo.

node server.js

if errorlevel 1 (
    echo.
    echo [ERROR] Server failed to start!
    pause
    exit /b 1
)

pause
