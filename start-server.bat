@echo off
cd /d "%~dp0"
echo ========================================
echo Photography Tools Server
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed.
    echo Download it from https://nodejs.org
    pause
    exit /b 1
)

if not exist "package.json" (
    echo [ERROR] package.json not found.
    pause
    exit /b 1
)

if not exist "server.js" (
    echo [ERROR] server.js not found.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

REM If port 3000 is already in use, stop the previous process
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":3000 .*LISTENING"') do (
    echo [INFO] Port 3000 is busy. Stopping process %%a ...
    taskkill /F /PID %%a >nul 2>&1
)

echo [INFO] Server: http://localhost:3000
echo [INFO] Press Ctrl+C to stop
echo ========================================
echo.

start "" "http://localhost:3000"
node server.js

if errorlevel 1 (
    echo.
    echo [ERROR] Server failed to start.
    echo If you see EADDRINUSE, open Task Manager and end the node process.
    pause
    exit /b 1
)

pause
