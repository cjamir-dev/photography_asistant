@echo off
chcp 65001 >nul
echo ========================================
echo Photography Tools Server
echo ========================================
echo.

REM بررسی وجود node_modules
if not exist "node_modules" (
    echo [INFO] node_modules not found. Installing dependencies...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] Failed to install dependencies!
        echo Please check your internet connection and try again.
        pause
        exit /b 1
    )
    echo.
    echo [SUCCESS] Dependencies installed successfully!
    echo.
) else (
    echo [INFO] Dependencies already installed.
    echo.
)

REM بررسی وجود package.json
if not exist "package.json" (
    echo [ERROR] package.json not found!
    pause
    exit /b 1
)

REM بررسی وجود server.js
if not exist "server.js" (
    echo [ERROR] server.js not found!
    pause
    exit /b 1
)

echo [INFO] Starting server...
echo [INFO] Server will run on http://localhost:3000
echo [INFO] Press Ctrl+C to stop the server
echo.
echo ========================================
echo.

node server.js

if errorlevel 1 (
    echo.
    echo [ERROR] Server failed to start!
    echo Please check the error messages above.
    pause
    exit /b 1
)

pause

