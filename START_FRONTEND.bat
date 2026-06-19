@echo off
title HRMS Frontend Server
color 0B
echo ================================================
echo     HRMS Enterprise - Frontend Server Startup
echo ================================================
echo.

cd /d "%~dp0frontend"

echo [1/2] Installing / verifying Node.js dependencies...
npm install --silent
if errorlevel 1 (
    echo ERROR: npm install failed. Is Node.js installed?
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo.
echo ================================================
echo  Frontend is starting on http://localhost:3000
echo  Press Ctrl+C to stop the server
echo ================================================
echo.

npm run dev
pause
