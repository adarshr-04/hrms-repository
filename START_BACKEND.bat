@echo off
title HRMS Backend Server
color 0A
echo ================================================
echo     HRMS Enterprise - Backend Server Startup
echo ================================================
echo.

cd /d "%~dp0backend"

echo [1/4] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH.
    echo Please install Python 3.10 or above from https://www.python.org
    pause
    exit /b 1
)
python --version

echo.
echo [2/4] Installing / verifying Python dependencies...
pip install -r ..\requirements.txt --quiet
if errorlevel 1 (
    echo WARNING: Some packages may not have installed correctly.
)

echo.
echo [3/4] Running database migrations...
python manage.py migrate --no-input
if errorlevel 1 (
    echo ERROR: Migration failed. Check your database settings.
    pause
    exit /b 1
)

echo.
echo [4/4] Creating admin profiles for any superusers without one...
python manage.py create_admin_profiles 2>nul
if errorlevel 1 (
    echo NOTE: create_admin_profiles command not found or failed. Continuing...
)

echo.
echo ================================================
echo  Backend is starting on http://localhost:8000
echo  Press Ctrl+C to stop the server
echo ================================================
echo.

python manage.py runserver 0.0.0.0:8000
pause
