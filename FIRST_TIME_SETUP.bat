@echo off
title HRMS - First Time Setup
color 0E
echo ============================================================
echo     HRMS Enterprise - First Time Setup (New Machine)
echo ============================================================
echo.
echo This script will:
echo   1. Install Python dependencies
echo   2. Run database migrations
echo   3. Load sample data (optional)
echo   4. Create a superuser admin account
echo   5. Create employee profiles for admin accounts
echo.
echo ============================================================
echo.

cd /d "%~dp0backend"

echo [1/5] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found! Install Python 3.10+ from https://www.python.org
    pause
    exit /b 1
)
python --version
echo   OK

echo.
echo [2/5] Installing Python packages...
pip install -r ..\requirements.txt
if errorlevel 1 (
    echo ERROR: Package installation failed!
    pause
    exit /b 1
)
echo   OK

echo.
echo [3/5] Running database migrations...
python manage.py migrate --no-input
if errorlevel 1 (
    echo ERROR: Migration failed!
    pause
    exit /b 1
)
echo   OK

echo.
echo [4/5] Creating superuser admin account...
echo.
echo You will be asked to enter:
echo   - Username (e.g. admin)
echo   - Email address
echo   - Password
echo.
python manage.py createsuperuser
echo   OK

echo.
echo [5/5] Creating employee profile for the admin account...
python manage.py create_admin_profiles
echo   OK

echo.
echo ============================================================
echo   SETUP COMPLETE!
echo.
echo   To start the system:
echo     - Double-click START_BACKEND.bat  (keep this open)
echo     - Double-click START_FRONTEND.bat (keep this open)
echo     - Open browser: http://localhost:3000
echo.
echo   Login with the credentials you just created above.
echo ============================================================
echo.
pause
