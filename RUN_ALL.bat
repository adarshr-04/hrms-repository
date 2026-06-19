@echo off
title HRMS Enterprise - Startup Launcher
color 0D
echo ============================================================
echo           HRMS Enterprise - Single Click Launcher
echo ============================================================
echo.
echo Launching services in separate windows...
echo.

:: Launch backend in a new cmd window
echo Starting Backend Server (Django on port 8000)...
start "HRMS Backend Server" cmd /c "cd /d %~dp0 && START_BACKEND.bat"

:: Wait 2 seconds before starting frontend
timeout /t 2 /nobreak >nul

:: Launch frontend in a new cmd window
echo Starting Frontend Server (Vite on port 3000)...
start "HRMS Frontend Server" cmd /c "cd /d %~dp0 && START_FRONTEND.bat"

echo.
echo ============================================================
echo  Success! Both servers are launching.
echo.
echo  - Backend: http://localhost:8000
echo  - Frontend: http://localhost:3000
echo.
echo  You can close this launcher window now.
echo ============================================================
echo.
pause
